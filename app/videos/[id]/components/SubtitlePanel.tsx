'use client';

import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import AudioRecorder from '@/app/components/AudioRecorder';
import { createClient } from '@/lib/supabase/client';

interface Subtitle {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
  translation: string;
  seekOffset?: number;
  annotations?: LearningPoint[];
}

type VideoLoopMode = 'single' | 'loop';
type SentenceLoopMode = 'continuous' | 'single';
type LoopCount = 1 | 2 | 3 | -1;
type SubtitleMode = 'bilingual' | 'chinese' | 'english';
type ThemeMode = 'light' | 'dark';

type LearningPoint = {
  id: string;
  type?: 'word' | 'phrase';
  text: string;
  start: number;
  end: number;
  phonetic?: string;
  meaning?: string;
  helperSentence?: string;
};

interface SubtitlePanelProps {
  subtitles: Subtitle[];
  currentTime?: number;
  // New: seek by subtitle id (supports smart backtracking in parent).
  onSeekToSubtitle?: (subtitleId: number) => void;
  onSeek?: (time: number) => void; // fallback
  onPlayOriginal?: (subtitleId: number) => void;
  videoLoopMode: VideoLoopMode;
  onVideoLoopModeChange: (mode: VideoLoopMode) => void;
  sentenceLoopMode: SentenceLoopMode;
  onSentenceLoopModeChange: (mode: SentenceLoopMode) => void;
  loopCount: LoopCount;
  onLoopCountChange: (count: LoopCount) => void;
  currentLoopIndex: number;
  autoNextSentence: boolean;
  onAutoNextSentenceChange: (auto: boolean) => void;
  videoId: string;
  subtitleMode: SubtitleMode;
  onSubtitleModeChange: (mode: SubtitleMode) => void;
  fontSize: number;
  themeMode: ThemeMode;
  isPracticeMode: boolean;
  onPracticeModeChange: (enabled: boolean) => void;
  isClozeMode: boolean;
  onClozeModeChange: (enabled: boolean) => void;
}

