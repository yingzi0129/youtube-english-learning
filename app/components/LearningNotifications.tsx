import React from 'react';

export default function LearningNotifications() {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-base font-semibold text-gray-900">学习消息</h2>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📢</div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">学习指南</h3>
            <p className="text-sm text-gray-700">
              ✅ 学习交流&问题反馈，添加微信号：Jos7161，备注"油管"
            </p>
            <p className="text-xs text-gray-500 mt-2">2025/12/29</p>
          </div>
        </div>
      </div>
    </div>
  );
}
