'use client';

export default function HistoryCardSkeleton() {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg animate-pulse">
      {/* 缩略图骨架 */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-200 to-gray-300"></div>

      {/* 视频信息骨架 */}
      <div className="p-4">
        {/* 标题骨架 */}
        <div className="space-y-2 mb-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>

        {/* 作者骨架 */}
        <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>

        {/* 底部信息骨架 */}
        <div className="flex items-center justify-between">
          <div className="h-3 bg-gray-200 rounded w-28"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}
