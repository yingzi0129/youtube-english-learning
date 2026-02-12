import React from 'react';

export default function LearningStats() {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 lg:p-8 shadow-lg border border-purple-100/50">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* 标题区域 */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg lg:text-xl font-bold text-gray-900">学习数据概览</h2>
            <p className="text-sm text-gray-500 mt-0.5">持续学习，每天进步一点点</p>
          </div>
        </div>

        {/* 统计数据区域 */}
        <div className="flex items-center gap-8 lg:gap-12">
          <div className="text-center">
            <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              147
            </div>
            <div className="text-sm text-gray-600 font-medium">总期数</div>
          </div>

          <div className="w-px h-16 bg-gradient-to-b from-transparent via-purple-300 to-transparent"></div>

          <div className="text-center">
            <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-br from-emerald-500 to-teal-500 bg-clip-text text-transparent mb-2">
              0
            </div>
            <div className="text-sm text-gray-600 font-medium">完成期数</div>
          </div>

          <div className="w-px h-16 bg-gradient-to-b from-transparent via-purple-300 to-transparent"></div>

          <div className="text-center">
            <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-br from-sky-500 to-blue-500 bg-clip-text text-transparent mb-2">
              0
            </div>
            <div className="text-sm text-gray-600 font-medium">学习天数</div>
          </div>
        </div>
      </div>
    </div>
  );
}
