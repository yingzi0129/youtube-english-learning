import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { isAdmin } from '@/lib/auth/permissions';
import { createAdminClient } from '@/lib/supabase/server';
import { uploadToCos } from '@/lib/cos';

export const runtime = 'nodejs';

type StorageProvider = 'cos';

const CACHE_CONTROL = 'public, max-age=31536000';

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


const uploadToStorage = (
  key: string,
  buffer: Buffer,
  contentType: string,
  cacheControl?: string
) => uploadToCos(key, buffer, contentType, { cacheControl });

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const thumbnailFile = formData.get('thumbnail') as File | null;
    const primaryStorage: StorageProvider = 'cos';

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

    const primaryVideoUrl = await uploadToStorage(
      primaryStorage,
      videoKey,
      videoBuffer,
      videoContentType,
      CACHE_CONTROL
    );
    const primaryThumbnailUrl = thumbnailBuffer && thumbnailKey
      ? await uploadToStorage(
          primaryStorage,
          thumbnailKey,
          thumbnailBuffer,
          thumbnailContentType,
          CACHE_CONTROL
        )
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
        video_url_cos: primaryVideoUrl,
        thumbnail_url_cos: primaryThumbnailUrl,
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
    await adminClient
      .from('videos')
      .update({
        storage_sync_status: 'synced',
        storage_sync_error: null,
        storage_sync_updated_at: new Date().toISOString(),
      })
      .eq('id', videoId);

    return NextResponse.json({
      success: true,
      videoId,
      primaryStorage,
      primaryVideoUrl,
      primaryThumbnailUrl,
      secondaryStatus: 'synced',
    });
  } catch (error: any) {
    console.error('视频上传失败:', error);
    return NextResponse.json({ error: error?.message || '上传失败' }, { status: 500 });
  }
}

