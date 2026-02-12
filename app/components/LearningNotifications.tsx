import React from 'react';

export default function LearningNotifications() {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-purple-100/50">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-900">学习消息</h2>
        </div>
        <button className="text-gray-400 hover:text-purple-600 transition-colors">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-l-4 border-purple-500 p-5 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="text-3xl">📢</div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900 mb-2">学习指南</h3>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              ✅ 学习交流&问题反馈，添加微信号：Jos7161，备注"油管"
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">2025/12/29</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
