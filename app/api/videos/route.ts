import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 从数据库获取所有未删除的视频，按发布日期降序排列
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .eq('is_deleted', false)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('获取视频数据错误:', error);
      return NextResponse.json(
        { error: '获取视频数据失败' },
        { status: 500 }
      );
    }

    // 格式化视频数据，确保与前端期望的格式一致
    const formattedVideos = videos.map((video) => ({
      id: video.id,
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnail_url,
      duration: `${video.duration_minutes}分钟`,
      creator: video.creator_name,
      tags: video.tags || [],
      difficulty: video.difficulty,
      date: new Date(video.published_at).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '1-digit',
        day: '1-digit',
      }).replace(/\//g, '/'),
      videoUrl: video.video_url,
    }));

    return NextResponse.json({
      success: true,
      videos: formattedVideos,
    });
  } catch (error) {
    console.error('服务器错误:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
