import VideoCardSkeleton from './components/VideoCardSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* 顶部导航栏骨架 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse"></div>
            <div className="flex items-center gap-4">
              <div className="h-8 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
            </div>
          </div>
        </div>
      </header>

      {/* 顶部统计区域骨架 */}
      <div className="bg-white/60 backdrop-blur-md border-b border-purple-100/50 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/80 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 主内容容器 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
          {/* 左侧日历区域骨架 - 仅电脑端显示 */}
          <aside className="hidden xl:block xl:col-span-3">
            <div className="sticky top-24 space-y-6">
              {/* 日历骨架 */}
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-purple-100/50 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>

              {/* 通知骨架 */}
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-purple-100/50 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* 中间视频网格区域 */}
          <main className="xl:col-span-9">
            {/* 筛选器骨架 - 仅电脑端显示 */}
            <div className="hidden lg:block mb-8">
              <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-purple-100/50 animate-pulse">
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* 视频网格骨架 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
