import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth/permissions';
import { createAdminClient } from '@/lib/supabase/server';
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

const COS_HOST = getHost(process.env.NEXT_PUBLIC_COS_DOMAIN);

const getKeyFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.pathname.replace(/^\/+/, '');
  } catch {
    return '';
  }
};

const isCosUrl = (url: string) => {
  const host = getHost(url);
  return Boolean(host && COS_HOST && host === COS_HOST);
};

const addKeyIfCos = (set: Set<string>, url: string | null, label: string) => {
  if (!url) return;
  if (!isCosUrl(url)) return;
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
      .select('id, video_url, thumbnail_url, video_url_cos, thumbnail_url_cos, primary_storage')
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

    const cosKeys = new Set<string>();

    addKeyIfCos(cosKeys, video.video_url_cos, 'COS 视频');
    addKeyIfCos(cosKeys, video.thumbnail_url_cos, 'COS 缩略图');
    addKeyIfCos(cosKeys, video.video_url ?? null, '主视频');
    addKeyIfCos(cosKeys, video.thumbnail_url ?? null, '主缩略图');

    (recordings || []).forEach((row) => {
      if (!row?.audio_url) return;
      addKeyIfCos(cosKeys, row.audio_url, '录音');
    });

    const deleteErrors: string[] = [];

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
        cos: cosKeys.size,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || '删除失败' }, { status: 500 });
  }
}
