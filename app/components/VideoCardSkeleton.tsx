'use client';

export default function VideoCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl lg:rounded-3xl shadow-md border border-purple-100/50 overflow-hidden animate-pulse">
      {/* 缩略图骨架 */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-200 to-gray-300"></div>

      {/* 内容骨架 */}
      <div className="p-4 lg:p-5">
        {/* 标题骨架 */}
        <div className="h-4 lg:h-5 bg-gray-200 rounded-lg mb-2 lg:mb-2.5 w-3/4"></div>

        {/* 描述骨架 */}
        <div className="space-y-2 mb-3 lg:mb-4">
          <div className="h-3 lg:h-3.5 bg-gray-200 rounded w-full"></div>
          <div className="h-3 lg:h-3.5 bg-gray-200 rounded w-5/6"></div>
        </div>

        {/* 博主信息骨架 */}
        <div className="flex items-center gap-2 lg:gap-2.5 mb-3 lg:mb-4">
          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gray-200"></div>
          <div className="h-3 lg:h-3.5 bg-gray-200 rounded w-24"></div>
        </div>

        {/* 标签骨架 */}
        <div className="flex gap-1.5 lg:gap-2 mb-3 lg:mb-4">
          <div className="h-6 lg:h-7 bg-gray-200 rounded-full w-16"></div>
          <div className="h-6 lg:h-7 bg-gray-200 rounded-full w-20"></div>
        </div>

        {/* 底部信息骨架 */}
        <div className="flex items-center justify-between pt-2.5 lg:pt-3 border-t border-gray-100">
          <div className="h-3 lg:h-3.5 bg-gray-200 rounded w-16"></div>
          <div className="h-3 lg:h-3.5 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}
