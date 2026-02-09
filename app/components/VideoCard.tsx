import React from 'react';

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
  title,
  description,
  duration,
  creator,
  tags,
  difficulty,
  date,
}: VideoCardProps) {
  const tagColors: { [key: string]: string } = {
    '日常生活': 'bg-purple-100 text-purple-700',
    '健康养生': 'bg-emerald-100 text-emerald-700',
    '城市旅行': 'bg-sky-100 text-sky-700',
    '美妆护肤': 'bg-rose-100 text-rose-700',
    '美食配送': 'bg-amber-100 text-amber-700',
    '观点表达': 'bg-indigo-100 text-indigo-700',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden hover:shadow-xl hover:border-purple-200 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
      {/* 视频缩略图 */}
      <div className="relative aspect-video bg-gradient-to-br from-purple-400 via-pink-400 to-rose-400 flex items-center justify-center">
        <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white opacity-60" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
        </svg>
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium">
          {duration}
        </div>
      </div>

      {/* 视频信息 */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-2 line-clamp-1 text-sm sm:text-base">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* 博主信息 */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm text-gray-700 font-medium">{creator}</span>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
          {tags.map((tag, index) => (
            <span
              key={index}
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${tagColors[tag] || 'bg-gray-100 text-gray-700'}`}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-gray-700 font-medium">{difficulty}</span>
          </div>
          <span className="text-gray-500">{date}</span>
        </div>
      </div>
    </div>
  );
}
