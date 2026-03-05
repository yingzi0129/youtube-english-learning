'use client';

import React, { useState } from 'react';

type SubtitleMode = 'bilingual' | 'chinese' | 'english';
type VideoLoopMode = 'single' | 'loop';
type SentenceLoopMode = 'continuous' | 'single';
type LoopCount = 1 | 2 | 3 | -1;
type ThemeMode = 'light' | 'dark';

interface MobileBottomControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  subtitleMode: SubtitleMode;
  onSubtitleModeChange: (mode: SubtitleMode) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  videoLoopMode: VideoLoopMode;
  onVideoLoopModeChange: (mode: VideoLoopMode) => void;
  sentenceLoopMode: SentenceLoopMode;
  onSentenceLoopModeChange: (mode: SentenceLoopMode) => void;
  loopCount: LoopCount;
  onLoopCountChange: (count: LoopCount) => void;
  autoNextSentence: boolean;
  onAutoNextSentenceChange: (auto: boolean) => void;
  currentLoopIndex: number;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  isPracticeMode: boolean;
  onPracticeModeChange: (enabled: boolean) => void;
  isClozeMode: boolean;
  onClozeModeChange: (enabled: boolean) => void;
}

type PanelType = 'subtitle' | 'loop' | 'speed' | 'theme' | 'more' | null;

