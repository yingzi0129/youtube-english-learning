import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/permissions';
import { createAdminClient } from '@/lib/supabase/server';
import { uploadToCos } from '@/lib/cos';

export const runtime = 'nodejs';

const FETCH_TIMEOUT_MS = Number(process.env.COS_BACKFILL_FETCH_TIMEOUT_MS ?? '15000');
const UPLOAD_TIMEOUT_MS = Number(process.env.COS_BACKFILL_UPLOAD_TIMEOUT_MS ?? '20000');
const CACHE_CONTROL = 'public, max-age=31536000';

const getKeyFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, '');
  } catch {
    return '';
  }
};

const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  if (!ms || ms <= 0) return promise;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  try {
    return (await Promise.race([promise, timeoutPromise])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const fetchToBuffer = async (url: string) => {
  const controller = new AbortController();
  const timeout = FETCH_TIMEOUT_MS > 0 ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null;
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length') || 'unknown';
    const arrayBuffer = await response.arrayBuffer();
    console.log('[backfill-cos] 下载完成', {
      url,
      contentType,
      contentLength,
      bytes: arrayBuffer.byteLength,
      ms: Date.now() - startedAt,
    });
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType,
    };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('下载超时');
    }
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
};

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { videoId } = await request.json().catch(() => ({}));
    const adminClient = createAdminClient();
    console.log('[backfill-cos] 请求开始', { videoId: videoId || null });

    let query = adminClient
      .from('videos')
      .select('id, video_url, video_url_r2, video_url_cos, thumbnail_url, thumbnail_url_r2, thumbnail_url_cos');

    if (videoId) {
      query = query.eq('id', videoId);
    }

    const { data: videos, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const candidates = (videos || []).filter((video) => {
      const needsVideo = !video.video_url_cos && (video.video_url_r2 || video.video_url);
      const needsThumb = !video.thumbnail_url_cos && (video.thumbnail_url_r2 || video.thumbnail_url);
      return needsVideo || needsThumb;
    });

    console.log('[backfill-cos] 待处理数量', { total: candidates.length });

    let success = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const video of candidates) {
      try {
        console.log('[backfill-cos] 处理开始', { id: video.id });
        const updates: Record<string, any> = {
          storage_sync_updated_at: new Date().toISOString(),
        };

        const sourceVideoUrl = video.video_url_r2 || video.video_url;
        if (sourceVideoUrl && !video.video_url_cos) {
          const key = getKeyFromUrl(sourceVideoUrl);
          if (!key) {
            throw new Error('无法解析视频路径');
          }
          console.log('[backfill-cos] 下载视频', { id: video.id, key });
          const { buffer, contentType } = await fetchToBuffer(sourceVideoUrl);
          console.log('[backfill-cos] 上传视频到 COS', { id: video.id, key });
          const cosUrl = await withTimeout(
            uploadToCos(key, buffer, contentType, { cacheControl: CACHE_CONTROL }),
            UPLOAD_TIMEOUT_MS,
            '上传超时'
          );
          updates.video_url_cos = cosUrl;
          console.log('[backfill-cos] 视频上传完成', { id: video.id, key });
        }

        const sourceThumbUrl = video.thumbnail_url_r2 || video.thumbnail_url;
        if (sourceThumbUrl && !video.thumbnail_url_cos) {
          const key = getKeyFromUrl(sourceThumbUrl);
          if (!key) {
            throw new Error('无法解析缩略图路径');
          }
          console.log('[backfill-cos] 下载缩略图', { id: video.id, key });
          const { buffer, contentType } = await fetchToBuffer(sourceThumbUrl);
          console.log('[backfill-cos] 上传缩略图到 COS', { id: video.id, key });
          const cosUrl = await withTimeout(
            uploadToCos(key, buffer, contentType, { cacheControl: CACHE_CONTROL }),
            UPLOAD_TIMEOUT_MS,
            '上传超时'
          );
          updates.thumbnail_url_cos = cosUrl;
          console.log('[backfill-cos] 缩略图上传完成', { id: video.id, key });
        }

        const hasVideo = Boolean(updates.video_url_cos || video.video_url_cos);
        const hasThumbSource = Boolean(sourceThumbUrl);
        const hasThumb = hasThumbSource ? Boolean(updates.thumbnail_url_cos || video.thumbnail_url_cos) : true;

        if (hasVideo && hasThumb) {
          updates.storage_sync_status = 'synced';
          updates.storage_sync_error = null;
        } else {
          updates.storage_sync_status = 'failed';
          updates.storage_sync_error = '部分资源补齐失败';
        }

        const { error: updateError } = await adminClient
          .from('videos')
          .update(updates)
          .eq('id', video.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        success += 1;
        console.log('[backfill-cos] 处理成功', { id: video.id });
      } catch (err: any) {
        failed += 1;
        console.error('[backfill-cos] 处理失败', { id: video.id, error: err?.message || err });
        errors.push({ id: video.id, error: err?.message || '补齐失败' });
        await adminClient
          .from('videos')
          .update({
            storage_sync_status: 'failed',
            storage_sync_error: err?.message || '补齐失败',
            storage_sync_updated_at: new Date().toISOString(),
          })
          .eq('id', video.id);
      }
    }

    console.log('[backfill-cos] 完成', {
      processed: candidates.length,
      successCount: success,
      failedCount: failed,
      ms: Date.now() - startedAt,
    });

    return NextResponse.json({
      success: true,
      processed: candidates.length,
      successCount: success,
      failedCount: failed,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '补齐失败' }, { status: 500 });
  }
}
