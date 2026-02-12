'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Video {
  id: string;
  title: string;
}

interface Subtitle {
  id: string;
  sequence: number;
  start_time: number;
  end_time: number;
  text_en: string;
  text_zh: string;
}

export default function SubtitlesManagementPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = searchParams.get('video_id');

  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (videoId) {
      fetchVideoAndSubtitles(videoId);
    } else {
      setSelectedVideo(null);
      setSubtitles([]);
      setLoading(false);
    }
  }, [videoId]);

  const fetchVideos = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('videos')
        .select('id, title')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      setVideos(data || []);
    } catch (err) {
      console.error('获取视频列表失败:', err);
    }
  };

  const fetchVideoAndSubtitles = async (id: string) => {
    setLoading(true);
    try {
      const supabase = createClient();

      // 获取视频信息
      const { data: videoData } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();

      setSelectedVideo(videoData);

      // 获取字幕
      const { data: subtitlesData } = await supabase
        .from('subtitles')
        .select('*')
        .eq('video_id', id)
        .order('sequence', { ascending: true });

      setSubtitles(subtitlesData || []);
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoChange = (newVideoId: string) => {
    if (newVideoId) {
      router.push(`/admin/subtitles?video_id=${newVideoId}`);
    }
  };

  if (loading && videoId) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-9 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="mt-2 h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">字幕管理</h1>
        <p className="mt-2 text-gray-600">管理视频字幕</p>
      </div>

      {/* 视频选择 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择视频
        </label>
        <select
          value={videoId || ''}
          onChange={(e) => handleVideoChange(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="">请选择视频</option>
          {videos.map((video) => (
            <option key={video.id} value={video.id}>
              {video.title}
            </option>
          ))}
        </select>
      </div>

      {/* 字幕列表 */}
      {selectedVideo && (
        <div className="space-y-4">
          {/* 视频信息和操作 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedVideo.title}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {subtitles.length} 条字幕
                </p>
              </div>
              <Link
                href={`/admin/subtitles/upload?video_id=${videoId}`}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                上传字幕
              </Link>
            </div>
          </div>

          {/* 字幕表格 */}
          {subtitles.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        序号
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        时间范围
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        英文字幕
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        中文字幕
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {subtitles.map((subtitle) => (
                      <tr key={subtitle.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {subtitle.sequence}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {subtitle.start_time}s - {subtitle.end_time}s
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {subtitle.text_en || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {subtitle.text_zh || '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <Link
                            href={`/admin/subtitles/${subtitle.id}/edit`}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            编辑
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无字幕</h3>
              <p className="text-gray-600 mb-4">为这个视频上传字幕文件</p>
              <Link
                href={`/admin/subtitles/upload?video_id=${videoId}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                上传字幕
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 未选择视频提示 */}
      {!selectedVideo && !loading && (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">请选择视频</h3>
          <p className="text-gray-600">从上方下拉菜单中选择一个视频来管理其字幕</p>
        </div>
      )}
    </div>
  );
}
