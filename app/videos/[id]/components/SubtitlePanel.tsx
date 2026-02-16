'use client';

import React, { useState, useEffect } from 'react';
import AudioRecorder from '@/app/components/AudioRecorder';
import { createClient } from '@/lib/supabase/client';

interface Subtitle {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
  translation: string;
}

type VideoLoopMode = 'single' | 'loop';
type SentenceLoopMode = 'continuous' | 'single';
type LoopCount = 1 | 2 | 3 | -1;

interface SubtitlePanelProps {
  subtitles: Subtitle[];
  currentTime?: number;
  onSeek?: (time: number) => void;
  onPlayOriginal?: (startTime: number) => void;
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
}

type SubtitleMode = 'bilingual' | 'chinese' | 'english';

export default function SubtitlePanel({
  subtitles,
  currentTime = 0,
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
}: SubtitlePanelProps) {
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
  // 口语练习模式
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  // 存储已有的录音记录
  const [existingRecordings, setExistingRecordings] = useState<Record<number, string>>({});

  // 加载已有的录音记录
  useEffect(() => {
    const loadRecordings = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('speaking_practice')
        .select('subtitle_id, audio_url')
        .eq('user_id', user.id)
        .eq('video_id', videoId);

      if (error) {
        console.error('加载录音记录失败:', error);
        return;
      }

      const recordings: Record<number, string> = {};
      data?.forEach((record) => {
        recordings[record.subtitle_id] = record.audio_url;
      });
      setExistingRecordings(recordings);
    };

    if (isPracticeMode) {
      loadRecordings();
    }
  }, [isPracticeMode, videoId]);

  // 处理录音完成
  const handleRecordingComplete = (subtitleId: number, audioUrl: string) => {
    setExistingRecordings((prev) => ({
      ...prev,
      [subtitleId]: audioUrl,
    }));
  };

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
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-purple-100 py-2 z-20">
                  {/* 视频循环模式 */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">视频循环</div>
                  <button
                    onClick={() => {
                      onVideoLoopModeChange('single');
                      setShowLoopMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                      videoLoopMode === 'single' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-purple-50'
                    }`}
                  >
                    <span>单集播放</span>
                    {videoLoopMode === 'single' && <span className="text-purple-600">✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      onVideoLoopModeChange('loop');
                      setShowLoopMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                      videoLoopMode === 'loop' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-purple-50'
                    }`}
                  >
                    <span>单集循环</span>
                    {videoLoopMode === 'loop' && <span className="text-purple-600">✓</span>}
                  </button>

                  <div className="border-t border-gray-200 my-2"></div>

                  {/* 句子循环模式 */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">句子循环</div>
                  <button
                    onClick={() => {
                      onSentenceLoopModeChange('continuous');
                      setShowLoopMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                      sentenceLoopMode === 'continuous' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-purple-50'
                    }`}
                  >
                    <span>连续播放</span>
                    {sentenceLoopMode === 'continuous' && <span className="text-purple-600">✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      onSentenceLoopModeChange('single');
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                      sentenceLoopMode === 'single' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-purple-50'
                    }`}
                  >
                    <span>单句循环</span>
                    {sentenceLoopMode === 'single' && <span className="text-purple-600">✓</span>}
                  </button>

                  {/* 循环次数选择（仅在单句循环模式下显示） */}
                  {sentenceLoopMode === 'single' && (
                    <>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase mt-2">循环次数</div>
                      {[1, 2, 3, -1].map((count) => (
                        <button
                          key={count}
                          onClick={() => {
                            onLoopCountChange(count as LoopCount);
                            setShowLoopMenu(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                            loopCount === count ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-purple-50'
                          }`}
                        >
                          <span>{count === -1 ? '无限循环' : `${count} 次`}</span>
                          {loopCount === count && <span className="text-purple-600">✓</span>}
                        </button>
                      ))}

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* 自动下一句开关 */}
                      <button
                        onClick={() => {
                          onAutoNextSentenceChange(!autoNextSentence);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 transition-colors flex items-center justify-between"
                      >
                        <span>自动下一句</span>
                        <div className={`w-10 h-5 rounded-full transition-colors ${autoNextSentence ? 'bg-purple-600' : 'bg-gray-300'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${autoNextSentence ? 'ml-5' : 'ml-0.5'}`}></div>
                        </div>
                      </button>

                      {/* 当前循环次数显示 */}
                      {loopCount !== -1 && (
                        <div className="px-4 py-2 text-xs text-gray-500 bg-purple-50 mt-2">
                          当前循环：第 {currentLoopIndex + 1} / {loopCount} 次
                        </div>
                      )}
                      {loopCount === -1 && (
                        <div className="px-4 py-2 text-xs text-gray-500 bg-purple-50 mt-2">
                          当前循环：第 {currentLoopIndex + 1} 次
                        </div>
                      )}
                    </>
                  )}
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
                  <button
                    onClick={() => {
                      setIsPracticeMode(!isPracticeMode);
                      setShowPracticeMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 transition-colors flex items-center justify-between"
                  >
                    <span>口语练习</span>
                    {isPracticeMode && <span className="text-purple-600">✓</span>}
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

              {/* 口语练习录音控件 */}
              {isPracticeMode && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <AudioRecorder
                    videoId={videoId}
                    subtitleId={subtitle.id}
                    existingAudioUrl={existingRecordings[subtitle.id]}
                    onRecordingComplete={(audioUrl) => handleRecordingComplete(subtitle.id, audioUrl)}
                    subtitleStartTime={subtitle.startTime}
                    subtitleEndTime={subtitle.endTime}
                    onPlayOriginal={onPlayOriginal ? (startTime) => onPlayOriginal(startTime) : undefined}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
