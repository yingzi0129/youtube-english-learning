'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type SubtitleRow = {
  id: string;
  video_id: string;
  sequence: number;
  start_time: number;
  end_time: number;
  text_en: string | null;
  text_zh: string | null;
  seek_offset?: number | null; // seconds, negative means seek earlier
};

export default function EditSubtitlePage() {
  const router = useRouter();
  const params = useParams();
  const subtitleId = params.subtitleId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [subtitle, setSubtitle] = useState<SubtitleRow | null>(null);

  const backHref = useMemo(() => {
    if (!subtitle?.video_id) return '/admin/subtitles';
    return `/admin/subtitles?video_id=${subtitle.video_id}`;
  }, [subtitle?.video_id]);

  useEffect(() => {
    const load = async () => {
      if (!subtitleId) return;
      setLoading(true);
      setError('');

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('subtitles')
          .select('*')
          .eq('id', subtitleId)
          .single();

        if (error) throw error;
        setSubtitle(data as SubtitleRow);
      } catch (e: any) {
        setError(e?.message || '加载字幕失败');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [subtitleId]);

  const handleSave = async () => {
    if (!subtitleId || !subtitle) return;

    setSaving(true);
    setError('');
    try {
      const supabase = createClient();
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('subtitles')
        .update({
          seek_offset: Number.isFinite(Number(subtitle.seek_offset)) ? Number(subtitle.seek_offset) : 0,
          // Saving implies confirmation in the current workflow.
          seek_offset_confirmed_value: Number.isFinite(Number(subtitle.seek_offset)) ? Number(subtitle.seek_offset) : 0,
          seek_offset_confirmed_at: nowIso,
        })
        .eq('id', subtitleId);

      if (error) throw error;

      router.push(backHref);
      router.refresh();
    } catch (e: any) {
      // If the DB hasn't been migrated yet, PostgREST will error here.
      setError(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse"></div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!subtitle) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="text-gray-900 font-semibold mb-2">未找到字幕</div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button
          onClick={() => router.push('/admin/subtitles')}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          返回字幕管理
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">编辑字幕</h1>
          <p className="mt-2 text-gray-600">
            序号 {subtitle.sequence}（{subtitle.start_time}s - {subtitle.end_time}s）
          </p>
        </div>
        <button
          onClick={() => router.push(backHref)}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          返回
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
          <p className="text-red-700 text-xs mt-1">
            提示：如果报 “column seek_offset does not exist”，需要先在数据库给 subtitles 表新增 seek_offset 字段。
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            点击偏移（秒）
          </label>
          <input
            type="number"
            step="0.001"
            value={(subtitle.seek_offset ?? 0).toString()}
            onChange={(e) => {
              const v = Number(e.target.value);
              setSubtitle((prev) => (prev ? { ...prev, seek_offset: Number.isFinite(v) ? v : 0 } : prev));
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-2">
            负数表示点击该字幕时向前回退（例如 -1 表示回退 1 秒），0 表示不额外偏移。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">英文</label>
            <div className="px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
              {subtitle.text_en || '-'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">中文</label>
            <div className="px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-900">
              {subtitle.text_zh || '-'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => router.push(backHref)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            disabled={saving}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
