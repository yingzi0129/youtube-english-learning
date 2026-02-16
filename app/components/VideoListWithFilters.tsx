'use client';

import React, { useState, useMemo } from 'react';
import SearchFilters, { FilterOptions } from './SearchFilters';
import VideoCard from './VideoCard';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  creator: string;
  tags: string[];
  difficulty: '初级' | '中级' | '高级';
  date: string;
  duration_minutes: number;
}

interface VideoListWithFiltersProps {
  videos: Video[];
}

export default function VideoListWithFilters({ videos }: VideoListWithFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    difficulty: '全部',
    duration: '全部',
    creators: [],
    tags: [],
  });

  // 从视频数据中提取所有博主和标签
  const { allCreators, allTags } = useMemo(() => {
    const creatorsSet = new Set<string>();
    const tagsSet = new Set<string>();

    videos.forEach((video) => {
      creatorsSet.add(video.creator);
      video.tags.forEach((tag) => tagsSet.add(tag));
    });

    return {
      allCreators: Array.from(creatorsSet).sort(),
      allTags: Array.from(tagsSet).sort(),
    };
  }, [videos]);

  // 筛选视频
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      // 难度筛选
      if (filters.difficulty !== '全部' && video.difficulty !== filters.difficulty) {
        return false;
      }

      // 时长筛选
      if (filters.duration !== '全部') {
        const duration = video.duration_minutes;
        switch (filters.duration) {
          case '1-3分钟':
            if (duration < 1 || duration > 3) return false;
            break;
          case '3-5分钟':
            if (duration < 3 || duration > 5) return false;
            break;
          case '5-10分钟':
            if (duration < 5 || duration > 10) return false;
            break;
          case '10分钟以上':
            if (duration < 10) return false;
            break;
        }
      }

      // 博主筛选（多选）
      if (filters.creators.length > 0 && !filters.creators.includes(video.creator)) {
        return false;
      }

      // 标签筛选（多选，只要视频包含任一选中的标签即可）
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((tag) => video.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [videos, filters]);

  return (
    <>
      {/* 筛选器区域 */}
      <div className="mb-8 relative z-50">
        <SearchFilters
          allCreators={allCreators}
          allTags={allTags}
          filters={filters}
          onFilterChange={setFilters}
        />
      </div>

      {/* 视频网格 */}
      {filteredVideos.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center shadow-lg border border-purple-100/50">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">没有找到匹配的视频</h3>
          <p className="text-gray-600 mb-4">试试调整筛选条件</p>
          <p className="text-sm text-gray-500">当前共有 {videos.length} 个视频</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 gap-5 lg:gap-6">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} {...video} />
          ))}
        </div>
      )}

      {/* 筛选结果统计 */}
      {filteredVideos.length > 0 && filteredVideos.length < videos.length && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            显示 <span className="font-semibold text-purple-600">{filteredVideos.length}</span> 个视频，
            共 <span className="font-semibold">{videos.length}</span> 个
          </p>
        </div>
      )}
    </>
  );
}
