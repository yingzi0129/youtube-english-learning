'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(false);
    router.push('/login');
  };

  return (
    <>
    <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* 左侧 Logo 和标题 */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <h1 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              油管英语学习
            </h1>
          </div>

          {/* 右侧导航按钮 */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full hover:shadow-lg transition-all duration-300 hover:scale-105">
              视频库
            </button>
            <button className="hidden md:block px-4 py-2 text-gray-700 hover:bg-purple-50 rounded-full transition-colors text-sm">
              学习记录
            </button>
            <button className="hidden lg:block px-4 py-2 text-gray-700 hover:bg-purple-50 rounded-full transition-colors text-sm">
              英语卡片
            </button>
            <span className="hidden sm:inline text-sm text-gray-600">用户3291</span>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      </div>
    </header>

      {/* 退出登录确认弹框 */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 sm:p-8 animate-in fade-in zoom-in duration-200">
            {/* 图标 */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>

            {/* 标题和描述 */}
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              确定要退出账号吗？
            </h3>
            <p className="text-gray-600 text-center mb-6">
              退出后需要重新登录才能继续学习
            </p>

            {/* 按钮组 */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-xl hover:shadow-lg transition-all"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
