'use client';

import React from 'react';
import MultiSelect from './MultiSelect';

export interface FilterOptions {
  difficulty: string;
  duration: string;
  creators: string[];
  tags: string[];
}

interface SearchFiltersProps {
  allCreators: string[];
  allTags: string[];
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

export default function SearchFilters({
  allCreators,
  allTags,
  filters,
  onFilterChange,
}: SearchFiltersProps) {
  const handleReset = () => {
    onFilterChange({
      difficulty: '全部',
      duration: '全部',
      creators: [],
      tags: [],
    });
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 lg:p-8 shadow-lg border border-purple-100/50">
      {/* 标题区域 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900">筛选视频</h2>
        </div>
        <button
          onClick={handleReset}
          className="text-sm text-purple-600 hover:text-purple-700 font-semibold hover:underline transition-colors"
        >
          重置筛选
        </button>
      </div>

      {/* 筛选器网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 视频难度 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            视频难度
          </label>
          <select
            value={filters.difficulty}
            onChange={(e) => onFilterChange({ ...filters, difficulty: e.target.value })}
            className="w-full px-4 py-3 text-sm font-medium border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white hover:border-purple-300 transition-all cursor-pointer"
          >
            <option>全部</option>
            <option>初级</option>
            <option>中级</option>
            <option>高级</option>
          </select>
        </div>

        {/* 视频时长 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            视频时长
          </label>
          <select
            value={filters.duration}
            onChange={(e) => onFilterChange({ ...filters, duration: e.target.value })}
            className="w-full px-4 py-3 text-sm font-medium border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent bg-white hover:border-purple-300 transition-all cursor-pointer"
          >
            <option>全部</option>
            <option>1-3分钟</option>
            <option>3-5分钟</option>
            <option>5-10分钟</option>
            <option>10分钟以上</option>
          </select>
        </div>

        {/* 视频博主 */}
        <MultiSelect
          label="视频博主"
          icon={
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          options={allCreators}
          selectedValues={filters.creators}
          onChange={(values) => onFilterChange({ ...filters, creators: values })}
          placeholder="选择博主"
        />

        {/* 视频话题 */}
        <MultiSelect
          label="视频话题"
          icon={
            <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
          options={allTags}
          selectedValues={filters.tags}
          onChange={(values) => onFilterChange({ ...filters, tags: values })}
          placeholder="选择话题"
        />
      </div>
    </div>
  );
}
