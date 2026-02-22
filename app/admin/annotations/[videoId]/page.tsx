'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type SubtitleRow = {
  id: string; // subtitles.id (uuid)
  sequence: number;
  start_time: number;
  end_time: number;
  text_en: string | null;
  text_zh: string | null;
  annotations?: LearningPoint[] | null;
};

type LearningPointType = 'word' | 'phrase';

type LearningPoint = {
  id?: string; // vocabulary.id (uuid) after save
  vocabId?: string;
  type?: LearningPointType;
  text: string;
  start: number;
  end: number;
  phonetic?: string;
  meaning?: string;
  helperSentence?: string;
};

type VocabRow = {
  id: string;
  text: string;
  normalized_text: string;
  type: LearningPointType;
  phonetic: string | null;
  meaning: string | null;
  helper_sentence: string | null;
};

function normalizeText(s: string) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

function defaultTypeForSelection(text: string): LearningPointType {
  return /\s/.test(text.trim()) ? 'phrase' : 'word';
}

function stripEmpty(v?: string) {
  const t = (v || '').trim();
  return t ? t : '';
}
function needsAiPrefill(p: LearningPoint) {
  return !stripEmpty(p.phonetic) || !stripEmpty(p.meaning) || !stripEmpty(p.helperSentence);
}

