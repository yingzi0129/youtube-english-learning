'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Video = {
  id: string;
  title: string;
  creator_name?: string | null;
  difficulty?: string | null;
  published_at?: string | null;
  is_deleted?: boolean | null;
};

export default function AnnotationsHomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('videos')
          .select('id, title, creator_name, difficulty, published_at, is_deleted')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setVideos((data || []) as Video[]);
      } catch (e: any) {
        setError(e?.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return videos.filter(v => !v.is_deleted);
    return videos.filter(v => !v.is_deleted && (v.title || '').toLowerCase().includes(s));
  }, [videos, q]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">标注管理</h1>
          <p className="mt-2 text-gray-600">为字幕标注学习点（下划线词/短语、单词卡、填空练习）</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索视频标题…"
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-700">视频列表</div>
          <div className="text-xs text-gray-500">{filtered.length} 条</div>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-gray-500">没有匹配的视频</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((v) => (
              <div key={v.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{v.title}</div>
                  <div className="mt-1 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                    {v.creator_name ? <span>作者：{v.creator_name}</span> : null}
                    {v.difficulty ? <span>难度：{v.difficulty}</span> : null}
                    {v.published_at ? (
                      <span>发布：{new Date(v.published_at).toLocaleDateString('zh-CN')}</span>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Link
                    href={`/admin/annotations/${v.id}`}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
                  >
                    去标注
                  </Link>
                  <Link
                    href={`/videos/${v.id}`}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 transition-colors"
                  >
                    预览
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

