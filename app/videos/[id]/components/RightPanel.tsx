'use client';

import React, { useState } from 'react';
import SubtitlePanel from './SubtitlePanel';

interface Subtitle {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
  translation: string;
  keywords: string[];
}

type VideoLoopMode = 'single' | 'loop';
type SentenceLoopMode = 'continuous' | 'single';
type LoopCount = 1 | 2 | 3 | -1;

interface RightPanelProps {
  subtitles: Subtitle[];
  currentTime?: number;
  onSeek?: (time: number) => void;
  onPlayOriginal?: (subtitleId: number) => void;
  videoLoopMode: VideoLoopMode;
  onVideoLoopModeChange: (mode: VideoLoopMode) => void;
  sentenceLoopMode: SentenceLoopMode;
  onSentenceLoopModeChange: (mode: SentenceLoopMode) => void;
  loopCount: LoopCount;
  onLoopCountChange: (count: LoopCount) => void;
  currentLoopIndex: number;
  autoNextSentence: boolean;
  onAutoNextSentenceChange: (auto: boolean) => void;
  videoId: string;
  subtitleMode: 'bilingual' | 'chinese' | 'english';
  onSubtitleModeChange: (mode: 'bilingual' | 'chinese' | 'english') => void;
  fontSize: number;
  themeMode: 'light' | 'dark';
  isPracticeMode: boolean;
  onPracticeModeChange: (enabled: boolean) => void;
}

type TabType = 'subtitle' | 'loop' | 'practice' | null;

export default function RightPanel({
  subtitles,
  currentTime,
  onSeek,
  onPlayOriginal,
  videoLoopMode,
  onVideoLoopModeChange,
  sentenceLoopMode,
  onSentenceLoopModeChange,
  loopCount,
  onLoopCountChange,
  currentLoopIndex,
  autoNextSentence,
  onAutoNextSentenceChange,
  videoId,
  subtitleMode,
  onSubtitleModeChange,
  fontSize,
  themeMode,
  isPracticeMode,
  onPracticeModeChange,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>(null);
  const [showMenu, setShowMenu] = useState(false);

  const tabs = [
    {
      id: 'subtitle' as TabType,
      name: '动态字幕',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
    },
    {
      id: 'loop' as TabType,
      name: '循环播放',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      id: 'practice' as TabType,
      name: '英语练习',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  const handleTabClick = (tabId: TabType) => {
    if (activeTab === tabId) {
      setActiveTab(null);
    } else {
      setActiveTab(tabId);
    }
    setShowMenu(false);
  };

  const handleClosePanel = () => {
    setActiveTab(null);
  };

  return (
    <div>
      {/* 标签导航 */}
      <div className="bg-white/90 backdrop-blur-md rounded-t-3xl shadow-lg border border-b-0 border-purple-100/50 flex overflow-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-4 transition-all
              ${
                activeTab === tab.id
                  ? 'text-purple-600 bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/50'
              }
            `}
          >
            {tab.icon}
            <span className="text-sm font-medium">{tab.name}</span>
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div>
        {activeTab === 'subtitle' && (
          <SubtitlePanel
            subtitles={subtitles}
            currentTime={currentTime}
            onSeek={onSeek}
            onPlayOriginal={onPlayOriginal}
            videoLoopMode={videoLoopMode}
            onVideoLoopModeChange={onVideoLoopModeChange}
            sentenceLoopMode={sentenceLoopMode}
            onSentenceLoopModeChange={onSentenceLoopModeChange}
            loopCount={loopCount}
            onLoopCountChange={onLoopCountChange}
            currentLoopIndex={currentLoopIndex}
            autoNextSentence={autoNextSentence}
            onAutoNextSentenceChange={onAutoNextSentenceChange}
            videoId={videoId}
            subtitleMode={subtitleMode}
            onSubtitleModeChange={onSubtitleModeChange}
            fontSize={fontSize}
            themeMode={themeMode}
            isPracticeMode={isPracticeMode}
            onPracticeModeChange={onPracticeModeChange}
          />
        )}

        {activeTab === 'loop' && (
          <div className="bg-white/90 backdrop-blur-md rounded-b-3xl shadow-lg border border-t-0 border-purple-100/50 overflow-hidden">
            <div className="h-[600px] flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">循环播放</h3>
                <p className="text-sm text-gray-600">此功能即将推出</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'practice' && (
          <div className="bg-white/90 backdrop-blur-md rounded-b-3xl shadow-lg border border-t-0 border-purple-100/50 overflow-hidden">
            <div className="h-[600px] flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">英语练习</h3>
                <p className="text-sm text-gray-600">此功能即将推出</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
