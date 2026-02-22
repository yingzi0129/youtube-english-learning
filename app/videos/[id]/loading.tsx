export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* 顶部导航栏骨架 */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="h-6 bg-gray-200 rounded-lg w-32 animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 视频播放器和字幕面板骨架 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* 左侧：视频播放器骨架 */}
          <div className="lg:col-span-7">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl lg:rounded-3xl shadow-xl border border-purple-100/50 overflow-hidden animate-pulse">
              {/* 视频播放器区域 */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
              </div>

              {/* 视频控制栏骨架 */}
              <div className="p-4 lg:p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="flex items-center gap-4">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：字幕面板骨架 */}
          <div className="lg:col-span-5">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl lg:rounded-3xl shadow-xl border border-purple-100/50 p-4 lg:p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 视频介绍骨架 - 仅桌面端显示 */}
        <div className="hidden lg:block mt-6">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl lg:rounded-3xl shadow-xl border border-purple-100/50 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
