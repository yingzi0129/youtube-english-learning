import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/permissions';
import { createAdminClient } from '@/lib/supabase/server';
import { deleteFromR2 } from '@/lib/r2';
import { deleteFromCos } from '@/lib/cos';

export const runtime = 'nodejs';

const getHost = (value?: string | null) => {
  if (!value) return '';
  try {
    return new URL(value).host;
  } catch {
    return '';
  }
};

const R2_HOST = getHost(process.env.NEXT_PUBLIC_R2_DOMAIN);
const COS_HOST = getHost(process.env.NEXT_PUBLIC_COS_DOMAIN);

const getKeyFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, '');
  } catch {
    return '';
  }
};

const detectStorage = (url: string): 'r2' | 'cos' | null => {
  const host = getHost(url);
  if (host && COS_HOST && host === COS_HOST) return 'cos';
  if (host && R2_HOST && host === R2_HOST) return 'r2';
  return null;
};

const addKey = (set: Set<string>, url: string, label: string) => {
  const key = getKeyFromUrl(url);
  if (!key) {
    throw new Error(`无法解析${label}路径`);
  }
  set.add(key);
};

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { videoId } = await request.json().catch(() => ({}));
    if (!videoId) {
      return NextResponse.json({ error: '缺少视频ID' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: video, error } = await adminClient
      .from('videos')
      .select(
        'id, video_url, thumbnail_url, video_url_r2, video_url_cos, thumbnail_url_r2, thumbnail_url_cos, primary_storage'
      )
      .eq('id', videoId)
      .single();

    if (error || !video) {
      return NextResponse.json({ error: error?.message || '视频不存在' }, { status: 404 });
    }

    const { data: recordings, error: audioError } = await adminClient
      .from('speaking_practice')
      .select('audio_url')
      .eq('video_id', videoId);

    if (audioError) {
      return NextResponse.json({ error: audioError.message }, { status: 500 });
    }

    const r2Keys = new Set<string>();
    const cosKeys = new Set<string>();

    if (video.video_url_r2) addKey(r2Keys, video.video_url_r2, 'R2 视频');
    if (video.thumbnail_url_r2) addKey(r2Keys, video.thumbnail_url_r2, 'R2 缩略图');
    if (video.video_url_cos) addKey(cosKeys, video.video_url_cos, 'COS 视频');
    if (video.thumbnail_url_cos) addKey(cosKeys, video.thumbnail_url_cos, 'COS 缩略图');

    const primaryStorage = video.primary_storage as 'r2' | 'cos' | null;
    const addPrimary = (url: string | null, label: string) => {
      if (!url) return;
      if (primaryStorage === 'r2') {
        addKey(r2Keys, url, label);
        return;
      }
      if (primaryStorage === 'cos') {
        addKey(cosKeys, url, label);
        return;
      }

      const guess = detectStorage(url);
      if (guess === 'r2') {
        addKey(r2Keys, url, label);
        return;
      }
      if (guess === 'cos') {
        addKey(cosKeys, url, label);
        return;
      }

      throw new Error(`无法判断${label}的存储来源`);
    };

    addPrimary(video.video_url ?? null, '主视频');
    addPrimary(video.thumbnail_url ?? null, '主缩略图');

    (recordings || []).forEach((row) => {
      if (!row?.audio_url) return;
      addKey(r2Keys, row.audio_url, '录音');
    });

    const deleteErrors: string[] = [];

    for (const key of r2Keys) {
      try {
        await deleteFromR2(key);
      } catch (err: any) {
        deleteErrors.push(`R2 删除失败: ${key} (${err?.message || '未知错误'})`);
      }
    }

    for (const key of cosKeys) {
      try {
        await deleteFromCos(key);
      } catch (err: any) {
        deleteErrors.push(`COS 删除失败: ${key} (${err?.message || '未知错误'})`);
      }
    }

    if (deleteErrors.length > 0) {
      return NextResponse.json(
        { error: '对象存储删除失败', details: deleteErrors },
        { status: 500 }
      );
    }

    const { error: deleteError } = await adminClient
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: {
        r2: r2Keys.size,
        cos: cosKeys.size,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '删除失败' }, { status: 500 });
  }
}