export default function MobileBottomControls({
  isPlaying,
  onPlayPause,
  subtitleMode,
  onSubtitleModeChange,
  fontSize,
  onFontSizeChange,
  playbackRate,
  onPlaybackRateChange,
  videoLoopMode,
  onVideoLoopModeChange,
  sentenceLoopMode,
  onSentenceLoopModeChange,
  loopCount,
  onLoopCountChange,
  autoNextSentence,
  onAutoNextSentenceChange,
  currentLoopIndex,
  themeMode,
  onThemeModeChange,
  isPracticeMode,
  onPracticeModeChange,
  isClozeMode,
  onClozeModeChange,
}: MobileBottomControlsProps) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  const handlePanelToggle = (panel: PanelType) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  const handleClosePanel = () => {
    setActivePanel(null);
  };

  return (
    <>
      {/* 遮罩层 */}
      {activePanel && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
          onClick={handleClosePanel}
        />
      )}

      {/* 弹出面板 */}
      {activePanel && (
        <div className="fixed bottom-20 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-[70] lg:hidden max-h-[calc(100vh-280px)] overflow-hidden flex flex-col">
          {/* 面板头部 */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              {activePanel === 'subtitle' && '字幕设置'}
              {activePanel === 'loop' && '循环设置'}
              {activePanel === 'theme' && '主题模式'}
              {activePanel === 'more' && '更多功能'}
            </h3>
            <button
              onClick={handleClosePanel}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 面板内容 - 可滚动区域 */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* 字幕设置面板 */}
            {activePanel === 'subtitle' && (
              <div className="space-y-6">
                {/* 语言选择 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">显示语言</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => onSubtitleModeChange('bilingual')}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        subtitleMode === 'bilingual'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      双语
                    </button>
                    <button
                      onClick={() => onSubtitleModeChange('chinese')}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        subtitleMode === 'chinese'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      中文
                    </button>
                    <button
                      onClick={() => onSubtitleModeChange('english')}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        subtitleMode === 'english'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      英文
                    </button>
                  </div>
                </div>

                {/* 字体大小 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    字体大小 <span className="text-purple-600">{fontSize}px</span>
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    step="1"
                    value={fontSize}
                    onChange={(e) => onFontSizeChange(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>小</span>
                    <span>中</span>
                    <span>大</span>
                  </div>
                </div>
              </div>
            )}

            {/* 循环设置面板 */}
            {activePanel === 'loop' && (
              <div className="space-y-6">
                {/* 视频循环 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">视频循环</label>
                  <div className="space-y-2">
                    <button
                      onClick={() => onVideoLoopModeChange('single')}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                        videoLoopMode === 'single'
                          ? 'bg-purple-50 text-purple-700 border-2 border-purple-600'
                          : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <span>单集播放</span>
                      {videoLoopMode === 'single' && <span className="text-purple-600">✓</span>}
                    </button>
                    <button
                      onClick={() => onVideoLoopModeChange('loop')}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                        videoLoopMode === 'loop'
                          ? 'bg-purple-50 text-purple-700 border-2 border-purple-600'
                          : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <span>单集循环</span>
                      {videoLoopMode === 'loop' && <span className="text-purple-600">✓</span>}
                    </button>
                  </div>
                </div>

                {/* 句子循环 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">句子循环</label>
                  <div className="space-y-2">
                    <button
                      onClick={() => onSentenceLoopModeChange('continuous')}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                        sentenceLoopMode === 'continuous'
                          ? 'bg-purple-50 text-purple-700 border-2 border-purple-600'
                          : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <span>连续播放</span>
                      {sentenceLoopMode === 'continuous' && <span className="text-purple-600">✓</span>}
                    </button>
                    <button
                      onClick={() => onSentenceLoopModeChange('single')}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                        sentenceLoopMode === 'single'
                          ? 'bg-purple-50 text-purple-700 border-2 border-purple-600'
                          : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <span>单句循环</span>
                      {sentenceLoopMode === 'single' && <span className="text-purple-600">✓</span>}
                    </button>
                  </div>
                </div>

                {/* 循环次数（仅在单句循环时显示） */}
                {sentenceLoopMode === 'single' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">循环次数</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, -1].map((count) => (
                          <button
                            key={count}
                            onClick={() => onLoopCountChange(count as LoopCount)}
                            className={`py-3 rounded-xl text-sm font-medium transition-all ${
                              loopCount === count
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {count === -1 ? '∞' : count}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 自动下一句 */}
                    <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                      <span className="text-sm font-medium text-gray-700">自动下一句</span>
                      <button
                        onClick={() => onAutoNextSentenceChange(!autoNextSentence)}
                        className={`w-12 h-6 rounded-full transition-colors ${
                          autoNextSentence ? 'bg-purple-600' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                            autoNextSentence ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {/* 当前循环进度 */}
                    <div className="py-3 px-4 bg-purple-50 rounded-xl">
                      <p className="text-sm text-purple-700">
                        {loopCount === -1
                          ? `当前循环：第 ${currentLoopIndex + 1} 次`
                          : `当前循环：第 ${currentLoopIndex + 1} / ${loopCount} 次`}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 主题模式面板 */}
            {activePanel === 'speed' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        onPlaybackRateChange(speed);
                        handleClosePanel();
                      }}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        playbackRate === speed
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {speed}倍
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activePanel === 'theme' && (
              <div className="space-y-3">
                <button
                  onClick={() => onThemeModeChange('light')}
                  className={`w-full py-4 px-4 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${
                    themeMode === 'light'
                      ? 'bg-purple-50 text-purple-700 border-2 border-purple-600'
                      : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="flex-1 text-left">明亮模式</span>
                  {themeMode === 'light' && <span className="text-purple-600">✓</span>}
                </button>
                <button
                  onClick={() => onThemeModeChange('dark')}
                  className={`w-full py-4 px-4 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${
                    themeMode === 'dark'
                      ? 'bg-purple-50 text-purple-700 border-2 border-purple-600'
                      : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <span className="flex-1 text-left">夜间模式</span>
                  {themeMode === 'dark' && <span className="text-purple-600">✓</span>}
                </button>
              </div>
            )}

            {/* 更多功能面板 */}
            {activePanel === 'more' && (
              <div className="space-y-3">
                {/* 跟读练习 */}
                <button
                  onClick={() => onPracticeModeChange(!isPracticeMode)}
                  className={`w-full py-4 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                    isPracticeMode
                      ? 'bg-purple-50 text-purple-700 border-2 border-purple-600'
                      : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <div className="text-left">
                      <p className="font-semibold">跟读练习</p>
                      <p className="text-xs text-gray-500 mt-0.5">录制你的发音并与原音对比</p>
                    </div>
                  </div>
                  {isPracticeMode && <span className="text-purple-600 text-lg">✓</span>}
                </button>

                {/* 填空练习 */}
                <button
                  onClick={() => onClozeModeChange(!isClozeMode)}
                  className={`w-full py-4 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                    isClozeMode
                      ? 'bg-purple-50 text-purple-700 border-2 border-purple-600'
                      : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <div className="text-left">
                      <p className="font-semibold">填空练习</p>
                      <p className="text-xs text-gray-500 mt-0.5">点击遮挡的单词来揭晓答案</p>
                    </div>
                  </div>
                  {isClozeMode && <span className="text-purple-600 text-lg">✓</span>}
                </button>

                {/* 提示信息 */}
                {(isPracticeMode || isClozeMode) && (
                  <div className="mt-4 py-3 px-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-blue-800">
                        {isPracticeMode && '跟读模式已开启，在字幕列表中可以看到录音按钮'}
                        {isClozeMode && !isPracticeMode && '填空模式已开启，字幕中的关键词将被遮挡'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 底部控制栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-30 lg:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* 左侧第一个：双语 */}
            <button
              onClick={() => handlePanelToggle('subtitle')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                activePanel === 'subtitle' ? 'bg-purple-50' : 'hover:bg-gray-50'
              }`}
            >
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span className="text-xs text-gray-600">双语</span>
            </button>

            {/* 左侧第二个：循环 */}
            <button
              onClick={() => handlePanelToggle('loop')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                activePanel === 'loop' ? 'bg-purple-50' : 'hover:bg-gray-50'
              }`}
            >
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-xs text-gray-600">循环</span>
            </button>

            {/* 中间：播放按钮 */}
            <button
              onClick={onPlayPause}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            >
              {isPlaying ? (
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* 右侧第一个：模式 */}
            <button
              onClick={() => handlePanelToggle('speed')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                activePanel === 'speed' ? 'bg-purple-50' : 'hover:bg-gray-50'
              }`}
            >
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs text-gray-600">倍速</span>
            </button>

            {/* 右侧第二个：更多 */}
            <button
              onClick={() => handlePanelToggle('more')}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                activePanel === 'more' ? 'bg-purple-50' : 'hover:bg-gray-50'
              }`}
            >
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-xs text-gray-600">更多</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
