'use client';

export default function WordCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
      {/* 标题和按钮骨架 */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-7 bg-gray-200 rounded-full w-16"></div>
      </div>

      {/* 释义骨架 */}
      <div className="h-4 bg-gray-200 rounded w-full mb-3"></div>

      {/* 例句骨架 */}
      <div className="h-16 bg-gray-200 rounded-lg mb-4"></div>

      {/* 状态按钮骨架 */}
      <div className="flex items-center gap-2">
        <div className="h-8 bg-gray-200 rounded-full w-16"></div>
        <div className="h-8 bg-gray-200 rounded-full w-16"></div>
        <div className="h-8 bg-gray-200 rounded-full w-16"></div>
      </div>
    </div>
  );
}
