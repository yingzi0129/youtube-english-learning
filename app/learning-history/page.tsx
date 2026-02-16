'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface WatchHistoryItem {
  id: string;
  video_id: string;
  progress_seconds: number;
  duration_seconds: number;
  progress_percentage: number;
  last_watched_at: string;
  video: {
    id: string;
    title: string;
    thumbnail_url: string;
    duration_minutes: number;
    creator_name: string;
  };
}

export default function LearningHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWatchHistory();
  }, []);

  const fetchWatchHistory = async () => {
    try {
      const supabase = createClient();

      // 获取当前用户
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      // 获取观看历史，关联视频信息
      const { data, error: historyError } = await supabase
        .from('watch_history')
        .select(`
          id,
          video_id,
          progress_seconds,
          duration_seconds,
          progress_percentage,
          last_watched_at,
          videos:video_id (
            id,
            title,
            thumbnail_url,
            duration_minutes,
            creator_name
          )
        `)
        .eq('user_id', user.id)
        .order('last_watched_at', { ascending: false });

      if (historyError) {
        console.error('获取观看历史错误:', historyError);
        setError('加载观看历史失败');
        return;
      }

      // 格式化数据
      const formattedHistory = data?.map((item: any) => ({
        id: item.id,
        video_id: item.video_id,
        progress_seconds: item.progress_seconds,
        duration_seconds: item.duration_seconds,
        progress_percentage: item.progress_percentage,
        last_watched_at: item.last_watched_at,
        video: item.videos,
      })) || [];

      setHistory(formattedHistory);
    } catch (err) {
      console.error('获取观看历史错误:', err);
      setError('加载观看历史失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  };

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  // 点击视频卡片，跳转到视频播放页面（带进度参数）
  const handleVideoClick = (item: WatchHistoryItem) => {
    router.push(`/videos/${item.video_id}?t=${item.progress_seconds}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-purple-50 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              学习记录
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {!error && history.length === 0 && (
          <div className="bg-white/90 backdrop-blur-md rounded-3xl p-12 text-center shadow-lg">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">暂无学习记录</h3>
            <p className="text-gray-600 mb-4">开始观看视频后，这里会显示你的学习记录</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:shadow-lg transition-all"
            >
              去看视频
            </button>
          </div>
        )}

        {!error && history.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => handleVideoClick(item)}
                className="bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-105"
              >
                {/* 缩略图 */}
                <div className="relative aspect-video bg-gray-200">
                  {item.video?.thumbnail_url ? (
                    <img
                      src={item.video.thumbnail_url}
                      alt={item.video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  {/* 进度条 */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                      style={{ width: `${item.progress_percentage}%` }}
                    ></div>
                  </div>

                  {/* 进度百分比标签 */}
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {Math.round(item.progress_percentage)}%
                  </div>
                </div>

                {/* 视频信息 */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                    {item.video?.title || '未知视频'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {item.video?.creator_name || '未知作者'}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>观看于 {formatDate(item.last_watched_at)}</span>
                    <span>{formatDuration(item.progress_seconds)} / {formatDuration(item.duration_seconds)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
