'use client';

import { useState, useEffect, useRef } from 'react';
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
  seek_offset?: number;
  seek_offset_confirmed_value?: number | null;
  seek_offset_confirmed_at?: string | null;
}

export default function SubtitlesManagementPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const videoId = searchParams.get('video_id');

  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSubtitleId, setSavingSubtitleId] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopTimerRef = useRef<number | null>(null);

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

  // Ensure no audio keeps playing when switching videos / leaving the page.
  useEffect(() => {
    return () => {
      if (stopTimerRef.current) {
        window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
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

      setSubtitles(
        (subtitlesData || []).map((s: any) => ({
          ...s,
          start_time: Number(s.start_time),
          end_time: Number(s.end_time),
          seek_offset: Number.isFinite(Number(s.seek_offset)) ? Number(s.seek_offset) : 0,
          seek_offset_confirmed_value: Number.isFinite(Number(s.seek_offset_confirmed_value))
            ? Number(s.seek_offset_confirmed_value)
            : null,
          seek_offset_confirmed_at: s.seek_offset_confirmed_at ?? null,
        }))
      );
    } catch (err) {
      console.error('获取数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSeekOffsetLocal = (subtitleId: string, nextOffset: number) => {
    setSubtitles((prev) =>
      prev.map((s) =>
        s.id === subtitleId
          ? { ...s, seek_offset: Math.round(nextOffset * 1000) / 1000 }
          : s
      )
    );
  };

  const isSeekOffsetConfirmed = (s: Subtitle) => {
    const v = s.seek_offset_confirmed_value;
    const cur = s.seek_offset ?? 0;
    if (v === null || v === undefined) return false;
    return Math.abs(Number(v) - Number(cur)) < 0.0005;
  };

  const handleSaveSeekOffset = async (subtitleId: string) => {
    const target = subtitles.find((s) => s.id === subtitleId);
    if (!target) return;

    setSavingSubtitleId(subtitleId);
    try {
      const supabase = createClient();
      const nowIso = new Date().toISOString();
      const cur = target.seek_offset ?? 0;
      const { error } = await supabase
        .from('subtitles')
        .update({
          seek_offset: cur,
          // Saving implies "confirmed" per your workflow.
          seek_offset_confirmed_value: cur,
          seek_offset_confirmed_at: nowIso,
        })
        .eq('id', subtitleId);

      if (error) throw error;

      // Locally mark as confirmed.
      setSubtitles((prev) =>
        prev.map((s) =>
          s.id === subtitleId
            ? { ...s, seek_offset_confirmed_value: cur, seek_offset_confirmed_at: nowIso }
            : s
        )
      );
    } catch (err: any) {
      console.error('保存点击偏移失败:', err);
      alert(err?.message || '保存失败，请重试');
    } finally {
      setSavingSubtitleId(null);
    }
  };

  const stopAudition = () => {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleAudition = async (subtitle: Subtitle) => {
    setPlayError('');
    const video = videoRef.current;
    if (!video) {
      setPlayError('试听失败：未找到视频资源，请确认该视频存在 video_url。');
      return;
    }

    stopAudition();

    const offset = Number.isFinite(Number(subtitle.seek_offset)) ? Number(subtitle.seek_offset) : 0;
    const start = Number.isFinite(Number(subtitle.start_time)) ? Number(subtitle.start_time) : 0;
    const end = Number.isFinite(Number(subtitle.end_time)) ? Number(subtitle.end_time) : start + 5;

    // Play from (start + offset), but clamp to a safe range.
    const boundaryPad = 0.03;
    const target = Math.max(0, Math.min(start + offset, Math.max(0, end - boundaryPad)));
    const stopAt = Math.min(end, target + 4); // enough to verify the sentence start

    try {
      if (video.readyState < 1) {
        await new Promise<void>((resolve) => {
          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            resolve();
          };
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          // In case the browser starts loading lazily, touching `load()` helps some environments.
          video.load();
        });
      }

      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = target;
      });

      const p = video.play();
      if (p) await p;

      stopTimerRef.current = window.setTimeout(() => {
        if (!videoRef.current) return;
        videoRef.current.pause();
      }, Math.max(300, (stopAt - target) * 1000));
    } catch (err: any) {
      console.error('试听失败:', err);
      setPlayError('试听失败：请检查视频是否可访问（R2 跨域/范围请求）或浏览器是否阻止播放。');
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

            {/* Hidden video element for auditioning sentence audio */}
            {selectedVideo.video_url && (
              <video
                ref={videoRef}
                className="absolute w-0 h-0 opacity-0 pointer-events-none"
                preload="auto"
                playsInline
                src={
                  typeof selectedVideo.video_url === 'string' && selectedVideo.video_url.startsWith('http://')
                    ? selectedVideo.video_url.replace('http://', 'https://')
                    : selectedVideo.video_url
                }
              />
            )}

            {playError && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">{playError}</p>
              </div>
            )}
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
                        点击偏移
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        是否可用
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
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {(subtitle.seek_offset ?? 0).toFixed(1)}s
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {isSeekOffsetConfirmed(subtitle) ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              已确认
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                              未确认
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {subtitle.text_en || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {subtitle.text_zh || '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium">
                          <div className="flex flex-wrap gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => handleAudition(subtitle)}
                              className="px-3 py-1.5 text-xs rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-800"
                              title="试听该句（按当前偏移播放）"
                            >
                              试听
                            </button>

                            <button
                              type="button"
                              onClick={() => updateSeekOffsetLocal(subtitle.id, (subtitle.seek_offset ?? 0) - 0.1)}
                              className="px-2.5 py-1.5 text-xs rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-800"
                              title="提前 0.1 秒"
                            >
                              -0.1s
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSeekOffsetLocal(subtitle.id, (subtitle.seek_offset ?? 0) + 0.1)}
                              className="px-2.5 py-1.5 text-xs rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-800"
                              title="延后 0.1 秒"
                            >
                              +0.1s
                            </button>

                            <button
                              type="button"
                              onClick={() => updateSeekOffsetLocal(subtitle.id, -0.5)}
                              className="px-2.5 py-1.5 text-xs rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-800"
                              title="常用预设：回退 0.5 秒"
                            >
                              -0.5s
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSeekOffsetLocal(subtitle.id, -1.0)}
                              className="px-2.5 py-1.5 text-xs rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-800"
                              title="常用预设：回退 1.0 秒"
                            >
                              -1.0s
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSeekOffsetLocal(subtitle.id, 0)}
                              className="px-2.5 py-1.5 text-xs rounded-lg bg-white border border-gray-300 hover:bg-gray-50 text-gray-800"
                              title="重置为 0"
                            >
                              重置
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSaveSeekOffset(subtitle.id)}
                              className="px-3 py-1.5 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                              disabled={savingSubtitleId === subtitle.id}
                              title="保存该句点击偏移"
                            >
                              {savingSubtitleId === subtitle.id ? '保存中…' : '保存'}
                            </button>

                            <Link
                              href={`/admin/subtitles/${subtitle.id}/edit`}
                              className="px-3 py-1.5 text-xs rounded-lg text-purple-700 border border-purple-200 bg-purple-50 hover:bg-purple-100"
                              title="进入详情页编辑"
                            >
                              详情
                            </Link>
                          </div>
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
