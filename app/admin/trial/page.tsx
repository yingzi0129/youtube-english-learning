'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type TrialSettings = {
  notice_title: string;
  notice_content: string;
  is_active: boolean;
};

type VideoItem = {
  id: string;
  title: string;
  creator_name: string;
  thumbnail_url: string;
  is_trial: boolean;
  published_at: string;
};

export default function TrialManagementPage() {
  const [settings, setSettings] = useState<TrialSettings>({
    notice_title: '',
    notice_content: '',
    is_active: true,
  });
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();

      const { data: settingsData, error: settingsError } = await supabase
        .from('trial_page_settings')
        .select('notice_title, notice_content, is_active')
        .eq('key', 'default')
        .limit(1);

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      if (settingsData && settingsData.length > 0) {
        setSettings({
          notice_title: settingsData[0].notice_title || '',
          notice_content: settingsData[0].notice_content || '',
          is_active: settingsData[0].is_active ?? true,
        });
      }

      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('id, title, creator_name, thumbnail_url, is_trial, published_at')
        .eq('is_deleted', false)
        .order('published_at', { ascending: false });

      if (videosError) throw videosError;
      setVideos((videosData || []) as VideoItem[]);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: saveError } = await supabase
        .from('trial_page_settings')
        .upsert(
          {
            key: 'default',
            notice_title: settings.notice_title,
            notice_content: settings.notice_content,
            is_active: settings.is_active,
          },
          { onConflict: 'key' }
        );

      if (saveError) throw saveError;
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const toggleTrialVideo = async (video: VideoItem) => {
    const nextValue = !video.is_trial;
    setVideos((prev) =>
      prev.map((item) => (item.id === video.id ? { ...item, is_trial: nextValue } : item))
    );

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('videos')
        .update({ is_trial: nextValue })
        .eq('id', video.id);
      if (updateError) throw updateError;
    } catch (err: any) {
      setVideos((prev) =>
        prev.map((item) => (item.id === video.id ? { ...item, is_trial: video.is_trial } : item))
      );
      setError(err.message || '更新失败');
    }
  };

  const filteredVideos = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return videos;
    return videos.filter((video) =>
      `${video.title} ${video.creator_name}`.toLowerCase().includes(keyword)
    );
  }, [videos, search]);

  const selectedCount = useMemo(
    () => videos.filter((video) => video.is_trial).length,
    [videos]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">试用页管理</h1>
        <p className="mt-2 text-gray-600">配置试用页提示内容与试用视频范围</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">试用页提示内容</h2>
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
            <input
              type="text"
              value={settings.notice_title}
              onChange={(e) => setSettings({ ...settings, notice_title: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="例如：试用用户说明"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
            <textarea
              value={settings.notice_content}
              onChange={(e) => setSettings({ ...settings, notice_content: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={4}
              placeholder="这里填写试用提示内容，支持换行"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.is_active}
              onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
              className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
            />
            在试用页显示该提示
          </label>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-60"
          >
            {saving ? '保存中...' : '保存提示内容'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">试用视频选择</h2>
            <p className="text-sm text-gray-500 mt-1">
              已选择 {selectedCount} 条试用视频
            </p>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="搜索视频标题或博主"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-left">
              <tr>
                <th className="px-4 py-3">试用</th>
                <th className="px-4 py-3">视频</th>
                <th className="px-4 py-3">博主</th>
                <th className="px-4 py-3">发布时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVideos.map((video) => (
                <tr key={video.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={video.is_trial}
                      onChange={() => toggleTrialVideo(video)}
                      className="h-4 w-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={video.thumbnail_url || '/placeholder-video.jpg'}
                        alt={video.title}
                        className="h-12 w-20 rounded object-cover"
                      />
                      <div className="max-w-xs truncate font-medium text-gray-900">
                        {video.title}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{video.creator_name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(video.published_at).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredVideos.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-500">暂无匹配的视频</div>
          )}
        </div>
      </div>
    </div>
  );
}
