'use client';

import React from 'react';

interface VideoInfoProps {
  video: {
    title: string;
    creator: string;
    difficulty: string;
    duration: string;
    description: string;
    tags: string[];
    publishedAt: string;
  };
}

export default function VideoInfo({ video }: VideoInfoProps) {
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg p-6 border border-purple-100/50">
      {/* 标题 */}
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        {video.title}
      </h1>

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-gray-200">
        {/* 博主 */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-700">{video.creator}</span>
        </div>

        {/* 难度 */}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-sm font-semibold text-gray-700">{video.difficulty}</span>
        </div>

        {/* 时长 */}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-gray-600">{video.duration}</span>
        </div>

        {/* 发布日期 */}
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm text-gray-600">{video.publishedAt}</span>
        </div>
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {video.tags.map((tag, index) => (
          <span
            key={index}
            className="px-3 py-1.5 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* 描述 */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-2">视频简介</h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          {video.description}
        </p>
      </div>
    </div>
  );
}
