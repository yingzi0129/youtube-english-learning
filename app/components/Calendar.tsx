'use client';

import React from 'react';

export default function Calendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  // 获取月份名称
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // 获取当月第一天是星期几
  const firstDay = new Date(year, month, 1).getDay();

  // 获取当月天数
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 获取上个月天数
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // 生成日历数组
  const calendarDays = [];

  // 添加上个月的日期
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      isToday: false
    });
  }

  // 添加当月的日期
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      isToday: i === today
    });
  }

  // 添加下个月的日期
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      isToday: false
    });
  }

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-purple-100/50">
      {/* 日历头部 */}
      <div className="flex items-center justify-between mb-6">
        <button className="p-2 hover:bg-purple-50 rounded-xl transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <h3 className="text-base font-bold text-gray-900">
            {monthNames[month]}
          </h3>
          <p className="text-sm text-gray-500 font-medium">{year}</p>
        </div>
        <button className="p-2 hover:bg-purple-50 rounded-xl transition-colors">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-3">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-xs text-gray-500 font-semibold py-2">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map((dateInfo, index) => (
          <div
            key={index}
            className={`
              text-center py-2.5 text-sm rounded-xl cursor-pointer transition-all duration-200
              ${dateInfo.isCurrentMonth ? 'text-gray-900 font-medium' : 'text-gray-400'}
              ${dateInfo.isToday
                ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold shadow-md hover:shadow-lg'
                : 'hover:bg-purple-50 hover:text-purple-600'
              }
            `}
          >
            {dateInfo.day}
          </div>
        ))}
      </div>
    </div>
  );
}
