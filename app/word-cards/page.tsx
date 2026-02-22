'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import WordCardSkeleton from '../components/WordCardSkeleton';

type LearningPointType = 'word' | 'phrase';
type VocabStatus = 'mastered' | 'familiar' | 'unknown';

type VideoItem = {
  id: string;
  title: string;
};

type LearningPoint = {
  id?: string;
  vocabId?: string;
  type?: LearningPointType;
  text: string;
  phonetic?: string;
  meaning?: string;
  helperSentence?: string;
};

type CardItem = {
  key: string;
  vocabId?: string;
  type: LearningPointType;
  text: string;
  phonetic: string;
  meaning: string;
  helperSentence: string;
};

type VocabRow = {
  id: string;
  normalized_text: string;
  type: LearningPointType;
  phonetic: string | null;
  meaning: string | null;
  helper_sentence: string | null;
};

const statusLabels: Record<VocabStatus, string> = {
  mastered: '掌握',
  familiar: '熟悉',
  unknown: '陌生',
};

const statusTabs: Array<{ key: 'all' | VocabStatus; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'mastered', label: '掌握' },
  { key: 'familiar', label: '熟悉' },
  { key: 'unknown', label: '陌生' },
];

function normalizeText(s: string) {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

function defaultType(text: string): LearningPointType {
  return /\s/.test(text.trim()) ? 'phrase' : 'word';
}

export default function WordCardsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, VocabStatus>>({});
  const [meaningHidden, setMeaningHidden] = useState<Record<string, boolean>>({});
  const [typeFilter, setTypeFilter] = useState<LearningPointType>('word');
  const [statusFilter, setStatusFilter] = useState<'all' | VocabStatus>('all');
  const [loading, setLoading] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError('');
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserId(user.id);

        const { data, error: ve } = await supabase
          .from('videos')
          .select('id, title')
          .eq('is_deleted', false)
          .order('published_at', { ascending: false });
        if (ve) throw ve;
        const list = (data || []) as VideoItem[];
        setVideos(list);
        setSelectedVideoId(list[0]?.id || null);
      } catch (e: any) {
        setError(e?.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    const loadCards = async () => {
      if (!selectedVideoId || !userId) return;
      setLoadingCards(true);
      setError('');
      try {
        const supabase = createClient();
        const { data, error: se } = await supabase
          .from('subtitles')
          .select('annotations')
          .eq('video_id', selectedVideoId);
        if (se) throw se;

        const raw: LearningPoint[] = [];
        (data || []).forEach((row: any) => {
          if (Array.isArray(row.annotations)) {
            row.annotations.forEach((p: any) => {
              if (p && typeof p.text === 'string') raw.push(p as LearningPoint);
            });
          }
        });

        const merged = new Map<string, CardItem>();
        raw.forEach((p) => {
          const text = (p.text || '').trim();
          if (!text) return;
          const type = (p.type || defaultType(text)) as LearningPointType;
          const key = `${normalizeText(text)}::${type}`;
          const next: CardItem = {
            key,
            vocabId: p.vocabId || p.id,
            type,
            text,
            phonetic: p.phonetic || '',
            meaning: p.meaning || '',
            helperSentence: p.helperSentence || '',
          };

          const prev = merged.get(key);
          if (!prev) {
            merged.set(key, next);
            return;
          }
          merged.set(key, {
            ...prev,
            vocabId: prev.vocabId || next.vocabId,
            phonetic: prev.phonetic || next.phonetic,
            meaning: prev.meaning || next.meaning,
            helperSentence: prev.helperSentence || next.helperSentence,
          });
        });

        let list = Array.from(merged.values());

        const missing = list.filter((p) => !p.vocabId);
        if (missing.length > 0) {
          const payloads = missing.map((p) => ({
            text: p.text,
            normalized_text: normalizeText(p.text),
            type: p.type,
            phonetic: p.phonetic || null,
            meaning: p.meaning || null,
            helper_sentence: p.helperSentence || null,
          }));
          const { data: vocabRows } = await supabase
            .from('vocabulary')
            .upsert(payloads, { onConflict: 'normalized_text,type' })
            .select('id, normalized_text, type, phonetic, meaning, helper_sentence');

          const map = new Map<string, VocabRow>();
          (vocabRows || []).forEach((v: any) => {
            map.set(`${v.normalized_text}::${v.type}`, v as VocabRow);
          });

          list = list.map((p) => {
            if (p.vocabId) return p;
            const key = `${normalizeText(p.text)}::${p.type}`;
            const hit = map.get(key);
            if (!hit) return p;
            return {
              ...p,
              vocabId: hit.id,
              phonetic: p.phonetic || hit.phonetic || '',
              meaning: p.meaning || hit.meaning || '',
              helperSentence: p.helperSentence || hit.helper_sentence || '',
            };
          });
        }

        const vocabIds = list.map((p) => p.vocabId).filter(Boolean) as string[];
        let nextStatus: Record<string, VocabStatus> = {};
        if (vocabIds.length > 0) {
          const { data: statusRows } = await supabase
            .from('vocab_progress')
            .select('vocab_id, status')
            .eq('user_id', userId)
            .in('vocab_id', vocabIds);
          (statusRows || []).forEach((row: any) => {
            nextStatus[row.vocab_id] = row.status as VocabStatus;
          });
        }

        setCards(list);
        setStatusMap(nextStatus);
      } catch (e: any) {
        setError(e?.message || '加载失败');
      } finally {
        setLoadingCards(false);
      }
    };
    loadCards();
  }, [selectedVideoId, userId]);

  const visibleCards = useMemo(() => {
    const typed = cards.filter((p) => p.type === typeFilter);
    return typed.filter((p) => {
      if (statusFilter === 'all') return true;
      const status = p.vocabId ? statusMap[p.vocabId] || 'unknown' : 'unknown';
      return status === statusFilter;
    });
  }, [cards, typeFilter, statusFilter, statusMap]);

  const statusCounts = useMemo(() => {
    const typed = cards.filter((p) => p.type === typeFilter);
    const counts: Record<'all' | VocabStatus, number> = {
      all: typed.length,
      mastered: 0,
      familiar: 0,
      unknown: 0,
    };
    typed.forEach((p) => {
      const status = p.vocabId ? statusMap[p.vocabId] || 'unknown' : 'unknown';
      counts[status] += 1;
    });
    return counts;
  }, [cards, typeFilter, statusMap]);

  const updateStatus = async (vocabId: string, status: VocabStatus) => {
    if (!userId) return;
    const prevStatus = statusMap[vocabId] || 'unknown';
    setStatusMap((prev) => ({ ...prev, [vocabId]: status }));
    try {
      const supabase = createClient();
      const { error: ue } = await supabase
        .from('vocab_progress')
        .upsert(
          { user_id: userId, vocab_id: vocabId, status },
          { onConflict: 'user_id,vocab_id' }
        );
      if (ue) throw ue;
    } catch {
      setStatusMap((prev) => ({ ...prev, [vocabId]: prevStatus }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
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
              单词卡片
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-purple-100/50 shadow-sm p-4">
              <div className="text-sm font-semibold text-gray-700 mb-3">视频库</div>
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded-xl"></div>
                  ))}
                </div>
              ) : videos.length === 0 ? (
                <div className="text-sm text-gray-500">暂无视频</div>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {videos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => setSelectedVideoId(video.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                        selectedVideoId === video.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-purple-50'
                      }`}
                    >
                      {video.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <main className="lg:col-span-9">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-purple-100/50 shadow-sm p-4 lg:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTypeFilter('word')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      typeFilter === 'word'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    单词
                  </button>
                  <button
                    onClick={() => setTypeFilter('phrase')}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                      typeFilter === 'phrase'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    短语
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {statusTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        statusFilter === tab.key
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label} {`(${statusCounts[tab.key] || 0})`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                {loadingCards ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <WordCardSkeleton key={i} />
                    ))}
                  </div>
                ) : visibleCards.length === 0 ? (
                  <div className="text-sm text-gray-500">暂无数据</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleCards.map((card) => {
                      const vocabId = card.vocabId || card.key;
                      const status = card.vocabId ? statusMap[card.vocabId] || 'unknown' : 'unknown';
                      const hideMeaning = meaningHidden[vocabId];
                      return (
                        <div
                          key={vocabId}
                          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-lg font-bold text-gray-900 break-words">{card.text}</div>
                              {card.phonetic && (
                                <div className="text-sm text-gray-500 italic mt-1">{card.phonetic}</div>
                              )}
                            </div>
                            <button
                              onClick={() =>
                                setMeaningHidden((prev) => ({
                                  ...prev,
                                  [vocabId]: !prev[vocabId],
                                }))
                              }
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                hideMeaning
                                  ? 'border-gray-300 text-gray-500'
                                  : 'border-purple-200 text-purple-600'
                              }`}
                            >
                              释义{hideMeaning ? '关闭' : '开启'}
                            </button>
                          </div>

                          {!hideMeaning && card.meaning && (
                            <div className="mt-3 text-sm text-gray-800 font-semibold">{card.meaning}</div>
                          )}

                          {card.helperSentence && (
                            <div className="mt-3 inline-block max-w-full rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 break-words">
                              {card.helperSentence}
                            </div>
                          )}

                          <div className="mt-4 flex items-center gap-2">
                            {(['mastered', 'familiar', 'unknown'] as VocabStatus[]).map((s) => (
                              <button
                                key={s}
                                onClick={() => card.vocabId && updateStatus(card.vocabId, s)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                  status === s
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                disabled={!card.vocabId}
                              >
                                {statusLabels[s]}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