export default function SubtitlePanel({
  subtitles,
  currentTime = 0,
  onSeekToSubtitle,
  onSeek,
  onPlayOriginal,
  videoLoopMode,
  onVideoLoopModeChange,
  sentenceLoopMode,
  onSentenceLoopModeChange,
  loopCount,
  onLoopCountChange,
  currentLoopIndex,
  autoNextSentence,
  onAutoNextSentenceChange,
  videoId,
  subtitleMode,
  onSubtitleModeChange,
  fontSize,
  themeMode,
  isPracticeMode,
  onPracticeModeChange,
  isClozeMode,
  onClozeModeChange,
}: SubtitlePanelProps) {
  const subtitleListRef = useRef<HTMLDivElement>(null);
  const [pinnedSubtitleId, setPinnedSubtitleId] = useState<number | null>(null);

  // Cloze (fill-in) mode: mask all annotated learning points until revealed by click.
  // Keyed by `${subtitleId}:${learningPointId}` to avoid collisions across subtitles.
  const [revealed, setRevealed] = useState<Record<string, true>>({});

  // Word card popover state (desktop-focused; uses a portal to avoid clipping).
  const [cardPoint, setCardPoint] = useState<LearningPoint | null>(null);
  const [cardAnchor, setCardAnchor] = useState<DOMRect | null>(null);
  const [isCardMounted, setIsCardMounted] = useState(false);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const showPronunciationButton = false;

  useEffect(() => {
    // Portal requires DOM.
    setIsCardMounted(true);
  }, []);

  // When entering cloze mode, reset reveal progress (per requirement: everything masked until clicked).
  useEffect(() => {
    if (isClozeMode) {
      setRevealed({});
      setCardPoint(null);
      setCardAnchor(null);
    }
  }, [isClozeMode]);

  // 根据当前播放时间计算激活的字幕ID
  const activeSubtitleIdByTime = useMemo(() => {
    const activeSubtitle = subtitles.find(
      (sub) => currentTime >= sub.startTime && currentTime < sub.endTime
    );
    return activeSubtitle?.id || null;
  }, [currentTime, subtitles]);

  // When we seek slightly earlier than a subtitle's start (smart backtracking),
  // keep the clicked subtitle highlighted until playback reaches its start time.
  const pinnedStartTime = useMemo(() => {
    if (pinnedSubtitleId == null) return null;
    return subtitles.find((s) => s.id === pinnedSubtitleId)?.startTime ?? null;
  }, [pinnedSubtitleId, subtitles]);

  const activeSubtitleId =
    pinnedSubtitleId != null &&
    pinnedStartTime != null &&
    currentTime < pinnedStartTime &&
    pinnedStartTime - currentTime <= 3
      ? pinnedSubtitleId
      : activeSubtitleIdByTime;

  useEffect(() => {
    if (pinnedSubtitleId == null || pinnedStartTime == null) return;
    if (currentTime >= pinnedStartTime - 0.01) {
      setPinnedSubtitleId(null);
    }
  }, [currentTime, pinnedSubtitleId, pinnedStartTime]);

  const stopSpeaking = () => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (synth) {
      synth.cancel();
    }
    setIsSpeaking(false);
  };

  const closeCard = () => {
    stopSpeaking();
    setCardPoint(null);
    setCardAnchor(null);
    setCardPos(null);
  };

  // Close popover on outside click / scroll / resize (desktop UX).
  useEffect(() => {
    if (!cardPoint) return;

    const onPointerDown = (e: PointerEvent) => {
      const el = cardRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      closeCard();
    };

    const onScrollOrResize = () => closeCard();

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize, true);
    };
  }, [cardPoint]);

  useLayoutEffect(() => {
    if (!cardPoint || !cardAnchor || !cardRef.current) return;

    const el = cardRef.current;
    const rect = el.getBoundingClientRect();
    const margin = 12;

    let left = cardAnchor.left;
    let top = cardAnchor.bottom + 10;

    // Clamp horizontally.
    left = Math.min(Math.max(margin, left), window.innerWidth - rect.width - margin);

    // Prefer below; if not enough room, show above.
    if (top + rect.height + margin > window.innerHeight) {
      top = cardAnchor.top - rect.height - 10;
    }
    top = Math.min(Math.max(margin, top), window.innerHeight - rect.height - margin);

    setCardPos({ top: Math.round(top), left: Math.round(left) });
  }, [cardPoint, cardAnchor]);

  const getRevealKey = (subtitleId: number, pointId: string) => `${subtitleId}:${pointId}`;

  const isRevealed = (subtitleId: number, pointId: string) => {
    return !!revealed[getRevealKey(subtitleId, pointId)];
  };

  const revealPoint = (subtitleId: number, pointId: string) => {
    const key = getRevealKey(subtitleId, pointId);
    setRevealed((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  const showCard = (point: LearningPoint, anchorEl: HTMLElement) => {
    setCardPoint(point);
    const rect = anchorEl.getBoundingClientRect();
    setCardAnchor(rect);
    // Initial position (may be adjusted after measuring the card).
    setCardPos({
      top: Math.round(rect.bottom + 10),
      left: Math.round(rect.left),
    });
  };

  const playPronunciation = (text: string) => {
    if (typeof window === 'undefined' || !text?.trim()) return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.95;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    synth.speak(utter);
  };

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const normalizeLearningPoints = (text: string, points: LearningPoint[]) => {
    const safe = (points || [])
      .filter((p) => p && typeof p.text === 'string')
      .map((p) => {
        const start = Number(p.start);
        const end = Number(p.end);
        return {
          ...p,
          id: String((p as any).id ?? `${start}:${end}:${p.text}`),
          start,
          end,
        };
      })
      .filter((p) => Number.isFinite(p.start) && Number.isFinite(p.end) && p.start >= 0 && p.end > p.start)
      .filter((p) => p.end <= text.length)
      .sort((a, b) => (a.start - b.start) || (b.end - b.start) - (a.end - a.start));

    // Drop overlaps: keep the earliest/longest-at-same-start.
    const out: LearningPoint[] = [];
    let cursor = 0;
    for (const p of safe) {
      if (p.start < cursor) continue;
      out.push(p);
      cursor = p.end;
    }
    return out;
  };

  const renderAnnotatedEnglish = (subtitleId: number, text: string, points?: LearningPoint[]) => {
    const normalized = normalizeLearningPoints(text, points || []);
    if (normalized.length === 0) return text;

    const nodes: React.ReactNode[] = [];
    let i = 0;
    for (const p of normalized) {
      if (p.start > i) {
        nodes.push(<span key={`t:${i}`}>{text.slice(i, p.start)}</span>);
      }

      const segment = text.slice(p.start, p.end);
      const revealedNow = isRevealed(subtitleId, p.id);
      const isMasked = isClozeMode && !revealedNow;

      nodes.push(
        <span
          key={`p:${p.id}:${p.start}`}
          role="button"
          tabIndex={0}
          className={
            isMasked
              ? 'inline-block rounded-md bg-amber-100/80 px-1 text-transparent select-none cursor-pointer'
              : 'underline decoration-emerald-500 decoration-2 underline-offset-2 font-semibold cursor-pointer hover:bg-emerald-50/60 rounded-sm px-0.5'
          }
          onClick={(e) => {
            e.stopPropagation();
            const target = e.currentTarget as unknown as HTMLElement;

            if (isClozeMode && !revealedNow) {
              revealPoint(subtitleId, p.id);
              return;
            }

            showCard(p, target);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              (e.currentTarget as HTMLElement).click();
            }
          }}
          title={isMasked ? '点击揭晓' : '点击查看释义'}
        >
          {segment}
        </span>
      );

      i = p.end;
    }

    if (i < text.length) nodes.push(<span key={`t:${i}:end`}>{text.slice(i)}</span>);
    return nodes;
  };

  // 自动滚动字幕列表：当激活字幕靠近底部/不在可视区域时，将其滚动到列表顶部位置
  useEffect(() => {
    if (activeSubtitleId == null) return;

    const container = subtitleListRef.current;
    if (!container) return;

    const el = container.querySelector<HTMLElement>(`[data-subtitle-id="${activeSubtitleId}"]`);
    if (!el) return;

    const elRect = el.getBoundingClientRect();

    const computed = window.getComputedStyle(container);
    const paddingTop = Number.parseFloat(computed.paddingTop || '0') || 0;
    const overflowY = computed.overflowY;
    const isScrollable =
      (overflowY === 'auto' || overflowY === 'scroll') &&
      container.scrollHeight > container.clientHeight + 1;

    if (isScrollable) {
      const containerRect = container.getBoundingClientRect();

      // When active subtitle enters the lower part of the container viewport (or is above), snap it to the top.
      const topThreshold = containerRect.top + paddingTop;
      const lowerThreshold = containerRect.top + containerRect.height * 0.65;

      if (elRect.top < topThreshold || elRect.top > lowerThreshold) {
        const targetTop = container.scrollTop + (elRect.top - containerRect.top) - paddingTop;
        container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
    } else {
      // Mobile layout: list is not scrollable; scroll the page instead.
      // Keep the active subtitle close to the top, below the sticky header.
      const stickyVideo = document.querySelector<HTMLElement>('[data-sticky-video="true"]');
      const stickyBottom = stickyVideo?.getBoundingClientRect().bottom;
      const topOffset = (typeof stickyBottom === 'number' ? stickyBottom : 88) + 12;
      const lowerThreshold = window.innerHeight * 0.75;

      if (elRect.top < topOffset || elRect.top > lowerThreshold) {
        const targetTop = window.scrollY + elRect.top - topOffset;
        window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
      }
    }
  }, [activeSubtitleId]);

  // 控制下拉菜单显示
  const [showLoopMenu, setShowLoopMenu] = useState(false);
  const [showPracticeMenu, setShowPracticeMenu] = useState(false);
  // 存储已有的录音记录
  const [existingRecordings, setExistingRecordings] = useState<Record<number, string>>({});

  // 加载已有的录音记录
  useEffect(() => {
    const loadRecordings = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('speaking_practice')
        .select('subtitle_id, audio_url')
        .eq('user_id', user.id)
        .eq('video_id', videoId);

      if (error) {
        return;
      }

      const recordings: Record<number, string> = {};
      data?.forEach((record) => {
        recordings[record.subtitle_id] = record.audio_url;
      });
      setExistingRecordings(recordings);
    };

    if (isPracticeMode) {
      loadRecordings();
    }
  }, [isPracticeMode, videoId]);

  // 处理录音完成
  const handleRecordingComplete = (subtitleId: number, audioUrl: string) => {
    setExistingRecordings((prev) => ({
      ...prev,
      [subtitleId]: audioUrl,
    }));
  };

  // 处理字幕点击，跳转到对应时间
  const handleSubtitleClick = (subtitleId: number, startTime: number) => {
    setPinnedSubtitleId(subtitleId);
    if (onSeekToSubtitle) {
      onSeekToSubtitle(subtitleId);
      return;
    }
    if (onSeek) onSeek(startTime);
  };

  // 格式化时间显示（秒转为 mm:ss 格式）
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <React.Fragment>
      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-purple-100/50 overflow-hidden lg:sticky lg:top-24">
      {/* 标题和功能图标 */}
      <div className="hidden lg:block px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between mb-2 lg:mb-3">
          <h2 className="text-base lg:text-lg font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            动态字幕
          </h2>

          {/* 功能图标按钮组 */}
          <div className="flex items-center gap-1.5 lg:gap-2">
            {/* 循环播放图标 */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowLoopMenu(!showLoopMenu);
                  setShowPracticeMenu(false);
                }}
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-white hover:bg-purple-50 flex items-center justify-center transition-colors shadow-sm border border-purple-100"
                title="循环播放"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* 循环播放下拉菜单 */}
              {showLoopMenu && (
                <div className="absolute top-full right-0 mt-2 w-56 lg:w-64 bg-white rounded-xl shadow-lg border border-purple-100 py-2 z-20">
                  {/* 视频循环模式 */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">视频循环</div>
                  <button
                    onClick={() => {
                      onVideoLoopModeChange('single');
                      setShowLoopMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                      videoLoopMode === 'single' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-purple-50'
                    }`}
                  >
                    <span>单集播放</span>
                    {videoLoopMode === 'single' && <span className="text-purple-600">✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      onVideoLoopModeChange('loop');
                      setShowLoopMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                      videoLoopMode === 'loop' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-purple-50'
                    }`}
                  >
                    <span>单集循环</span>
                    {videoLoopMode === 'loop' && <span className="text-purple-600">✓</span>}
                  </button>

                  <div className="border-t border-gray-200 my-2"></div>

                  {/* 句子循环模式 */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">句子循环</div>
                  <button
                    onClick={() => {
                      onSentenceLoopModeChange('continuous');
                      setShowLoopMenu(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                      sentenceLoopMode === 'continuous' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-purple-50'
                    }`}
                  >
                    <span>连续播放</span>
                    {sentenceLoopMode === 'continuous' && <span className="text-purple-600">✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      onSentenceLoopModeChange('single');
                    }}
                    className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                      sentenceLoopMode === 'single' ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-purple-50'
                    }`}
                  >
                    <span>单句循环</span>
                    {sentenceLoopMode === 'single' && <span className="text-purple-600">✓</span>}
                  </button>

                  {/* 循环次数选择（仅在单句循环模式下显示） */}
                  {sentenceLoopMode === 'single' && (
                    <>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase mt-2">循环次数</div>
                      {[1, 2, 3, -1].map((count) => (
                        <button
                          key={count}
                          onClick={() => {
                            onLoopCountChange(count as LoopCount);
                            setShowLoopMenu(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                            loopCount === count ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-700 hover:bg-purple-50'
                          }`}
                        >
                          <span>{count === -1 ? '无限循环' : `${count} 次`}</span>
                          {loopCount === count && <span className="text-purple-600">✓</span>}
                        </button>
                      ))}

                      <div className="border-t border-gray-200 my-2"></div>

                      {/* 自动下一句开关 */}
                      <button
                        onClick={() => {
                          onAutoNextSentenceChange(!autoNextSentence);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 transition-colors flex items-center justify-between"
                      >
                        <span>自动下一句</span>
                        <div className={`w-10 h-5 rounded-full transition-colors ${autoNextSentence ? 'bg-purple-600' : 'bg-gray-300'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform mt-0.5 ${autoNextSentence ? 'ml-5' : 'ml-0.5'}`}></div>
                        </div>
                      </button>

                      {/* 当前循环次数显示 */}
                      {loopCount !== -1 && (
                        <div className="px-4 py-2 text-xs text-gray-500 bg-purple-50 mt-2">
                          当前循环：第 {currentLoopIndex + 1} / {loopCount} 次
                        </div>
                      )}
                      {loopCount === -1 && (
                        <div className="px-4 py-2 text-xs text-gray-500 bg-purple-50 mt-2">
                          当前循环：第 {currentLoopIndex + 1} 次
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 英语练习图标 */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowPracticeMenu(!showPracticeMenu);
                  setShowLoopMenu(false);
                }}
                className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-white hover:bg-purple-50 flex items-center justify-center transition-colors shadow-sm border border-purple-100"
                title="英语练习"
              >
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>

              {/* 英语练习下拉菜单 */}
              {showPracticeMenu && (
                <div className="absolute top-full right-0 mt-2 w-36 lg:w-40 bg-white rounded-xl shadow-lg border border-purple-100 py-2 z-20">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    英语练习
                  </div>
                  <button
                    onClick={() => {
                      onPracticeModeChange(!isPracticeMode);
                      setShowPracticeMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 transition-colors flex items-center justify-between"
                  >
                    <span>跟读练习</span>
                    {isPracticeMode && <span className="text-purple-600">✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      onClozeModeChange(!isClozeMode);
                      setShowPracticeMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-purple-50 transition-colors flex items-center justify-between"
                  >
                    <span>填空练习</span>
                    {isClozeMode && <span className="text-purple-600">✓</span>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 语言切换按钮 - 只在电脑端显示 */}
        <div className="hidden lg:flex items-center gap-1.5 lg:gap-2">
          <button
            onClick={() => onSubtitleModeChange('bilingual')}
            className={`px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
              subtitleMode === 'bilingual'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            双语
          </button>
          <button
            onClick={() => onSubtitleModeChange('chinese')}
            className={`px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
              subtitleMode === 'chinese'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            中文
          </button>
          <button
            onClick={() => onSubtitleModeChange('english')}
            className={`px-2.5 py-1 lg:px-3 lg:py-1.5 rounded-lg text-xs lg:text-sm font-medium transition-all ${
              subtitleMode === 'english'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            英文
          </button>
        </div>
      </div>

      {/* 字幕列表 */}
      <div
        ref={subtitleListRef}
        className={`p-3 lg:p-4 space-y-2 lg:space-y-3 lg:h-[600px] lg:overflow-y-auto ${
        themeMode === 'dark' ? 'bg-gray-900' : ''
      }`}
      >
        {subtitles.map((subtitle) => {
          const isActive = subtitle.id === activeSubtitleId;

          return (
            <div
              key={subtitle.id}
              data-subtitle-id={subtitle.id}
              className={`
                p-3 lg:p-4 rounded-xl lg:rounded-2xl border-2 transition-all duration-300 cursor-pointer
                ${
                  isActive
                    ? themeMode === 'dark'
                      ? 'bg-yellow-900/30 border-yellow-600 shadow-md'
                      : 'bg-yellow-50 border-yellow-400 shadow-md'
                    : themeMode === 'dark'
                    ? 'bg-gray-800 border-gray-700 hover:border-purple-500 hover:shadow-sm'
                    : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm'
                }
              `}
              onClick={() => handleSubtitleClick(subtitle.id, subtitle.startTime)}
            >
              {/* 时间戳 */}
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`
                    text-xs font-bold px-2 py-0.5 lg:py-1 rounded-full
                    ${isActive
                      ? themeMode === 'dark'
                        ? 'bg-yellow-900 text-yellow-300'
                        : 'bg-yellow-200 text-yellow-800'
                      : themeMode === 'dark'
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}
                >
                  {formatTime(subtitle.startTime)}
                </span>
                {isActive && (
                  <span className={`flex items-center gap-1 text-xs font-semibold ${
                    themeMode === 'dark' ? 'text-yellow-400' : 'text-yellow-700'
                  }`}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    播放中
                  </span>
                )}
              </div>

              {/* 英文字幕 */}
              {(subtitleMode === 'bilingual' || subtitleMode === 'english') && (
                <p
                  className={`
                    leading-relaxed
                    font-semibold
                    ${subtitleMode === 'bilingual' ? 'mb-2' : ''}
                    ${isActive
                      ? themeMode === 'dark'
                        ? 'text-white'
                        : 'text-gray-900'
                      : themeMode === 'dark'
                      ? 'text-gray-300'
                      : 'text-gray-700'
                    }
                  `}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {renderAnnotatedEnglish(subtitle.id, subtitle.text, subtitle.annotations)}
                </p>
              )}

              {/* 中文翻译 */}
              {(subtitleMode === 'bilingual' || subtitleMode === 'chinese') && (
                <p
                  className={`
                    leading-relaxed
                    ${subtitleMode === 'chinese' ? 'font-semibold' : ''}
                    ${isActive
                      ? themeMode === 'dark'
                        ? 'text-gray-300'
                        : 'text-gray-700'
                      : themeMode === 'dark'
                      ? 'text-gray-400'
                      : 'text-gray-600'
                    }
                  `}
                  style={{ fontSize: `${subtitleMode === 'bilingual' ? fontSize : fontSize - 2}px` }}
                >
                  {subtitle.translation}
                </p>
              )}

              {/* 口语练习录音控件 */}
              {isPracticeMode && (
                <div className={`mt-2 lg:mt-3 pt-2 lg:pt-3 ${
                  themeMode === 'dark' ? 'border-gray-700' : 'border-gray-200'
                } border-t`}>
                  <AudioRecorder
                    videoId={videoId}
                    subtitleId={subtitle.id}
                    existingAudioUrl={existingRecordings[subtitle.id]}
                    onRecordingComplete={(audioUrl) => handleRecordingComplete(subtitle.id, audioUrl)}
                    subtitleStartTime={subtitle.startTime}
                    subtitleEndTime={subtitle.endTime}
                    onPlayOriginal={onPlayOriginal ? () => onPlayOriginal(subtitle.id) : undefined}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

      {isCardMounted && cardPoint && cardPos
        ? createPortal((
          <div
            ref={cardRef}
            className="fixed z-[100] w-[360px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-gray-200 p-5"
            style={{ top: cardPos.top, left: cardPos.left }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-2xl font-bold text-gray-900 break-words">
                  {cardPoint.text}
                </div>
                {(cardPoint.phonetic || showPronunciationButton) && (
                  <div className="mt-2 flex items-center gap-2">
                    {cardPoint.phonetic && (
                      <div className="text-base text-gray-500 italic">
                        {cardPoint.phonetic}
                      </div>
                    )}
                    {showPronunciationButton && (
                      <button
                        onClick={() => playPronunciation(cardPoint.text)}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        title="播放发音"
                      >
                        <svg className={`w-3.5 h-3.5 ${isSpeaking ? 'text-purple-600' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.25 4.5a.75.75 0 011.5 0v11a.75.75 0 01-1.5 0V4.5zM6 7.75a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5zm6.5-2.25a.75.75 0 011.5 0v9a.75.75 0 01-1.5 0v-9z" />
                        </svg>
                        发音
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={closeCard}
                className="shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                aria-label="Close"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {cardPoint.meaning && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase">释义</div>
                <div className="mt-1 text-base font-semibold text-gray-900 leading-relaxed break-words">
                  {cardPoint.meaning}
                </div>
              </div>
            )}

            {cardPoint.helperSentence && (
              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 uppercase">用法</div>
                <div className="mt-2 inline-block max-w-full rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 break-words">
                  {cardPoint.helperSentence}
                </div>
              </div>
            )}
          </div>),
          document.body
        )
        : null}
    </React.Fragment>
  );
}
