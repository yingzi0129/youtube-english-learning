import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import VideoWithSubtitles from './components/VideoWithSubtitles';
import VideoInfo from './components/VideoInfo';

export default async function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 解包 params (Next.js 15+ 要求)
  const { id } = await params;

  // 从数据库获取视频数据
  const supabase = await createClient();
  const { data: videoData, error } = await supabase
    .from('videos')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();

  // 如果视频不存在，显示404页面
  if (error || !videoData) {
    notFound();
  }

  // 格式化视频数据
  // 确保视频 URL 使用 HTTPS 协议，避免混合内容错误
  let videoUrl = videoData.video_url;
  if (videoUrl && videoUrl.startsWith('http://')) {
    videoUrl = videoUrl.replace('http://', 'https://');
  }

  const video = {
    id: videoData.id,
    title: videoData.title,
    creator: videoData.creator_name,
    difficulty: videoData.difficulty,
    duration: `${videoData.duration_minutes}分钟`,
    description: videoData.description || '暂无描述',
    videoUrl: videoUrl,
    tags: videoData.tags || [],
    publishedAt: new Date(videoData.published_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }),
  };

  // 从数据库获取字幕数据
  const { data: subtitlesData } = await supabase
    .from('subtitles')
    .select('*')
    .eq('video_id', id)
    .order('sequence', { ascending: true });

  // 格式化字幕数据
  const subtitles = (subtitlesData || []).map(sub => ({
    id: sub.sequence,
    startTime: sub.start_time,
    endTime: sub.end_time,
    text: sub.text_en || '',
    translation: sub.text_zh || '',
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* 顶部导航栏 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">返回视频库</span>
            </a>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 视频播放器和字幕面板 */}
        <VideoWithSubtitles videoUrl={video.videoUrl} subtitles={subtitles} />

        {/* 视频介绍 */}
        <div className="mt-6">
          <VideoInfo video={video} />
        </div>
      </div>
    </div>
  );
}
