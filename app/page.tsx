import Header from './components/Header';
import LearningStats from './components/LearningStats';
import Calendar from './components/Calendar';
import LearningNotifications from './components/LearningNotifications';
import VideoListWithFilters from './components/VideoListWithFilters';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/permissions';

export default async function Home() {
  // 获取当前用户角色
  const userRole = await getUserRole();
  const isAdmin = userRole === 'admin';

  // 从数据库获取视频数据
  const supabase = await createClient();
  const { data: videosData, error } = await supabase
    .from('videos')
    .select('*')
    .eq('is_deleted', false)
    .order('published_at', { ascending: false });

  // 格式化视频数据
  const videos = videosData?.map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    thumbnail: video.thumbnail_url,
    duration: `${video.duration_minutes}分钟`,
    duration_minutes: video.duration_minutes,
    creator: video.creator_name,
    tags: video.tags || [],
    difficulty: video.difficulty as '初级' | '中级' | '高级',
    date: new Date(video.published_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).replace(/\//g, '/'),
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Header isAdmin={isAdmin} />

      {/* 顶部统计区域 - 全宽展示 */}
      <div className="bg-white/60 backdrop-blur-md border-b border-purple-100/50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <LearningStats />
        </div>
      </div>

      {/* 主内容容器 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 内容区域 - 三栏布局 */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* 左侧日历区域 */}
          <aside className="hidden xl:block xl:col-span-3">
            <div className="sticky top-24 space-y-6">
              <Calendar />
              <LearningNotifications />
            </div>
          </aside>

          {/* 中间视频网格区域 */}
          <main className="xl:col-span-9">
            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-bold text-red-900">数据加载失败</h3>
                </div>
                <p className="text-red-700 mb-2">错误信息: {error.message}</p>
                <p className="text-sm text-red-600">请检查数据库连接或刷新页面重试</p>
              </div>
            )}

            {/* 空状态提示 */}
            {!error && videos.length === 0 && (
              <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center shadow-lg border border-purple-100/50">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">暂无视频</h3>
                <p className="text-gray-600 mb-4">数据库中还没有视频数据，请先添加视频</p>
                <p className="text-sm text-gray-500">提示：请在Supabase中向videos表添加数据</p>
              </div>
            )}

            {/* 视频列表和筛选 */}
            {!error && videos.length > 0 && (
              <VideoListWithFilters videos={videos} />
            )}

          </main>
        </div>

        {/* 移动端日历和通知 */}
        <div className="xl:hidden mt-8 space-y-6">
          <Calendar />
          <LearningNotifications />
        </div>
      </div>
    </div>
  );
}
