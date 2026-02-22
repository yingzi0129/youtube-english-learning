import WordCardSkeleton from '../components/WordCardSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header 骨架 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-8 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧视频列表骨架 */}
          <aside className="lg:col-span-3">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-purple-100/50 shadow-sm p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-20 mb-3"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded-xl"></div>
                ))}
              </div>
            </div>
          </aside>

          {/* 右侧卡片区域骨架 */}
          <main className="lg:col-span-9">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-purple-100/50 shadow-sm p-4 lg:p-6">
              {/* 筛选器骨架 */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="h-10 bg-gray-200 rounded-full w-20"></div>
                  <div className="h-10 bg-gray-200 rounded-full w-20"></div>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 bg-gray-200 rounded-full w-16"></div>
                  ))}
                </div>
              </div>

              {/* 卡片网格骨架 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <WordCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
