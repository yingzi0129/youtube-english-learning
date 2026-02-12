'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface VideoCardProps {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  creator: string;
  tags: string[];
  difficulty: '初级' | '中级' | '高级';
  date: string;
}

export default function VideoCard({
  id,
  title,
  description,
  thumbnail,
  duration,
  creator,
  tags,
  difficulty,
  date,
}: VideoCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/videos/${id}`);
  };

  const tagColors: { [key: string]: string } = {
    '日常生活': 'bg-purple-100 text-purple-700',
    '健康养生': 'bg-emerald-100 text-emerald-700',
    '城市旅行': 'bg-sky-100 text-sky-700',
    '美妆护肤': 'bg-rose-100 text-rose-700',
    '美食配送': 'bg-amber-100 text-amber-700',
    '观点表达': 'bg-indigo-100 text-indigo-700',
  };

  return (
    <div
      onClick={handleClick}
      className="group bg-white rounded-3xl shadow-md border border-purple-100/50 overflow-hidden hover:shadow-2xl hover:border-purple-200 transition-all duration-500 hover:-translate-y-2 cursor-pointer"
    >
      {/* 视频缩略图 */}
      <div className="relative aspect-video bg-gradient-to-br from-purple-400 via-pink-400 to-rose-400 flex items-center justify-center overflow-hidden">
        {/* 封面图片 */}
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              // 图片加载失败时隐藏图片，显示默认背景
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}

        {/* 悬停遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        {/* 播放图标 */}
        <svg className="relative z-10 w-16 h-16 text-white opacity-50 group-hover:opacity-70 group-hover:scale-110 transition-all duration-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
        </svg>

        {/* 时长标签 */}
        <div className="absolute bottom-3 right-3 z-10 bg-black/80 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg">
          {duration}
        </div>
      </div>

      {/* 视频信息 */}
      <div className="p-5">
        <h3 className="font-bold text-gray-900 mb-2.5 line-clamp-1 text-base group-hover:text-purple-600 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* 博主信息 */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-sm text-gray-700 font-semibold">{creator}</span>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <span
              key={index}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold ${tagColors[tag] || 'bg-gray-100 text-gray-700'}`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-gray-700 font-semibold">{difficulty}</span>
          </div>
          <span className="text-gray-500 font-medium">{date}</span>
        </div>
      </div>
    </div>
  );
}
