import React from 'react';

export default function LearningStats() {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 shadow-sm border border-purple-100">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h2 className="text-sm sm:text-base font-bold text-gray-900">学习统计</h2>
      </div>

      <div className="flex justify-between items-center gap-2">
        <div className="text-center flex-1">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent">147</div>
          <div className="text-xs sm:text-sm text-gray-500 mt-1">总期数</div>
        </div>

        <div className="w-px h-12 bg-gradient-to-b from-transparent via-purple-200 to-transparent"></div>

        <div className="text-center flex-1">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-br from-emerald-500 to-teal-500 bg-clip-text text-transparent">0</div>
          <div className="text-xs sm:text-sm text-gray-500 mt-1">完成期数</div>
        </div>

        <div className="w-px h-12 bg-gradient-to-b from-transparent via-purple-200 to-transparent"></div>

        <div className="text-center flex-1">
          <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-br from-sky-500 to-blue-500 bg-clip-text text-transparent">0</div>
          <div className="text-xs sm:text-sm text-gray-500 mt-1">学习天数</div>
        </div>
      </div>
    </div>
  );
}
