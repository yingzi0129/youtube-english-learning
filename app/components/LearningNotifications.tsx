'use client';

import React from 'react';
import { createClient } from '@/lib/supabase/client';
import useSWR from 'swr';

interface ContactInfo {
  id: string;
  title: string;
  content: string;
  icon: string;
  sort_order: number;
}

// SWR fetcher 函数
const fetchContactInfo = async () => {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('contact_info')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    // 如果表不存在，静默失败
    if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
      console.log('联系方式表尚未创建');
    } else {
      console.error('获取联系方式错误:', error);
    }
    return [];
  }

  return data || [];
};

export default function ContactInfoCard() {
  // 使用 SWR 获取联系方式，带缓存
  const { data: contactList, isLoading } = useSWR<ContactInfo[]>(
    'contact-info',
    fetchContactInfo,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30秒内的重复请求会被去重
      fallbackData: [], // 默认值
    }
  );

  // 如果没有数据且不在加载中，不显示组件
  if (!isLoading && (!contactList || contactList.length === 0)) {
    return null;
  }

  // 加载中或有数据时显示骨架屏/内容
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-purple-100/50">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-900">联系方式</h2>
        </div>
      </div>

      {isLoading || !contactList || contactList.length === 0 ? (
        // 骨架屏
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-l-4 border-purple-500 p-5 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-200 animate-pulse rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 animate-pulse rounded w-24"></div>
                <div className="h-3 bg-gray-200 animate-pulse rounded w-full"></div>
                <div className="h-3 bg-gray-200 animate-pulse rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // 实际内容
        <div className="space-y-4">
          {contactList.map((contact) => (
            <div
              key={contact.id}
              className="bg-gradient-to-br from-blue-50 to-purple-50 border-l-4 border-purple-500 p-5 rounded-2xl"
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{contact.icon}</div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900 mb-2">{contact.title}</h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {contact.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
