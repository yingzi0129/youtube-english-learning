'use client';

import React from 'react';
import FavoriteButton from '@/app/components/FavoriteButton';

interface SubtitleItemProps {
  subtitle: {
    id: number;
    startTime: number;
    endTime: number;
    text: string;
    translation: string;
    annotations?: any[];
  };
  videoId: string;
  subtitleDbId?: string; // 数据库中的字幕 ID（UUID）
  isActive: boolean;
  subtitleMode: 'bilingual' | 'chinese' | 'english';
  fontSize: number;
  isPracticeMode?: boolean;
  existingRecording?: string;
  themeMode?: 'light' | 'dark';
  onClick: () => void;
  onPlayOriginal?: () => void;
  onRecordingComplete?: (audioUrl: string) => void;
  renderAnnotatedEnglish?: (id: number, text: string, annotations?: any[]) => React.ReactNode;
  AudioRecorderComponent?: React.ComponentType<any>;
}

export default function SubtitleItem({
  subtitle,
  videoId,
  subtitleDbId,
  isActive,
  subtitleMode,
  fontSize,
  isPracticeMode = false,
  existingRecording,
  themeMode = 'light',
  onClick,
  onPlayOriginal,
  onRecordingComplete,
  renderAnnotatedEnglish,
  AudioRecorderComponent,
}: SubtitleItemProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      data-subtitle-id={subtitle.id}
      className={`
        p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer relative
        ${
          isActive
            ? 'bg-yellow-50 border-yellow-400 shadow-md'
            : themeMode === 'dark'
            ? 'bg-gray-800 border-gray-700 hover:border-purple-500 hover:shadow-sm'
            : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm'
        }
      `}
      onClick={onClick}
    >
      {/* 时间戳和收藏按钮 */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`
              text-xs font-bold px-2 py-1 rounded-full
              ${isActive ? 'bg-yellow-200 text-yellow-800' : themeMode === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}
            `}
          >
            {formatTime(subtitle.startTime)}
          </span>
          {isActive && (
            <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              播放中
            </span>
          )}
        </div>
        {subtitleDbId && (
          <div onClick={(e) => e.stopPropagation()}>
            <FavoriteButton
              type="subtitle_segment"
              videoId={videoId}
              itemId={subtitleDbId}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* 英文字幕 */}
      {(subtitleMode === 'bilingual' || subtitleMode === 'english') && (
        <p
          className={`
            leading-relaxed font-semibold
            ${subtitleMode === 'bilingual' ? 'mb-2' : ''}
            ${isActive ? 'text-gray-900' : themeMode === 'dark' ? 'text-gray-200' : 'text-gray-700'}
          `}
          style={{ fontSize: `${fontSize}px` }}
        >
          {renderAnnotatedEnglish
            ? renderAnnotatedEnglish(subtitle.id, subtitle.text, subtitle.annotations)
            : subtitle.text}
        </p>
      )}

      {/* 中文翻译 */}
      {(subtitleMode === 'bilingual' || subtitleMode === 'chinese') && (
        <p
          className={`
            leading-relaxed
            ${subtitleMode === 'chinese' ? 'font-semibold' : ''}
            ${isActive ? 'text-gray-700' : themeMode === 'dark' ? 'text-gray-400' : 'text-gray-600'}
          `}
          style={{ fontSize: `${subtitleMode === 'bilingual' ? fontSize : fontSize - 2}px` }}
        >
          {subtitle.translation}
        </p>
      )}

      {/* 口语练习录音控件 */}
      {isPracticeMode && AudioRecorderComponent && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <AudioRecorderComponent
            videoId={videoId}
            subtitleId={subtitle.id}
            existingAudioUrl={existingRecording}
            onRecordingComplete={onRecordingComplete}
            subtitleStartTime={subtitle.startTime}
            subtitleEndTime={subtitle.endTime}
            onPlayOriginal={onPlayOriginal}
          />
        </div>
      )}
    </div>
  );
}
