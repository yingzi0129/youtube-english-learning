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
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      {/* 日历头部 */}
      <div className="flex items-center justify-between mb-4">
        <button className="p-1 hover:bg-gray-100 rounded">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-base font-semibold text-gray-900">
          {monthNames[month]} {year}
        </h3>
        <button className="p-1 hover:bg-gray-100 rounded">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-xs text-gray-500 font-medium py-2">
            {day}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((dateInfo, index) => (
          <div
            key={index}
            className={`
              text-center py-2 text-sm rounded cursor-pointer
              ${dateInfo.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
              ${dateInfo.isToday ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-gray-100'}
            `}
          >
            {dateInfo.day}
          </div>
        ))}
      </div>
    </div>
  );
}
