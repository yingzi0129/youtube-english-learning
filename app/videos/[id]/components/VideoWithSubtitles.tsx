'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import VideoPlayer from './VideoPlayer';
import SubtitlePanel from './SubtitlePanel';
import { updateWatchProgress, getWatchProgress } from '@/lib/watchProgress';

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

// 播放模式类型
export type VideoLoopMode = 'single' | 'loop'; // 单集播放 / 单集循环
export type SentenceLoopMode = 'continuous' | 'single'; // 连续播放 / 单句循环
export type LoopCount = 1 | 2 | 3 | -1; // 循环次数，-1 表示无限循环

export default function VideoWithSubtitles({ videoUrl, subtitles }: VideoWithSubtitlesProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const videoId = params.id as string;
  const [currentTime, setCurrentTime] = useState(0);
  const [seekToTime, setSeekToTime] = useState<number | undefined>(undefined);
  const [autoPlayOnSeek, setAutoPlayOnSeek] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasLoadedProgress = useRef(false);
  const currentTimeRef = useRef(0);
  const videoDurationRef = useRef(0);
  const lastSaveTimeRef = useRef(0);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 播放控制状态
  const [videoLoopMode, setVideoLoopMode] = useState<VideoLoopMode>('single');
  const [sentenceLoopMode, setSentenceLoopMode] = useState<SentenceLoopMode>('continuous');
  const [loopCount, setLoopCount] = useState<LoopCount>(1);
  const [currentLoopIndex, setCurrentLoopIndex] = useState(0);
  const [autoNextSentence, setAutoNextSentence] = useState(true);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number | null>(null);
  const sentenceLoopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取当前播放的句子索引
  useEffect(() => {
    const currentSubtitle = subtitles.findIndex(
      (sub) => currentTime >= sub.startTime && currentTime < sub.endTime
    );
    if (currentSubtitle !== -1 && currentSubtitle !== currentSentenceIndex) {
      setCurrentSentenceIndex(currentSubtitle);
      setCurrentLoopIndex(0); // 切换句子时重置循环计数
    }
  }, [currentTime, subtitles, currentSentenceIndex]);

  // 句子循环逻辑
  useEffect(() => {
    if (sentenceLoopMode === 'single' && currentSentenceIndex !== null && isPlaying) {
      const currentSubtitle = subtitles[currentSentenceIndex];
      if (!currentSubtitle) return;

      // 检查是否到达句子结尾
      if (currentTime >= currentSubtitle.endTime - 0.1) {
        // 检查是否需要继续循环
        const shouldLoop = loopCount === -1 || currentLoopIndex < loopCount - 1;

        if (shouldLoop) {
          // 继续循环当前句子
          setCurrentLoopIndex(prev => prev + 1);
          setSeekToTime(currentSubtitle.startTime);
          setTimeout(() => setSeekToTime(undefined), 100);
        } else if (autoNextSentence && currentSentenceIndex < subtitles.length - 1) {
          // 循环完成，自动播放下一句
          const nextSubtitle = subtitles[currentSentenceIndex + 1];
          setCurrentLoopIndex(0);
          setSeekToTime(nextSubtitle.startTime);
          setTimeout(() => setSeekToTime(undefined), 100);
        } else {
          // 循环完成，暂停播放
          setIsPlaying(false);
        }
      }
    }
  }, [currentTime, sentenceLoopMode, currentSentenceIndex, loopCount, currentLoopIndex, autoNextSentence, subtitles, isPlaying]);

  // 视频循环逻辑
  useEffect(() => {
    if (videoLoopMode === 'loop' && videoDuration > 0 && currentTime >= videoDuration - 0.5) {
      // 视频结束，重新播放
      setSeekToTime(0);
      setTimeout(() => setSeekToTime(undefined), 100);
    }
  }, [currentTime, videoDuration, videoLoopMode]);

  // 加载上次观看进度
  useEffect(() => {
    const loadProgress = async () => {
      if (hasLoadedProgress.current) return;
      hasLoadedProgress.current = true;

      // 检查 URL 参数中是否有起始时间
      const urlTime = searchParams.get('t');
      if (urlTime) {
        const time = parseInt(urlTime);
        if (!isNaN(time)) {
          setSeekToTime(time);
          setTimeout(() => setSeekToTime(undefined), 100);
          return;
        }
      }

      // 否则从数据库获取上次观看进度
      const progress = await getWatchProgress(videoId);
      if (progress > 0) {
        setSeekToTime(progress);
        setTimeout(() => setSeekToTime(undefined), 100);
      }
    };

    loadProgress();
  }, [videoId, searchParams]);

  // 处理视频时间更新
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    currentTimeRef.current = time;
  };

  // 处理视频时长变化
  const handleDurationChange = (duration: number) => {
    setVideoDuration(duration);
    videoDurationRef.current = duration;
  };

  // 处理播放状态变化
  const handlePlayStateChange = (playing: boolean) => {
    setIsPlaying(playing);
  };

  // 保存观看进度（带防抖）
  const saveProgress = () => {
    const now = Date.now();
    const currentTime = currentTimeRef.current;
    const duration = videoDurationRef.current;

    // 防抖：距离上次保存不足 2 秒则跳过
    if (now - lastSaveTimeRef.current < 2000) {
      return;
    }

    if (currentTime > 0 && duration > 0) {
      lastSaveTimeRef.current = now;
      updateWatchProgress(videoId, currentTime, duration);
    }
  };

  // 视频暂停时保存进度
  const handlePause = () => {
    saveProgress();
  };

  // 每 30 秒自动保存一次进度（兜底机制）
  useEffect(() => {
    saveTimerRef.current = setInterval(() => {
      if (isPlaying) {
        saveProgress();
      }
    }, 30000); // 30 秒

    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
      }
    };
  }, [isPlaying, videoId]);

  // 页面失去焦点时保存进度
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveProgress();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [videoId]);

  // 页面卸载前保存进度（使用 sendBeacon 确保发送成功）
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentTime = currentTimeRef.current;
      const duration = videoDurationRef.current;

      if (currentTime > 0 && duration > 0) {
        // 使用 sendBeacon 发送数据，即使页面关闭也能完成
        const data = JSON.stringify({
          videoId,
          currentTime,
          duration,
        });

        // 尝试使用 sendBeacon，如果不支持则同步保存
        if (navigator.sendBeacon) {
          const blob = new Blob([data], { type: 'application/json' });
          navigator.sendBeacon('/api/save-progress', blob);
        } else {
          // 降级方案：同步保存
          updateWatchProgress(videoId, currentTime, duration);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 组件卸载时也保存一次
      saveProgress();
    };
  }, [videoId]);

  // 处理字幕点击跳转
  const handleSeek = (time: number, autoPlay: boolean = false) => {
    setSeekToTime(time);
    setAutoPlayOnSeek(autoPlay);
    // 跳转时保存进度
    saveProgress();
    // 重置 seekToTime，以便下次点击同一字幕时也能触发跳转
    setTimeout(() => {
      setSeekToTime(undefined);
      setAutoPlayOnSeek(false);
    }, 100);
  };

  // 处理播放原文
  const handlePlayOriginal = (startTime: number) => {
    handleSeek(startTime, true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 左侧：视频播放器 */}
      <div className="lg:col-span-2">
        <VideoPlayer
          videoUrl={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          onPlayStateChange={handlePlayStateChange}
          onPause={handlePause}
          seekToTime={seekToTime}
          autoPlayOnSeek={autoPlayOnSeek}
        />
      </div>

      {/* 右侧：字幕面板 */}
      <div className="lg:col-span-1">
        <SubtitlePanel
          subtitles={subtitles}
          currentTime={currentTime}
          onSeek={handleSeek}
          onPlayOriginal={handlePlayOriginal}
          videoLoopMode={videoLoopMode}
          onVideoLoopModeChange={setVideoLoopMode}
          sentenceLoopMode={sentenceLoopMode}
          onSentenceLoopModeChange={setSentenceLoopMode}
          loopCount={loopCount}
          onLoopCountChange={setLoopCount}
          currentLoopIndex={currentLoopIndex}
          autoNextSentence={autoNextSentence}
          onAutoNextSentenceChange={setAutoNextSentence}
          videoId={videoId}
        />
      </div>
    </div>
  );
}
