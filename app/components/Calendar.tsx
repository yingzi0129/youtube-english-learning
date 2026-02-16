'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';

// SWR fetcher 函数
const fetchCheckIns = async (): Promise<string[]> => {
  const supabase = createClient();

  // 获取当前用户
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  // 获取用户的所有打卡记录
  const { data, error } = await supabase
    .from('check_ins')
    .select('check_in_date')
    .eq('user_id', user.id);

  if (error) {
    return [];
  }

  // 将打卡日期存入数组
  const dates = data?.map(item => item.check_in_date) || [];

  return dates;
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 使用 SWR 获取打卡记录，带缓存
  const { data: checkInDatesArray, isLoading } = useSWR(
    'check-ins-calendar',
    fetchCheckIns,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateOnMount: true,
      revalidateIfStale: false,
      dedupingInterval: 60000, // 60秒内的重复请求会被去重
    }
  );

  // 将数组转换为 Set 以便快速查找
  const checkInDates = React.useMemo(() => {
    return new Set(checkInDatesArray || []);
  }, [checkInDatesArray]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  // 获取月份名称
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // 获取中国时区的日期字符串（格式：YYYY-MM-DD）
  const getChinaDateString = (date: Date): string => {
    const chinaTime = new Date(date.getTime() + (8 * 60 * 60 * 1000));
    const y = chinaTime.getUTCFullYear();
    const m = String(chinaTime.getUTCMonth() + 1).padStart(2, '0');
    const d = String(chinaTime.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 切换到上个月
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  // 切换到下个月
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

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
    const day = daysInPrevMonth - i;
    const date = new Date(year, month - 1, day);
    const dateString = getChinaDateString(date);
    const isCheckedIn = checkInDates.has(dateString);

    calendarDays.push({
      day,
      isCurrentMonth: false,
      isToday: false,
      isCheckedIn,
      dateString,
    });
  }

  // 添加当月的日期
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    const dateString = getChinaDateString(date);
    const isToday = i === todayDate && month === todayMonth && year === todayYear;
    const isCheckedIn = checkInDates.has(dateString);

    calendarDays.push({
      day: i,
      isCurrentMonth: true,
      isToday,
      isCheckedIn,
      dateString,
    });
  }

  // 添加下个月的日期
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i);
    const dateString = getChinaDateString(date);
    const isCheckedIn = checkInDates.has(dateString);

    calendarDays.push({
      day: i,
      isCurrentMonth: false,
      isToday: false,
      isCheckedIn,
      dateString,
    });
  }

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-purple-100/50">
      {/* 日历头部 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-purple-50 rounded-xl transition-colors"
          title="上个月"
        >
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
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-purple-50 rounded-xl transition-colors"
          title="下个月"
        >
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
              relative text-center py-2.5 text-sm rounded-xl transition-all duration-200
              ${dateInfo.isCurrentMonth ? 'text-gray-900 font-medium' : 'text-gray-400'}
              ${dateInfo.isCheckedIn
                ? 'bg-gradient-to-br from-emerald-400 to-teal-400 text-white font-bold shadow-sm'
                : dateInfo.isToday
                ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold shadow-md'
                : 'hover:bg-purple-50'
              }
              `}
            >
              {dateInfo.day}
              {dateInfo.isToday && dateInfo.isCheckedIn && (
                <div className="absolute top-0.5 right-0.5">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              )}
            </div>
          ))}
        </div>

      {/* 图例说明 */}
      <div className="mt-4 pt-4 border-t border-purple-100 flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-purple-500 to-pink-500"></div>
          <span className="text-gray-600">今天</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-emerald-400 to-teal-400"></div>
          <span className="text-gray-600">已打卡</span>
        </div>
      </div>
    </div>
  );
}