export default function VideoAnnotationsPage() {
  const params = useParams();
  const videoId = params.videoId as string;

  const [videoTitle, setVideoTitle] = useState<string>('');
  const [subtitles, setSubtitles] = useState<SubtitleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Editor modal
  const [editing, setEditing] = useState<SubtitleRow | null>(null);
  const [draftPoints, setDraftPoints] = useState<LearningPoint[]>([]);
  const [saving, setSaving] = useState(false);

  // AI mode toggle + model
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiModel, setAiModel] = useState('gpt-5.2');
  const [aiLoading, setAiLoading] = useState<Record<number, boolean>>({});
  const [aiBatching, setAiBatching] = useState(false);

  const enRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const supabase = createClient();

        const { data: v, error: ve } = await supabase
          .from('videos')
          .select('id, title')
          .eq('id', videoId)
          .single();
        if (ve) throw ve;
        setVideoTitle(v?.title || '');

        const { data, error } = await supabase
          .from('subtitles')
          .select('id, sequence, start_time, end_time, text_en, text_zh, annotations')
          .eq('video_id', videoId)
          .order('sequence', { ascending: true });
        if (error) throw error;

        setSubtitles(
          (data || []).map((r: any) => ({
            ...r,
            start_time: Number(r.start_time),
            end_time: Number(r.end_time),
            annotations: Array.isArray(r.annotations) ? (r.annotations as LearningPoint[]) : [],
          }))
        );
      } catch (e: any) {
        setError(e?.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [videoId]);

  const openEditor = (row: SubtitleRow) => {
    setEditing(row);
    setDraftPoints((row.annotations || []).map((p) => ({ ...p })));
    // Delay so the textarea mounts before focusing.
    setTimeout(() => enRef.current?.focus(), 50);
  };

  const closeEditor = () => {
    setEditing(null);
    setDraftPoints([]);
    setSaving(false);
  };

  const addFromSelection = async () => {
    const row = editing;
    const el = enRef.current;
    if (!row || !el) return;

    const full = el.value || '';
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const rawSel = full.slice(start, end);
    if (!rawSel) return;

    // Trim whitespace from the selection, while keeping accurate indices.
    const leftPad = rawSel.match(/^\s*/)?.[0]?.length || 0;
    const rightPad = rawSel.match(/\s*$/)?.[0]?.length || 0;
    const tStart = start + leftPad;
    const tEnd = end - rightPad;
    const selText = full.slice(tStart, tEnd);
    if (!selText.trim()) return;

    const type = defaultTypeForSelection(selText);

    const next: LearningPoint = {
      text: selText,
      start: tStart,
      end: tEnd,
      type,
      phonetic: '',
      meaning: '',
      helperSentence: '',
    };

    // Try reuse from vocabulary
    try {
      const supabase = createClient();
      const norm = normalizeText(next.text);
      const { data } = await supabase
        .from('vocabulary')
        .select('id, text, normalized_text, type, phonetic, meaning, helper_sentence')
        .eq('normalized_text', norm)
        .eq('type', type)
        .limit(1);

      const hit = (data || [])[0] as VocabRow | undefined;
      if (hit) {
        next.id = hit.id;
        next.vocabId = hit.id;
        next.phonetic = hit.phonetic || '';
        next.meaning = hit.meaning || '';
        next.helperSentence = hit.helper_sentence || '';
      }
    } catch {
      // Ignore lookup errors; user can still save.
    }

    setDraftPoints((prev) => [...prev, next]);
  };

  const removePoint = (idx: number) => {
    setDraftPoints((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePoint = (idx: number, patch: Partial<LearningPoint>) => {
    setDraftPoints((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

    const generateWithAi = async (idx: number) => {
    if (!aiEnabled) return;
    const row = editing;
    const p = draftPoints[idx];
    if (!row || !p) return;

    setAiLoading((prev) => ({ ...prev, [idx]: true }));
    updatePoint(idx, {
      phonetic: p.phonetic || '',
      meaning: p.meaning || '',
      helperSentence: p.helperSentence || '',
    });

    const context = (row.text_en || '').trim();
    try {
      const resp = await fetch('/api/admin/ai/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: p.text.trim(),
          type: (p.type || defaultTypeForSelection(p.text)) as LearningPointType,
          context,
          model: aiModel,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'AI 生成失败');
      }
      updatePoint(idx, {
        phonetic: stripEmpty(data?.phonetic),
        meaning: stripEmpty(data?.meaning),
        helperSentence: stripEmpty(data?.helperSentence),
      });
    } catch (e: any) {
      alert(e?.message || 'AI 生成失败');
    } finally {
      setAiLoading((prev) => {
        const next = { ...prev };
        delete next[idx];
        return next;
      });
    }
  };

  const generateAllWithAi = async () => {
    if (!aiEnabled || draftPoints.length === 0) return;
    setAiBatching(true);
    try {
      for (let i = 0; i < draftPoints.length; i += 1) {
        const p = draftPoints[i];
        if (!p || !needsAiPrefill(p)) continue;
        await generateWithAi(i);
      }
    } finally {
      setAiBatching(false);
    }
  };

  const saveSubtitle = async () => {
    const row = editing;
    if (!row) return;

    setSaving(true);
    try {
      const supabase = createClient();

      // Upsert vocabulary rows for reuse.
      const resolved: LearningPoint[] = [];
      for (const p of draftPoints) {
        const text = (p.text || '').trim();
        if (!text) continue;

        const type = (p.type || defaultTypeForSelection(text)) as LearningPointType;
        const normalized_text = normalizeText(text);

        const payload: any = { text, normalized_text, type };
        const phonetic = stripEmpty(p.phonetic);
        const meaning = stripEmpty(p.meaning);
        const helper_sentence = stripEmpty(p.helperSentence);
        if (phonetic) payload.phonetic = phonetic;
        if (meaning) payload.meaning = meaning;
        if (helper_sentence) payload.helper_sentence = helper_sentence;

        const { data, error } = await supabase
          .from('vocabulary')
          .upsert(payload, { onConflict: 'normalized_text,type' })
          .select('id, text, normalized_text, type, phonetic, meaning, helper_sentence')
          .single();

        if (error) throw error;
        const v = data as VocabRow;

        resolved.push({
          id: v.id,
          vocabId: v.id,
          type: v.type,
          text,
          start: p.start,
          end: p.end,
          phonetic: v.phonetic || phonetic || '',
          meaning: v.meaning || meaning || '',
          helperSentence: v.helper_sentence || helper_sentence || '',
        });
      }

      // Persist into subtitles.annotations as a denormalized array used by the player UI.
      const { error: ue } = await supabase
        .from('subtitles')
        .update({ annotations: resolved })
        .eq('id', row.id);
      if (ue) throw ue;

      // Update local list
      setSubtitles((prev) =>
        prev.map((s) => (s.id === row.id ? { ...s, annotations: resolved } : s))
      );

      closeEditor();
    } catch (e: any) {
      alert(e?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const existingCount = useMemo(() => {
    const total = subtitles.reduce((acc, s) => acc + ((s.annotations || []).length || 0), 0);
    return total;
  }, [subtitles]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/annotations" className="text-sm text-gray-600 hover:text-gray-900">
              ← 返回列表
            </Link>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">字幕标注</h1>
          <p className="mt-2 text-gray-600">
            {videoTitle ? `视频：${videoTitle}` : `视频ID：${videoId}`} ・ 已标注学习点：{existingCount}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-700">字幕列表</div>
          <div className="text-xs text-gray-500">{subtitles.length} 条</div>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500">加载中…</div>
        ) : subtitles.length === 0 ? (
          <div className="p-6 text-gray-500">该视频暂无字幕</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {subtitles.map((s) => (
              <div key={s.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-500">{s.sequence} ・ {Number(s.start_time).toFixed(2)}s</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900 break-words">{s.text_en || ''}</div>
                  <div className="mt-1 text-xs text-gray-600 break-words">{s.text_zh || ''}</div>
                  <div className="mt-2 text-xs text-gray-500">
                    学习点：{(s.annotations || []).length || 0}
                  </div>
                </div>
                <div className="shrink-0">
                  <button
                    onClick={() => openEditor(s)}
                    className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors"
                  >
                    标注
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm text-gray-500">第 {editing.sequence} 条字幕</div>
                <div className="text-lg font-bold text-gray-900">标注学习点</div>
              </div>
              <button
                onClick={closeEditor}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                aria-label="Close"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">英文（框选后点击“添加学习点”）</label>
                  <textarea
                    ref={enRef}
                    readOnly
                    value={editing.text_en || ''}
                    className="w-full h-28 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 leading-relaxed"
                  />
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={addFromSelection}
                      className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black transition-colors"
                    >
                      添加学习点
                    </button>
                    <div className="text-xs text-gray-500">
                      提示：只要框选词/短语，不需要手算 start/end
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">生成方式</label>
                  <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                    <label className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-gray-700">AI 预填</span>
                      <input
                        type="checkbox"
                        checked={aiEnabled}
                        onChange={(e) => setAiEnabled(e.target.checked)}
                      />
                    </label>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">模型（中转站支持 gpt5.2 / claude 等）</div>
                      <input
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        list="ai-models"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                        placeholder="gpt-5.2"
                      />
                      <datalist id="ai-models">
                        <option value="gpt-5.2" />
                        <option value="claude-3.5-sonnet" />
                        <option value="claude-3.5-haiku" />
                      </datalist>
                    </div>
                    <div className="text-xs text-gray-500">
                      关闭 AI 后即为纯手动标注（仍会自动复用词库）。
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-700">学习点列表</div>
                  <div className="flex items-center gap-2">
                    {aiEnabled && (
                      <button
                        onClick={generateAllWithAi}
                        disabled={aiBatching || draftPoints.length === 0}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {aiBatching ? 'AI 预填中...' : 'AI 预填全部'}
                      </button>
                    )}
                    <div className="text-xs text-gray-500">{draftPoints.length} 个</div>
                  </div>
                </div>

                {draftPoints.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm">
                    暂无学习点。先在英文里框选一段文字，再点“添加学习点”。
                  </div>
                ) : (
                  <div className="space-y-3">
                                        {draftPoints.map((p, idx) => {
                      const typeValue = (p.type || defaultTypeForSelection(p.text)) as LearningPointType;
                      const typeLabel = typeValue === 'word' ? '单词' : '短语';
                      return (
                        <div key={`${p.start}:${p.end}:${idx}`} className="rounded-2xl border border-gray-200 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-gray-900 break-words">{p.text}</div>
                              <div className="mt-1 text-xs text-gray-500">
                                range: [{p.start}, {p.end}) type: {typeLabel}
                              </div>
                              <div className="mt-3 flex items-center gap-2">
                                <div className="text-xs text-gray-500">类型</div>
                                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                                  <button
                                    onClick={() => updatePoint(idx, { type: 'word' })}
                                    className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                                      typeValue === 'word'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    单词
                                  </button>
                                  <button
                                    onClick={() => updatePoint(idx, { type: 'phrase' })}
                                    className={`px-2.5 py-1 text-xs font-semibold transition-colors ${
                                      typeValue === 'phrase'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    短语
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {aiEnabled && (
                                <button
                                  onClick={() => generateWithAi(idx)}
                                  disabled={aiBatching || !!aiLoading[idx]}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  {aiLoading[idx] ? '生成中...' : 'AI 预填'}
                                </button>
                              )}
                              <button
                                onClick={() => removePoint(idx)}
                                className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
                              >
                                删除
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                            <div>
                              <div className="text-xs font-semibold text-gray-600 mb-1">音标</div>
                              <input
                                value={p.phonetic || ''}
                                onChange={(e) => updatePoint(idx, { phonetic: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                placeholder="/.../"
                              />
                            </div>
                            <div className="lg:col-span-2">
                              <div className="text-xs font-semibold text-gray-600 mb-1">释义（简短）</div>
                              <input
                                value={p.meaning || ''}
                                onChange={(e) => updatePoint(idx, { meaning: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                placeholder="phr. 在排队"
                              />
                            </div>
                            <div className="lg:col-span-3">
                              <div className="text-xs font-semibold text-gray-600 mb-1">帮助理解（短句）</div>
                              <input
                                value={p.helperSentence || ''}
                                onChange={(e) => updatePoint(idx, { helperSentence: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                                placeholder="standing in line, waiting in line"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                保存会同时写入：词库（vocabulary）+ 当前字幕的 annotations
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeEditor}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  onClick={saveSubtitle}
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? '保存中…' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
