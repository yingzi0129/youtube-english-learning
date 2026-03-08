'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
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
        throw new Error(result?.error || '琛ラ綈澶辫触');
      }
      if (videoId) {
        const message = '宸茶Е鍙戣ˉ榻愪换鍔?;
        setBackfillMessage(message);
        showToast('success', message);
      } else {
        const message = `澶勭悊 ${result.processed} 鏉★紝鎴愬姛 ${result.successCount} 鏉★紝澶辫触 ${result.failedCount} 鏉;
        setBackfillMessage(message);
        showToast('success', message);
      }
      await fetchVideos();
    } catch (err: any) {
      const message = err.message || '琛ラ綈澶辫触';
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
        throw new Error(data?.error || '娴嬭瘯澶辫触');
      }
      const first = (data?.videos || []).find((item: any) => item?.videoUrl) || null;
      if (!first?.videoUrl) {
        showToast('info', '娌℃湁鍙祴璇曠殑瑙嗛鍦板潃');
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
        showToast('success', `澶ч檰璇锋眰璧?COS锛?{host}`);
      } else {
        showToast('error', `澶ч檰璇锋眰鏈蛋 COS锛?{host || '鏈煡鍦板潃'}`);
      }
    } catch (err: any) {
      showToast('error', err?.message || '娴嬭瘯澶辫触');
    } finally {
      setTestingMainland(false);
    }
  };

  const handleDelete = async (video: Video) => {
    const confirmed = window.confirm(`纭畾瑕佸交搴曞垹闄も€?{video.title}鈥濓紵姝ゆ搷浣滀笉鍙仮澶嶃€俙);
    if (!confirmed) return;
    const input = window.prompt('璇疯緭鍏?DELETE 浠ョ‘璁ゅ交搴曞垹闄?);
    if (input !== 'DELETE') {
      showToast('error', '宸插彇娑堬細鏈緭鍏?DELETE');
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
        throw new Error(result?.error || '鍒犻櫎澶辫触');
      }
      showToast('success', '鍒犻櫎鎴愬姛');
      await fetchVideos();
    } catch (err: any) {
      const message = err?.message || '鍒犻櫎澶辫触';
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
      {/* 椤甸潰鏍囬鍜屾搷浣?*/}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">瑙嗛绠＄悊</h1>
          <p className="mt-2 text-gray-600">绠＄悊鎵€鏈夊涔犺棰?/p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => backfillCos()}
            disabled={backfillLoading}
            className="px-4 py-2 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-60"
          >
            {backfillLoading ? '琛ラ綈涓?..' : '涓€閿ˉ榻怌OS'}
          </button>
          <button
            type="button"
            onClick={testMainlandRoute}
            disabled={testingMainland}
            className="px-4 py-2 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-60"
          >
            {testingMainland ? '娴嬭瘯涓?..' : '娴嬭瘯澶ч檰璧癈OS'}
          </button>
          <Link
            href="/admin/videos/new"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            娣诲姞瑙嗛
          </Link>
        </div>
      </div>

      {backfillMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">{backfillMessage}</p>
        </div>
      )}

      {/* 閿欒鎻愮ず */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">鍔犺浇瑙嗛澶辫触: {error}</p>
        </div>
      )}

      {/* 瑙嗛鍒楄〃 */}
      {!error && videos.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">鏆傛棤瑙嗛</h3>
          <p className="text-gray-600 mb-4">寮€濮嬫坊鍔犳偍鐨勭涓€涓涔犺棰?/p>
          <Link
            href="/admin/videos/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            娣诲姞瑙嗛
          </Link>
        </div>
      )}

      {/* 瑙嗛琛ㄦ牸 */}
      {!error && videos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    瑙嗛淇℃伅
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    鍗氫富
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    闅惧害
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    鏃堕暱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    鐘舵€?                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    涓诲瓨鍌?                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    鍚屾鐘舵€?                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    鍙戝竷鏃ユ湡
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    鎿嶄綔
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
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {video.creator_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        video.difficulty === '鍒濈骇' ? 'bg-green-100 text-green-800' :
                        video.difficulty === '涓骇' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {video.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {video.duration_minutes}鍒嗛挓
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        video.is_deleted ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {video.is_deleted ? '宸插垹闄? : '姝ｅ父'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {video.primary_storage === 'cos' ? 'COS' : '未知'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        video.storage_sync_status === 'synced'
                          ? 'bg-green-100 text-green-800'
                          : video.storage_sync_status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {video.storage_sync_status === 'synced'
                          ? '宸插弻瀛?
                          : video.storage_sync_status === 'failed'
                          ? '鍚屾澶辫触'
                          : '鍚屾涓?}
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
                            琛ラ綈COS
                          </button>
                        )}
                        <Link
                          href={`/admin/videos/${video.id}/edit`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          缂栬緫
                        </Link>
                        <Link
                          href={`/admin/subtitles?video_id=${video.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          瀛楀箷
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(video)}
                          disabled={deletingId === video.id}
                          className="text-red-600 hover:text-red-800 disabled:opacity-60"
                        >
                          {deletingId === video.id ? '鍒犻櫎涓?..' : '鍒犻櫎'}
                        </button>
                        <Link
                          href={`/videos/${video.id}`}
                          target="_blank"
                          className="text-gray-600 hover:text-gray-900"
                        >
                          棰勮
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
