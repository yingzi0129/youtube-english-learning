'use client';

import { useState } from 'react';
import VideoPlayer from './VideoPlayer';
import SubtitlePanel from './SubtitlePanel';

interface VideoWithSubtitlesProps {
  videoUrl: string;
  subtitles: Array<{
    id: number;
    startTime: number;
    endTime: number;
    text: string;
    translation: string;
  }>;
}

export default function VideoWithSubtitles({ videoUrl, subtitles }: VideoWithSubtitlesProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [seekToTime, setSeekToTime] = useState<number | undefined>(undefined);

  // 处理视频时间更新
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  // 处理字幕点击跳转
  const handleSeek = (time: number) => {
    setSeekToTime(time);
    // 重置 seekToTime，以便下次点击同一字幕时也能触发跳转
    setTimeout(() => setSeekToTime(undefined), 100);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧：视频播放器 */}
      <div className="lg:col-span-2">
        <VideoPlayer
          videoUrl={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          seekToTime={seekToTime}
        />
      </div>

      {/* 右侧：字幕面板 */}
      <div className="lg:col-span-1">
        <SubtitlePanel
          subtitles={subtitles}
          currentTime={currentTime}
          onSeek={handleSeek}
        />
      </div>
    </div>
  );
}
