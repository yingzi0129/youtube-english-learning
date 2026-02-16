'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';

interface StatsData {
  videoCount: number;
  checkInDays: number;
  hasCheckedInToday: boolean;
}

// SWR fetcher 函数
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('获取统计数据失败');
  }
  return response.json();
};

export default function LearningStats() {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 使用 SWR 获取数据，带缓存
  const { data: stats, mutate } = useSWR<StatsData>(
    '/api/check-ins/stats',
    fetcher,
    {
      revalidateOnFocus: false, // 窗口聚焦时不重新验证
      revalidateOnReconnect: true, // 重新连接时重新验证
      dedupingInterval: 5000, // 5秒内的重复请求会被去重
    }
  );

  // 执行打卡
  const handleCheckIn = async () => {
    if (stats?.hasCheckedInToday || isCheckingIn) {
      return;
    }

    setIsCheckingIn(true);
    try {
      const response = await fetch('/api/check-ins', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '打卡失败');
      }

      // 更新缓存数据
      mutate({
        ...stats!,
        checkInDays: data.checkInDays,
        hasCheckedInToday: true,
      }, false);

      setError(null);
    } catch (err: any) {
      console.error('打卡错误:', err);
      setError(err.message || '打卡失败');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // 骨架屏
  if (!stats) {
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 lg:p-8 shadow-lg border border-purple-100/50">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
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
          <div className="flex items-center gap-6 lg:gap-8">
            <div className="text-center">
              <div className="h-12 w-16 bg-gray-200 animate-pulse rounded mb-2"></div>
              <div className="text-sm text-gray-600 font-medium">总期数</div>
            </div>
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-purple-300 to-transparent"></div>
            <div className="text-center">
              <div className="h-12 w-16 bg-gray-200 animate-pulse rounded mb-2"></div>
              <div className="text-sm text-gray-600 font-medium">打卡天数</div>
            </div>
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-purple-300 to-transparent"></div>
            <div className="text-center">
              <div className="h-10 w-24 bg-gray-200 animate-pulse rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* 统计数据和打卡按钮区域 */}
        <div className="flex items-center gap-6 lg:gap-8">
          {/* 总期数 */}
          <div className="text-center">
            <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              {stats.videoCount}
            </div>
            <div className="text-sm text-gray-600 font-medium">总期数</div>
          </div>

          <div className="w-px h-16 bg-gradient-to-b from-transparent via-purple-300 to-transparent"></div>

          {/* 打卡天数 */}
          <div className="text-center">
            <div className="text-4xl lg:text-5xl font-bold bg-gradient-to-br from-emerald-500 to-teal-500 bg-clip-text text-transparent mb-2">
              {stats.checkInDays}
            </div>
            <div className="text-sm text-gray-600 font-medium">打卡天数</div>
          </div>

          <div className="w-px h-16 bg-gradient-to-b from-transparent via-purple-300 to-transparent"></div>

          {/* 今日打卡按钮 */}
          <div className="text-center">
            <button
              onClick={handleCheckIn}
              disabled={stats.hasCheckedInToday || isCheckingIn}
              className={`
                px-6 py-3 rounded-2xl font-bold text-white shadow-lg transition-all duration-300
                ${stats.hasCheckedInToday
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-br from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 hover:shadow-xl hover:scale-105'
                }
                ${isCheckingIn ? 'opacity-50 cursor-wait' : ''}
              `}
            >
              {isCheckingIn ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  打卡中...
                </span>
              ) : stats.hasCheckedInToday ? (
                '✓ 已打卡'
              ) : (
                '今日打卡'
              )}
            </button>
            {error && (
              <p className="text-xs text-red-500 mt-2">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
