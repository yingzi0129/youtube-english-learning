'use client';

import React, { useState } from 'react';

export default function SearchFilters() {
  const [difficulty, setDifficulty] = useState('全部');
  const [duration, setDuration] = useState('全部');
  const [creator, setCreator] = useState('Birta Hlin');
  const [topic, setTopic] = useState('全部');

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 shadow-sm border border-purple-100 mb-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 视频难度 */}
        <div>
          <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700 mb-2">
            <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            视频难度
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-sm border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white transition-all"
          >
            <option>全部</option>
            <option>初级</option>
            <option>中级</option>
            <option>高级</option>
          </select>
        </div>

        {/* 视频时长 */}
        <div>
          <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700 mb-2">
            <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            视频时长
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-sm border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white transition-all"
          >
            <option>全部</option>
            <option>1-3分钟</option>
            <option>3-5分钟</option>
            <option>5-10分钟</option>
            <option>10分钟以上</option>
          </select>
        </div>

        {/* 视频博主 */}
        <div>
          <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700 mb-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            视频博主
          </label>
          <div className="relative">
            <select
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white transition-all"
            >
              <option>全部</option>
              <option>Birta Hlin</option>
            </select>
            {creator === 'Birta Hlin' && (
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-md">
                1
              </span>
            )}
          </div>
        </div>

        {/* 视频话题 */}
        <div>
          <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700 mb-2">
            <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            视频话题
          </label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-sm border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white transition-all"
          >
            <option>全部</option>
            <option>日常生活</option>
            <option>健康养生</option>
            <option>城市旅行</option>
            <option>美妆护肤</option>
            <option>美食配送</option>
          </select>
        </div>
      </div>
    </div>
  );
}
