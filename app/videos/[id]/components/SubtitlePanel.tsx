'use client';

import React, { useState } from 'react';

interface Subtitle {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
  translation: string;
}

interface SubtitlePanelProps {
  subtitles: Subtitle[];
  currentTime?: number;
  onSeek?: (time: number) => void;
}

type SubtitleMode = 'bilingual' | 'chinese' | 'english';

export default function SubtitlePanel({ subtitles, currentTime = 0, onSeek }: SubtitlePanelProps) {
  // 根据当前播放时间计算激活的字幕ID
  const activeSubtitleId = React.useMemo(() => {
    const activeSubtitle = subtitles.find(
      (sub) => currentTime >= sub.startTime && currentTime < sub.endTime
    );
    return activeSubtitle?.id || null;
  }, [currentTime, subtitles]);

  // 字幕显示模式
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('bilingual');
  // 控制下拉菜单显示
  const [showLoopMenu, setShowLoopMenu] = useState(false);
  const [showPracticeMenu, setShowPracticeMenu] = useState(false);

  // 处理字幕点击，跳转到对应时间
  const handleSubtitleClick = (startTime: number) => {
    if (onSeek) {
      onSeek(startTime);
    }
  };

  // 格式化时间显示（秒转为 mm:ss 格式）
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-purple-100/50 overflow-hidden sticky top-24">
      {/* 标题和功能图标 */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            动态字幕
          </h2>

          {/* 功能图标按钮组 */}
          <div className="flex items-center gap-2">
            {/* 循环播放图标 */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowLoopMenu(!showLoopMenu);
                  setShowPracticeMenu(false);
                }}
                className="w-9 h-9 rounded-lg bg-white hover:bg-purple-50 flex items-center justify-center transition-colors shadow-sm border border-purple-100"
                title="循环播放"
              >
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* 循环播放下拉菜单 */}
              {showLoopMenu && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-purple-100 py-2 z-20">
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 transition-colors">
                    单集播放
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 transition-colors">
                    单集循环
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 transition-colors">
                    列表循环
                  </button>
                </div>
              )}
            </div>

            {/* 英语练习图标 */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowPracticeMenu(!showPracticeMenu);
                  setShowLoopMenu(false);
                }}
                className="w-9 h-9 rounded-lg bg-white hover:bg-purple-50 flex items-center justify-center transition-colors shadow-sm border border-purple-100"
                title="英语练习"
              >
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>

              {/* 英语练习下拉菜单 */}
              {showPracticeMenu && (
                <div className="absolute top-full right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-purple-100 py-2 z-20">
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 transition-colors">
                    听力练习
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 transition-colors">
                    跟读练习
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 transition-colors">
                    填空练习
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 语言切换按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubtitleMode('bilingual')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              subtitleMode === 'bilingual'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            双语
          </button>
          <button
            onClick={() => setSubtitleMode('chinese')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              subtitleMode === 'chinese'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            中文
          </button>
          <button
            onClick={() => setSubtitleMode('english')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              subtitleMode === 'english'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            英文
          </button>
        </div>
      </div>

      {/* 字幕列表 */}
      <div className="h-[600px] overflow-y-auto p-4 space-y-3">
        {subtitles.map((subtitle) => {
          const isActive = subtitle.id === activeSubtitleId;

          return (
            <div
              key={subtitle.id}
              className={`
                p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer
                ${
                  isActive
                    ? 'bg-yellow-50 border-yellow-400 shadow-md'
                    : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm'
                }
              `}
              onClick={() => handleSubtitleClick(subtitle.startTime)}
            >
              {/* 时间戳 */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`
                    text-xs font-bold px-2 py-1 rounded-full
                    ${isActive ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-100 text-gray-600'}
                  `}
                >
                  {formatTime(subtitle.startTime)}
                </span>
                {isActive && (
                  <span className="flex items-center gap-1 text-xs text-yellow-700 font-semibold">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    播放中
                  </span>
                )}
              </div>

              {/* 英文字幕 */}
              {(subtitleMode === 'bilingual' || subtitleMode === 'english') && (
                <p
                  className={`
                    text-lg leading-relaxed
                    ${subtitleMode === 'bilingual' ? 'mb-2' : ''}
                    ${isActive ? 'text-gray-900 font-semibold' : 'text-gray-700'}
                  `}
                >
                  {subtitle.text}
                </p>
              )}

              {/* 中文翻译 */}
              {(subtitleMode === 'bilingual' || subtitleMode === 'chinese') && (
                <p className={`
                  text-sm leading-relaxed
                  ${isActive ? 'text-gray-700' : 'text-gray-600'}
                `}>
                  {subtitle.translation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
