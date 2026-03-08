import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTrialUser } from '@/lib/auth/trial';
import { selectStorageUrl } from '@/lib/storage-urls';

type VideoRow = {
  id: string;
  title: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  thumbnail_url_cos?: string | null;
  duration_minutes?: number | null;
  creator_name?: string | null;
  tags?: string[] | null;
  difficulty?: string | null;
  published_at?: string | null;
  video_url?: string | null;
  video_url_cos?: string | null;
};

const toVideoRows = (data: unknown): VideoRow[] => {
  if (!Array.isArray(data)) return [];
  return data as VideoRow[];
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    const isTrial = isTrialUser(user);
    const url = request.nextUrl;
    const fields = (url.searchParams.get('fields') || 'full').toLowerCase();
    const isMini = fields === 'mini';
    const isCard = fields === 'card';

    // 从数据库获取所有未删除的视频，按发布时间倒序
    const baseSelect = (() => {
      if (isMini) return 'id, title';
      if (isCard) {
        return [
          'id',
          'title',
          'description',
          'thumbnail_url',
          'thumbnail_url_cos',
          'duration_minutes',
          'creator_name',
          'tags',
          'difficulty',
          'published_at',
        ].join(', ');
      }
      return [
        'id',
        'title',
        'description',
        'thumbnail_url',
        'thumbnail_url_cos',
        'duration_minutes',
        'creator_name',
        'tags',
        'difficulty',
        'published_at',
        'video_url',
        'video_url_cos',
      ].join(', ');
    })();

    let query = supabase
      .from('videos')
      .select(baseSelect)
      .eq('is_deleted', false);

    if (isTrial) {
      query = query.eq('is_trial', true);
    }

    const { data: videos, error } = await query
      .order('published_at', { ascending: false });

    if (error) {
      console.error('获取视频数据错误:', error);
      const response = NextResponse.json(
        { error: '获取视频数据失败' },
        { status: 500 }
      );
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    const rows = toVideoRows(videos);

    if (isMini) {
      const response = NextResponse.json({
        success: true,
        videos: rows.map((video) => ({
          id: video.id,
          title: video.title || '',
        })),
      });
      response.headers.set('Cache-Control', 'private, max-age=600, stale-while-revalidate=1800');
      response.headers.set('Vary', 'Cookie');
      return response;
    }
    // 格式化视频数据，确保返回格式一致
    const formattedVideos = rows.map((video) => {
      const thumbnailUrl = selectStorageUrl({
        primaryUrl: video.thumbnail_url || undefined,
        cosUrl: video.thumbnail_url_cos || undefined,
      });

      const base = {
        id: video.id,
        title: video.title || '',
        description: video.description || '',
        thumbnail: thumbnailUrl,
        duration: `${video.duration_minutes || 0}分钟`,
        duration_minutes: video.duration_minutes || 0,
        creator: video.creator_name || '',
        tags: video.tags || [],
        difficulty: video.difficulty || '',
        date: new Date(video.published_at || Date.now()).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        }).replace(/\//g, '/'),
      };

      if (isCard) {
        return base;
      }

      const videoUrl = selectStorageUrl({
        primaryUrl: video.video_url || undefined,
        cosUrl: video.video_url_cos || undefined,
      });

      return {
        ...base,
        videoUrl,
      };
    });

    const response = NextResponse.json({
      success: true,
      videos: formattedVideos,
    });

    if (isCard) {
      response.headers.set('Cache-Control', 'private, max-age=600, stale-while-revalidate=1800');
    } else {
      response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    }
    response.headers.set('Vary', 'Cookie');
    return response;
  } catch (error) {
    console.error('服务端错误:', error);
    const response = NextResponse.json(
      { error: '服务端错误，请稍后重试' },
      { status: 500 }
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
