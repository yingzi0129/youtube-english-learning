import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTrialUser } from '@/lib/auth/trial';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    const isTrial = isTrialUser(user);

    // 从数据库获取所有未删除的视频，按发布日期降序排列
    let query = supabase
      .from('videos')
      .select('*')
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

    // 格式化视频数据，确保与前端期望的格式一致
    const formattedVideos = videos.map((video) => {
      // 确保视频 URL 使用 HTTPS 协议，避免混合内容错误
      let videoUrl = video.video_url;
      if (videoUrl && videoUrl.startsWith('http://')) {
        videoUrl = videoUrl.replace('http://', 'https://');
      }

      // 确保缩略图 URL 也使用 HTTPS
      let thumbnailUrl = video.thumbnail_url;
      if (thumbnailUrl && thumbnailUrl.startsWith('http://')) {
        thumbnailUrl = thumbnailUrl.replace('http://', 'https://');
      }

      return {
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnail: thumbnailUrl,
        duration: `${video.duration_minutes}分钟`,
        creator: video.creator_name,
        tags: video.tags || [],
        difficulty: video.difficulty,
        date: new Date(video.published_at).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        }).replace(/\//g, '/'),
        videoUrl: videoUrl,
      };
    });

    const response = NextResponse.json({
      success: true,
      videos: formattedVideos,
    });
    response.headers.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
    response.headers.set('Vary', 'Cookie');
    return response;
  } catch (error) {
    console.error('服务器错误:', error);
    const response = NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
