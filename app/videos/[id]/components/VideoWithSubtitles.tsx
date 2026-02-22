'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import VideoPlayer, { type VideoPlayerRef } from './VideoPlayer';
import SubtitlePanel from './SubtitlePanel';
import MobileBottomControls from './MobileBottomControls';
import { updateWatchProgress, getWatchProgress } from '@/lib/watchProgress';

interface VideoWithSubtitlesProps {
  videoUrl: string;
  subtitles: Array<{
    id: number;
    startTime: number;
    endTime: number;
    text: string;
    translation: string;
    seekOffset?: number;
    annotations?: Array<{
      id: string;
      type?: 'word' | 'phrase';
      text: string;
      start: number;
      end: number;
      phonetic?: string;
      meaning?: string;
      helperSentence?: string;
    }>;
  }>;
}

// 播放模式类型
export type VideoLoopMode = 'single' | 'loop'; // 单集播放 / 单集循环
export type SentenceLoopMode = 'continuous' | 'single'; // 连续播放 / 单句循环
export type LoopCount = 1 | 2 | 3 | -1; // 循环次数，-1 表示无限循环
export type SubtitleMode = 'bilingual' | 'chinese' | 'english'; // 字幕显示模式
export type ThemeMode = 'light' | 'dark'; // 主题模式

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

  // 移动端控制状态
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('bilingual');
  const [fontSize, setFontSize] = useState(16);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [isClozeMode, setIsClozeMode] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const videoPlayerRef = useRef<VideoPlayerRef | null>(null);
  const [mobileStickyTop, setMobileStickyTop] = useState<number>(0);

  // Mobile: keep the sticky video right below the page header (no gap where subtitles can slide into).
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('[data-video-page-header="true"]');
    if (!header) return;

    // Use offsetHeight (integer) to avoid 0.5px oscillation on mobile Safari during scroll/URL-bar resize.
    const update = () => {
      const h = header.offsetHeight || 0;
      setMobileStickyTop((prev) => {
        const next = Math.max(0, h);
        return prev === next ? prev : next;
      });
    };

    update();

    // Prefer observing the header itself (instead of window resize) to avoid jitter during scroll.
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update());
      ro.observe(header);
    } else {
      window.addEventListener('resize', update);
    }

    // Orientation change can affect layout without reliably triggering ResizeObserver in some browsers.
    window.addEventListener('orientationchange', update);

    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
    };
  }, []);

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

  // Compute a seek target for a subtitle click.
  // Goal: match "sentence starts" even when exported subtitle start_time is slightly late,
  // while avoiding pulling audio from the previous subtitle when there's no gap.
  const getSmartSeekTimeForSubtitle = (subtitleId: number) => {
    const index = subtitles.findIndex((s) => s.id === subtitleId);
    if (index === -1) return 0;

    const sub = subtitles[index];
    const prev = index > 0 ? subtitles[index - 1] : null;

    const manualOffset = Number.isFinite(Number(sub.seekOffset)) ? Number(sub.seekOffset) : 0;

    // Small padding to avoid landing exactly on boundaries.
    const boundaryPad = 0.03;

    // Default tiny backtrack to counter slight lateness / keyframe snapping.
    const baseBack = 0.12;

    // If there's a real gap, we can safely backtrack more (up to 1s) into the gap.
    const gapBackThreshold = 0.35;
    const maxAutoBack = 1.0;

    let target = sub.startTime;

    if (manualOffset !== 0) {
      target = sub.startTime + manualOffset;
    } else {
      let back = baseBack;
      if (prev) {
        const gap = sub.startTime - prev.endTime;
        if (gap >= gapBackThreshold) {
          back = Math.min(maxAutoBack, Math.max(0, gap - boundaryPad));
        } else {
          // Only backtrack within the gap (if any), otherwise don't auto-backtrack.
          back = Math.min(back, Math.max(0, gap - boundaryPad));
        }
      }
      target = sub.startTime - back;
    }

    // Don't seek before the previous subtitle ends unless user explicitly overrides via seekOffset.
    if (manualOffset === 0 && prev) {
      target = Math.max(target, prev.endTime + boundaryPad);
    }

    // Clamp to valid time range.
    target = Math.max(0, target);
    // Avoid seeking beyond the subtitle end (very short subtitles).
    if (sub.endTime > sub.startTime) {
      target = Math.min(target, Math.max(0, sub.endTime - boundaryPad));
    }

    return target;
  };

  // Subtitle click: seek without forcing autoplay (video keeps current play/pause state).
  const handleSeekToSubtitle = (subtitleId: number) => {
    const time = getSmartSeekTimeForSubtitle(subtitleId);
    handleSeek(time, false);
  };

  // Play original: seek and force autoplay.
  const handlePlayOriginal = (subtitleId: number) => {
    const time = getSmartSeekTimeForSubtitle(subtitleId);
    handleSeek(time, true);
  };

  // 处理播放/暂停切换（移动端控制栏使用）
  const handlePlayPause = () => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.togglePlayPause();
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    videoPlayerRef.current?.setPlaybackRate(rate);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 pb-24 lg:pb-0">
        {/* 左侧：视频播放器 */}
        {/* Mobile: keep the video visible while scrolling the subtitle list (page scroll). */}
        <div
          data-sticky-video="true"
          className="lg:col-span-2 sticky z-30 lg:static"
          style={{ top: mobileStickyTop, transform: 'translateZ(0)', willChange: 'transform' }}
        >
          <VideoPlayer
            ref={videoPlayerRef}
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
            onSeekToSubtitle={handleSeekToSubtitle}
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
            subtitleMode={subtitleMode}
            onSubtitleModeChange={setSubtitleMode}
            fontSize={fontSize}
            themeMode={themeMode}
            isPracticeMode={isPracticeMode}
            onPracticeModeChange={setIsPracticeMode}
            isClozeMode={isClozeMode}
            onClozeModeChange={setIsClozeMode}
          />
        </div>
      </div>

      {/* 移动端底部控制栏 */}
      <MobileBottomControls
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        subtitleMode={subtitleMode}
        onSubtitleModeChange={setSubtitleMode}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        playbackRate={playbackRate}
        onPlaybackRateChange={handlePlaybackRateChange}
        videoLoopMode={videoLoopMode}
        onVideoLoopModeChange={setVideoLoopMode}
        sentenceLoopMode={sentenceLoopMode}
        onSentenceLoopModeChange={setSentenceLoopMode}
        loopCount={loopCount}
        onLoopCountChange={setLoopCount}
        autoNextSentence={autoNextSentence}
        onAutoNextSentenceChange={setAutoNextSentence}
        currentLoopIndex={currentLoopIndex}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
        isPracticeMode={isPracticeMode}
        onPracticeModeChange={setIsPracticeMode}
      />
    </>
  );
}
