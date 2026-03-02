import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { isAdmin } from '@/lib/auth/permissions';
import { createAdminClient } from '@/lib/supabase/server';
import { uploadToR2 } from '@/lib/r2';
import { uploadToCos } from '@/lib/cos';

export const runtime = 'nodejs';

type StorageProvider = 'r2' | 'cos';

const MAX_RETRIES = Math.max(0, Number(process.env.VIDEO_SYNC_MAX_RETRIES ?? '2') || 0);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sanitizeExt = (value: string) => value.replace(/[^a-z0-9]/gi, '').toLowerCase();

const getFileExtension = (file: File) => {
  const name = file.name || '';
  const dot = name.lastIndexOf('.');
  const rawExt = dot >= 0 ? name.slice(dot + 1) : '';
  const fromName = sanitizeExt(rawExt);
  if (fromName) return fromName;

  const type = file.type || '';
  const fromType = sanitizeExt(type.split('/')[1] || '');
  return fromType || 'bin';
};

const buildKey = (prefix: string, ext: string) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${prefix}/${yyyy}/${mm}/${dd}/${randomUUID()}.${ext}`;
};

const parseList = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const uploadWithRetry = async (fn: () => Promise<string>, retries: number) => {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries) throw error;
      attempt += 1;
      await sleep(500 * attempt);
    }
  }
};

const uploadToStorage = (provider: StorageProvider, key: string, buffer: Buffer, contentType: string) => {
  return provider === 'r2' ? uploadToR2(key, buffer, contentType) : uploadToCos(key, buffer, contentType);
};

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const thumbnailFile = formData.get('thumbnail') as File | null;
    const primaryStorageRaw = String(formData.get('primaryStorage') || '').toLowerCase();
    const primaryStorage = (primaryStorageRaw === 'cos' ? 'cos' : 'r2') as StorageProvider;

    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const creatorName = String(formData.get('creator_name') || '').trim();
    const difficulty = String(formData.get('difficulty') || '').trim();
    const durationMinutes = Number(formData.get('duration_minutes') || 0);
    const tags = parseList(formData.get('tags'));
    const topics = parseList(formData.get('topics'));

    if (
      !videoFile ||
      !title ||
      !creatorName ||
      !difficulty ||
      !Number.isFinite(durationMinutes) ||
      durationMinutes < 0
    ) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const videoExt = getFileExtension(videoFile);
    const videoKey = buildKey('videos', videoExt);
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    const videoContentType = videoFile.type || 'application/octet-stream';

    const thumbnailBuffer = thumbnailFile ? Buffer.from(await thumbnailFile.arrayBuffer()) : null;
    const thumbnailContentType = thumbnailFile?.type || 'image/jpeg';
    const thumbnailKey = thumbnailFile ? buildKey('thumbnails', getFileExtension(thumbnailFile)) : null;

    const primaryVideoUrl = await uploadToStorage(primaryStorage, videoKey, videoBuffer, videoContentType);
    const primaryThumbnailUrl = thumbnailBuffer && thumbnailKey
      ? await uploadToStorage(primaryStorage, thumbnailKey, thumbnailBuffer, thumbnailContentType)
      : null;

    const adminClient = createAdminClient();
    const { data: inserted, error: insertError } = await adminClient
      .from('videos')
      .insert({
        title,
        description,
        creator_name: creatorName,
        difficulty,
        duration_minutes: durationMinutes,
        tags,
        topics,
        video_url: primaryVideoUrl,
        thumbnail_url: primaryThumbnailUrl,
        video_url_r2: primaryStorage === 'r2' ? primaryVideoUrl : null,
        video_url_cos: primaryStorage === 'cos' ? primaryVideoUrl : null,
        thumbnail_url_r2: primaryStorage === 'r2' ? primaryThumbnailUrl : null,
        thumbnail_url_cos: primaryStorage === 'cos' ? primaryThumbnailUrl : null,
        primary_storage: primaryStorage,
        storage_sync_status: 'pending',
        storage_sync_error: null,
        storage_sync_updated_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        is_deleted: false,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      return NextResponse.json({ error: insertError?.message || '保存失败' }, { status: 500 });
    }

    const videoId = inserted.id;
    const secondaryStorage: StorageProvider = primaryStorage === 'r2' ? 'cos' : 'r2';

    const uploadSecondary = async () => {
      try {
        const updates: Record<string, any> = {
          storage_sync_status: 'synced',
          storage_sync_error: null,
          storage_sync_updated_at: new Date().toISOString(),
        };

        const secondaryVideoUrl = await uploadWithRetry(
          () => uploadToStorage(secondaryStorage, videoKey, videoBuffer, videoContentType),
          MAX_RETRIES
        );

        if (secondaryStorage === 'r2') {
          updates.video_url_r2 = secondaryVideoUrl;
        } else {
          updates.video_url_cos = secondaryVideoUrl;
        }

        if (thumbnailBuffer && thumbnailKey) {
          const secondaryThumbnailUrl = await uploadWithRetry(
            () => uploadToStorage(secondaryStorage, thumbnailKey, thumbnailBuffer, thumbnailContentType),
            MAX_RETRIES
          );
          if (secondaryStorage === 'r2') {
            updates.thumbnail_url_r2 = secondaryThumbnailUrl;
          } else {
            updates.thumbnail_url_cos = secondaryThumbnailUrl;
          }
        }

        await adminClient.from('videos').update(updates).eq('id', videoId);
      } catch (error: any) {
        await adminClient
          .from('videos')
          .update({
            storage_sync_status: 'failed',
            storage_sync_error: error?.message || 'secondary upload failed',
            storage_sync_updated_at: new Date().toISOString(),
          })
          .eq('id', videoId);
      }
    };

    void uploadSecondary();

    return NextResponse.json({
      success: true,
      videoId,
      primaryStorage,
      primaryVideoUrl,
      primaryThumbnailUrl,
      secondaryStatus: 'pending',
    });
  } catch (error: any) {
    console.error('视频上传失败:', error);
    return NextResponse.json({ error: error?.message || '上传失败' }, { status: 500 });
  }
}

