'use client';

import { useState, useMemo } from 'react';
import Header from './components/Header';
import LearningStats from './components/LearningStats';
import Calendar from './components/Calendar';
import LearningNotifications from './components/LearningNotifications';
import SearchFilters, { FilterOptions } from './components/SearchFilters';
import VideoCard from './components/VideoCard';
import MobileDrawer from './components/MobileDrawer';

interface HomeClientProps {
  isAdmin: boolean;
  videos: Array<{
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    duration: string;
    duration_minutes: number;
    creator: string;
    tags: string[];
    difficulty: '初级' | '中级' | '高级';
    date: string;
  }>;
  error: any;
}

export default function HomeClient({ isAdmin, videos, error }: HomeClientProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    difficulty: '全部',
    duration: '全部',
    creators: [],
    tags: [],
  });

  // 从视频数据中提取所有博主和标签
  const { allCreators, allTags } = useMemo(() => {
    const creatorsSet = new Set<string>();
    const tagsSet = new Set<string>();

    videos.forEach((video) => {
      creatorsSet.add(video.creator);
      video.tags.forEach((tag) => tagsSet.add(tag));
    });

    return {
      allCreators: Array.from(creatorsSet).sort(),
      allTags: Array.from(tagsSet).sort(),
    };
  }, [videos]);

  // 筛选视频
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      // 难度筛选
      if (filters.difficulty !== '全部' && video.difficulty !== filters.difficulty) {
        return false;
      }

      // 时长筛选
      if (filters.duration !== '全部') {
        const duration = video.duration_minutes;
        switch (filters.duration) {
          case '1-3分钟':
            if (duration < 1 || duration > 3) return false;
            break;
          case '3-5分钟':
            if (duration < 3 || duration > 5) return false;
            break;
          case '5-10分钟':
            if (duration < 5 || duration > 10) return false;
            break;
          case '10分钟以上':
            if (duration < 10) return false;
            break;
        }
      }

      // 博主筛选（多选）
      if (filters.creators.length > 0 && !filters.creators.includes(video.creator)) {
        return false;
      }

      // 标签筛选（多选）
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((tag) => video.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [videos, filters]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Header isAdmin={isAdmin} />

      {/* 顶部统计区域 - 全宽展示 */}
      <div className="bg-white/60 backdrop-blur-md border-b border-purple-100/50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <LearningStats />
        </div>
      </div>

      {/* 移动端：抽屉触发按钮 */}
      <div className="lg:hidden fixed bottom-6 right-6 z-30">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* 移动端：抽屉 */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <SearchFilters
          allCreators={allCreators}
          allTags={allTags}
          filters={filters}
          onFilterChange={setFilters}
        />
        <Calendar />
        <LearningNotifications />
      </MobileDrawer>

      {/* 主内容容器 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* 内容区域 - 三栏布局 */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* 左侧日历区域 - 仅电脑端显示 */}
          <aside className="hidden xl:block xl:col-span-3">
            <div className="sticky top-24 space-y-6">
              <Calendar />
              <LearningNotifications />
            </div>
          </aside>

          {/* 中间视频网格区域 */}
          <main className="xl:col-span-9">
            {/* 筛选器区域 - 仅电脑端显示 */}
            <div className="hidden lg:block mb-8">
              <SearchFilters
                allCreators={allCreators}
                allTags={allTags}
                filters={filters}
                onFilterChange={setFilters}
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 lg:p-6 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 lg:w-6 lg:h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-base lg:text-lg font-bold text-red-900">数据加载失败</h3>
                </div>
                <p className="text-sm lg:text-base text-red-700 mb-2">错误信息: {error.message}</p>
                <p className="text-xs lg:text-sm text-red-600">请检查数据库连接或刷新页面重试</p>
              </div>
            )}

            {/* 空状态提示 */}
            {!error && videos.length === 0 && (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl lg:rounded-3xl p-8 lg:p-12 text-center shadow-lg border border-purple-100/50">
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 lg:w-10 lg:h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">暂无视频</h3>
                <p className="text-sm lg:text-base text-gray-600 mb-4">数据库中还没有视频数据，请先添加视频</p>
                <p className="text-xs lg:text-sm text-gray-500">提示：请在Supabase中向videos表添加数据</p>
              </div>
            )}

            {/* 视频网格 */}
            {!error && videos.length > 0 && (
              <>
                {filteredVideos.length === 0 ? (
                  <div className="bg-white/90 backdrop-blur-md rounded-2xl lg:rounded-3xl p-8 lg:p-12 text-center shadow-lg border border-purple-100/50">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 lg:w-10 lg:h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">没有找到匹配的视频</h3>
                    <p className="text-sm lg:text-base text-gray-600 mb-4">试试调整筛选条件</p>
                    <p className="text-xs lg:text-sm text-gray-500">当前共有 {videos.length} 个视频</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6">
                      {filteredVideos.map((video) => (
                        <VideoCard key={video.id} {...video} />
                      ))}
                    </div>

                    {/* 筛选结果统计 */}
                    {filteredVideos.length < videos.length && (
                      <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                          显示 <span className="font-semibold text-purple-600">{filteredVideos.length}</span> 个视频，
                          共 <span className="font-semibold">{videos.length}</span> 个
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
