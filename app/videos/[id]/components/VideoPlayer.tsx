'use client';

import React, { useState, useEffect, useRef } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  onTimeUpdate?: (time: number) => void;
  seekToTime?: number;
}

export default function VideoPlayer({ videoUrl, onTimeUpdate, seekToTime }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // 监听视频时间更新
  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  // 监听 seekToTime 变化，跳转到指定时间
  useEffect(() => {
    if (videoRef.current && seekToTime !== undefined) {
      videoRef.current.currentTime = seekToTime;
    }
  }, [seekToTime]);

  // 调试：输出接收到的视频 URL
  useEffect(() => {
    console.log('VideoPlayer 接收到的 URL:', videoUrl);
    console.log('URL 类型:', typeof videoUrl);
    console.log('URL 是否为空:', !videoUrl);
  }, [videoUrl]);

  // 点击外部关闭倍速菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSpeedMenu) {
        setShowSpeedMenu(false);
      }
    };

    if (showSpeedMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showSpeedMenu]);

  const handleLoadedData = () => {
    console.log('视频加载成功');
    setIsLoading(false);
    setError(null);
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setIsLoading(false);
    setError('视频加载失败，请检查视频文件是否存在或格式是否正确');
    console.error('视频加载错误:', e);
    console.error('视频 URL:', videoUrl);
    const videoElement = e.currentTarget;
    console.error('视频元素错误代码:', videoElement.error?.code);
    console.error('视频元素错误信息:', videoElement.error?.message);
  };

  // 快退 5 秒
  const handleRewind = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  };

  // 快进 5 秒
  const handleForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration,
        videoRef.current.currentTime + 5
      );
    }
  };

  // 改变播放速度
  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackRate(speed);
      setShowSpeedMenu(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-purple-100/50">
      {/* 视频播放器容器 */}
      <div className="relative aspect-video bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-white text-lg">加载中...</div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center px-4">
              <div className="text-red-400 text-lg mb-2">{error}</div>
              <div className="text-gray-400 text-sm break-all">URL: {videoUrl}</div>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className="w-full h-full"
          controls
          controlsList="nodownload"
          onLoadedData={handleLoadedData}
          onError={handleError}
          onTimeUpdate={handleTimeUpdate}
        >
          <source src={videoUrl} type="video/mp4" />
          您的浏览器不支持视频播放。
        </video>
      </div>

      {/* 自定义控制面板 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-t border-purple-100">
        <div className="flex items-center justify-between gap-4">
          {/* 左侧：快退/快进按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRewind}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-purple-50 text-purple-600 rounded-xl transition-colors shadow-sm border border-purple-100"
              title="后退 5 秒"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
              <span className="text-sm font-medium">-5s</span>
            </button>

            <button
              onClick={handleForward}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-purple-50 text-purple-600 rounded-xl transition-colors shadow-sm border border-purple-100"
              title="快进 5 秒"
            >
              <span className="text-sm font-medium">+5s</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
            </button>
          </div>

          {/* 右侧：倍速选择 */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-purple-50 text-purple-600 rounded-xl transition-colors shadow-sm border border-purple-100"
              title="播放速度"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-medium">{playbackRate}x</span>
            </button>

            {/* 倍速菜单 */}
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-lg border border-purple-100 py-2 min-w-[120px] z-20">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                      playbackRate === speed
                        ? 'bg-purple-50 text-purple-600 font-medium'
                        : 'text-gray-700 hover:bg-purple-50'
                    }`}
                  >
                    {speed}x {speed === 1 && '(正常)'}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
