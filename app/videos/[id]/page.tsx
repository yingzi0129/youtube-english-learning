import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isTrialUser } from '@/lib/auth/trial';
import { isMainlandChina } from '@/lib/region';
import { selectStorageUrl } from '@/lib/storage-urls';
import VideoWithSubtitles from './components/VideoWithSubtitles';
import VideoInfo from './components/VideoInfo';

export default async function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 解包 params (Next.js 15+ 要求)
  const { id } = await params;

  // 从数据库获取视频数据
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isTrial = isTrialUser(user);

  let videoQuery = supabase
    .from('videos')
    .select('id, title, creator_name, difficulty, duration_minutes, description, video_url, video_url_cos, video_url_r2, tags, published_at, is_trial')
    .eq('id', id)
    .eq('is_deleted', false);

  if (isTrial) {
    videoQuery = videoQuery.eq('is_trial', true);
  }

  const { data: videoData, error } = await videoQuery.single();

  // 如果视频不存在，显示404页面
  if (error || !videoData) {
    notFound();
  }

  // 格式化视频数据
  // 确保视频 URL 使用 HTTPS 协议，避免混合内容错误
  const prefer = isMainlandChina(await headers()) ? 'cos' : 'r2';
  const videoUrl = selectStorageUrl({
    prefer,
    primaryUrl: videoData.video_url,
    cosUrl: videoData.video_url_cos,
    r2Url: videoData.video_url_r2,
  }) || videoData.video_url;

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


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* 顶部导航栏 */}
      <header
        data-video-page-header="true"
        className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm"
      >
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-2 text-gray-700 hover:text-purple-600 transition-colors"
              aria-label="返回视频库"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline font-medium">返回视频库</span>
            </a>
            <div className="flex-1 min-w-0 sm:hidden">
              <h1 className="text-sm font-semibold text-gray-900 truncate">{video.title}</h1>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 视频播放器和字幕面板 */}
        <VideoWithSubtitles videoUrl={video.videoUrl} initialSubtitles={[]} />

        {/* 视频介绍：仅桌面端显示（移动端不展示此卡片） */}
        <div className="hidden lg:block mt-6">
          <VideoInfo video={{ ...video, id: videoData.id }} />
        </div>
      </div>
    </div>
  );
}
