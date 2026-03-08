'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAdminToast } from '../components/AdminToastProvider';

interface Video {
  id: string;
  title: string;
  description: string;
  video_url?: string | null;
  thumbnail_url: string;
  creator_name: string;
  difficulty: string;
  duration_minutes: number;
  is_deleted: boolean;
  published_at: string;
  primary_storage?: 'cos' | null;
  storage_sync_status?: 'pending' | 'synced' | 'failed' | null;
  storage_sync_error?: string | null;
  video_url_cos?: string | null;
  thumbnail_url_cos?: string | null;
}

export default function VideosManagementPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingMainland, setTestingMainland] = useState(false);
  const { showToast } = useAdminToast();

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const backfillCos = async (videoId?: string) => {
    setBackfillLoading(true);
    setBackfillMessage('');
    try {
      const response = await fetch('/api/admin/videos/backfill-cos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoId ? { videoId } : {}),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || '补齐失败');
      }
      if (videoId) {
        const message = '已触发补齐任务';
        setBackfillMessage(message);
        showToast('success', message);
      } else {
        const message = `处理 ${result.processed} 条，成功 ${result.successCount} 条，失败 ${result.failedCount} 条`;
        setBackfillMessage(message);
        showToast('success', message);
      }
      await fetchVideos();
    } catch (err: any) {
      const message = err.message || '补齐失败';
      setBackfillMessage(message);
      showToast('error', message);
    } finally {
      setBackfillLoading(false);
    }
  };

  const needsCosBackfill = (video: Video) => {
    const needVideo = !video.video_url_cos && video.video_url;
    const needThumb = !video.thumbnail_url_cos && video.thumbnail_url;
    return Boolean(needVideo || needThumb);
  };

  const testMainlandRoute = async () => {
    setTestingMainland(true);
    try {
      const response = await fetch('/api/videos', {
        headers: {
          'x-geo-country': 'CN',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || '测试失败');
      }
      const first = (data?.videos || []).find((item: any) => item?.videoUrl) || null;
      if (!first?.videoUrl) {
        showToast('info', '没有可测试的视频地址');
        return;
      }
      const host = (() => {
        try {
          return new URL(first.videoUrl).host;
        } catch {
          return '';
        }
      })();
      if (host.includes('myqcloud.com') || host.includes('cos.')) {
        showToast('success', `大陆请求走 COS：${host}`);
      } else {
        showToast('error', `大陆请求未走 COS：${host || '未知地址'}`);
      }
    } catch (err: any) {
      showToast('error', err?.message || '测试失败');
    } finally {
      setTestingMainland(false);
    }
  };

  const handleDelete = async (video: Video) => {
    const confirmed = window.confirm(`确定要彻底删除「${video.title}」吗？此操作不可恢复。`);
    if (!confirmed) return;
    const input = window.prompt('请输入 DELETE 以确认彻底删除');
    if (input !== 'DELETE') {
      showToast('error', '已取消：未输入 DELETE');
      return;
    }

    setDeletingId(video.id);
    try {
      const response = await fetch('/api/admin/videos/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || '删除失败');
      }
      showToast('success', '删除成功');
      await fetchVideos();
    } catch (err: any) {
      const message = err?.message || '删除失败';
      showToast('error', message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-9 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="mt-2 h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="bg-white rounded-xl p-8 border border-gray-200">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-20 h-12 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-64 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">视频管理</h1>
          <p className="mt-2 text-gray-600">管理所有学习视频</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => backfillCos()}
            disabled={backfillLoading}
            className="px-4 py-2 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-60"
          >
            {backfillLoading ? '补齐中...' : '一键补齐 COS'}
          </button>
          <button
            type="button"
            onClick={testMainlandRoute}
            disabled={testingMainland}
            className="px-4 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-60"
          >
            {testingMainland ? '测试中...' : '测试大陆走 COS'}
          </button>
          <Link
            href="/admin/videos/new"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加视频
          </Link>
        </div>
      </div>

      {backfillMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">{backfillMessage}</p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">加载视频失败：{error}</p>
        </div>
      )}

      {/* 视频列表 */}
      {!error && videos.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无视频</h3>
          <p className="text-gray-600 mb-4">开始添加您的第一个学习视频</p>
          <Link
            href="/admin/videos/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            添加视频
          </Link>
        </div>
      )}

      {/* 视频表格 */}
      {!error && videos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    视频信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    博主
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    难度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时长
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    主存储
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    同步状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    发布日期
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {videos.map((video) => (
                  <tr key={video.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={video.thumbnail_url || '/placeholder-video.jpg'}
                          alt={video.title}
                          className="w-20 h-12 object-cover rounded"
                        />
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 truncate">{video.title}</p>
                          <p className="text-sm text-gray-500 truncate">{video.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{video.creator_name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          video.difficulty === '初级'
                            ? 'bg-green-100 text-green-800'
                            : video.difficulty === '中级'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {video.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {video.duration_minutes} 分钟
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          video.is_deleted ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {video.is_deleted ? '已删除' : '正常'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {video.primary_storage === 'cos' ? 'COS' : '未知'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          video.storage_sync_status === 'synced'
                            ? 'bg-green-100 text-green-800'
                            : video.storage_sync_status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {video.storage_sync_status === 'synced'
                          ? '已同步'
                          : video.storage_sync_status === 'failed'
                          ? '同步失败'
                          : '同步中'}
                      </span>
                      {video.storage_sync_status === 'failed' && video.storage_sync_error && (
                        <p className="text-xs text-red-600 mt-1 line-clamp-2">
                          {video.storage_sync_error}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(video.published_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {needsCosBackfill(video) && (
                          <button
                            type="button"
                            onClick={() => backfillCos(video.id)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            补齐 COS
                          </button>
                        )}
                        <Link
                          href={`/admin/videos/${video.id}/edit`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          编辑
                        </Link>
                        <Link
                          href={`/admin/subtitles?video_id=${video.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          字幕
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(video)}
                          disabled={deletingId === video.id}
                          className="text-red-600 hover:text-red-800 disabled:opacity-60"
                        >
                          {deletingId === video.id ? '删除中...' : '删除'}
                        </button>
                        <Link
                          href={`/videos/${video.id}`}
                          target="_blank"
                          className="text-gray-600 hover:text-gray-900"
                        >
                          预览
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
