﻿﻿﻿﻿'use client';

import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import AudioRecorder from '@/app/components/AudioRecorder';
import FavoriteButton from '@/app/components/FavoriteButton';
import { createClient } from '@/lib/supabase/client';

interface Subtitle {
  id: number;
  dbId?: string; // 数据库字幕 ID（UUID），用于收藏功能
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
  isLoadingSubtitles?: boolean;
  hasMoreAfter?: boolean;
  hasMoreBefore?: boolean;
  onLoadAfter?: () => void;
  onLoadBefore?: () => void;
  currentTime?: number;
  // 新增：按字幕 ID 跳转（支持父组件的智能回退）
  onSeekToSubtitle?: (subtitleId: number) => void;
  onSeek?: (time: number) => void; // 备用方案
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
  isLoadingSubtitles = false,
  hasMoreAfter = false,
  hasMoreBefore = false,
  onLoadAfter,
  onLoadBefore,
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
  const desktopListRef = useRef<HTMLDivElement>(null);
  const desktopTopSentinelRef = useRef<HTMLDivElement>(null);
  const desktopBottomSentinelRef = useRef<HTMLDivElement>(null);
  const mobileListRef = useRef<HTMLDivElement>(null);
  const mobileTopSentinelRef = useRef<HTMLDivElement>(null);
  const mobileBottomSentinelRef = useRef<HTMLDivElement>(null);
  const [pinnedSubtitleId, setPinnedSubtitleId] = useState<number | null>(null);

  // 填空模式：默认遮挡所有学习点，点击后显示
  // 使用 `${subtitleId}:${learningPointId}` 作为键，避免跨字幕冲突
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  // 单词卡弹层状态（桌面端为主，使用 Portal 避免裁切）
  const [cardPoint, setCardPoint] = useState<LearningPoint | null>(null);
  const [cardAnchor, setCardAnchor] = useState<DOMRect | null>(null);
  const [isCardMounted, setIsCardMounted] = useState(false);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const showPronunciationButton = false;
  const [isExporting, setIsExporting] = useState(false);
  // Tab 切换状态（仅桌面端使用）
  const [activeTab, setActiveTab] = useState<'subtitle' | 'loop' | 'practice'>('subtitle');

  useEffect(() => {
    // Portal 需要在浏览器 DOM 中挂载
    setIsCardMounted(true);
  }, []);

  // 进入填空模式时重置显示状态（按要求：点击前全部遮挡）
  useEffect(() => {
    if (isClozeMode) {
      setRevealed({});
      setCardPoint(null);
      setCardAnchor(null);
    }
  }, [isClozeMode]);

  // 根据当前播放时间计算激活的字幕 ID
  const activeSubtitleIdByTime = useMemo(() => {
    const activeSubtitle = subtitles.find(
      (sub) => currentTime >= sub.startTime && currentTime < sub.endTime
    );
    return activeSubtitle?.id || null;
  }, [currentTime, subtitles]);

  // 智能回退：当回退到字幕开始前一点时，保持点击字幕高亮
  // 直到播放时间到达该字幕的起始时间
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

  // 桌面端：点击外部/滚动/缩放时关闭弹层
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

    // 横向限制在视口内
    left = Math.min(Math.max(margin, left), window.innerWidth - rect.width - margin);

    // 优先显示在下方，空间不足时显示在上方
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

  const toggleRevealPoint = (subtitleId: number, pointId: string) => {
    const key = getRevealKey(subtitleId, pointId);
    setRevealed((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: true };
    });
  };

  const showCard = (point: LearningPoint, anchorEl: HTMLElement) => {
    setCardPoint(point);
    const rect = anchorEl.getBoundingClientRect();
    setCardAnchor(rect);
    // 初始位置（测量卡片后可能调整）
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

  const getDownloadFilename = (contentDisposition: string | null) => {
    if (!contentDisposition) return null;
    const utf8Match = contentDisposition.match(/filename\*\=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        return utf8Match[1];
      }
    }
    const asciiMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
    return asciiMatch?.[1] || null;
  };

  const handleExportSubtitles = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const response = await fetch(`/api/videos/${videoId}/export-subtitles`);
      if (!response.ok) {
        let errorMessage = '导出失败，请稍后重试';
        try {
          const data = await response.json();
          if (data?.error) errorMessage = data.error;
        } catch {
          // 忽略
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = getDownloadFilename(response.headers.get('content-disposition')) || '字幕.docx';
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error(error);
      window.alert(error?.message || '导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
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

    // 去重重叠：保留起始最早或同起点更长的项
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

            if (isClozeMode) {
              toggleRevealPoint(subtitleId, p.id);
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
          title={isMasked ? '点击显示' : '点击查看释义'}
        >
          {segment}
        </span>
      );

      i = p.end;
    }

    if (i < text.length) nodes.push(<span key={`t:${i}:end`}>{text.slice(i)}</span>);
    return nodes;
  };

  // 自动滚动字幕列表：当激活字幕接近底部或超出可视区时，滚动到列表顶部附近
  const getActiveListParts = () => {
    const desktop = {
      container: desktopListRef.current,
      top: desktopTopSentinelRef.current,
      bottom: desktopBottomSentinelRef.current,
    };
    const mobile = {
      container: mobileListRef.current,
      top: mobileTopSentinelRef.current,
      bottom: mobileBottomSentinelRef.current,
    };
    const isVisible = (el: HTMLElement | null) => !!el && el.offsetParent !== null;
    if (isVisible(desktop.container)) return desktop;
    if (isVisible(mobile.container)) return mobile;
    return desktop.container ? desktop : mobile;
  };

  const scrollToActiveSubtitle = (behavior: ScrollBehavior = 'smooth') => {
    if (activeSubtitleId == null) return false;

    const { container } = getActiveListParts();
    if (!container) return false;

    const el = container.querySelector<HTMLElement>(`[data-subtitle-id="${activeSubtitleId}"]`);
    if (!el) return false;

    const computed = window.getComputedStyle(container);
    const overflowY = computed.overflowY;
    const isScrollable =
      (overflowY === 'auto' || overflowY === 'scroll') &&
      container.scrollHeight > container.clientHeight + 1;

    if (isScrollable) {
      // 直接让容器滚到当前字幕，避免计算误差
      el.scrollIntoView({ behavior, block: 'center', inline: 'nearest' });
    } else {
      // 移动端列表不滚动时，改为滚动页面，确保当前字幕在吸顶视频下方
      const elRect = el.getBoundingClientRect();
      const stickyVideo = document.querySelector<HTMLElement>('[data-sticky-video="true"]');
      const stickyBottom = stickyVideo?.getBoundingClientRect().bottom;
      const topOffset = (typeof stickyBottom === 'number' ? stickyBottom : 88) + 12;
      const lowerThreshold = window.innerHeight * 0.75;

      if (elRect.top < topOffset || elRect.top > lowerThreshold) {
        const targetTop = window.scrollY + elRect.top - topOffset;
        window.scrollTo({ top: Math.max(0, targetTop), behavior });
      }
    }

    return true;
  };

  // 自动滚动字幕列表：字幕异步加载完成后也要触发一次定位
  useEffect(() => {
    if (activeTab !== 'subtitle') return;
    if (activeSubtitleId == null) return;

    let raf1 = 0;
    let raf2 = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        const ok = scrollToActiveSubtitle('smooth');
        if (!ok) {
          retryTimer = setTimeout(() => scrollToActiveSubtitle('smooth'), 120);
        }
      });
    });

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [activeSubtitleId, subtitles.length, activeTab]);

  useEffect(() => {
    if (!onLoadAfter && !onLoadBefore) return;
    const { container, top, bottom } = getActiveListParts();
    if (!top && !bottom) return;

    const root = (() => {
      if (!container) return null;
      const overflowY = window.getComputedStyle(container).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') return container;
      return null;
    })();

    const observer = new IntersectionObserver(
      (entries) => {
        if (isLoadingSubtitles) return;
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target === bottom && hasMoreAfter && onLoadAfter) {
            onLoadAfter();
          }
          if (entry.target === top && hasMoreBefore && onLoadBefore) {
            onLoadBefore();
          }
        });
      },
      { root, rootMargin: '200px 0px', threshold: 0.01 }
    );

    if (top) observer.observe(top);
    if (bottom) observer.observe(bottom);

    return () => observer.disconnect();
  }, [onLoadAfter, onLoadBefore, hasMoreAfter, hasMoreBefore, isLoadingSubtitles]);

  // 控制下拉菜单显示
  const [showLoopMenu, setShowLoopMenu] = useState(false);
  const [showPracticeMenu, setShowPracticeMenu] = useState(false);
  // 保存已有的录音记录
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

  // 格式化时间显示（秒转为 mm:ss）
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <React.Fragment>
      <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-lg border border-purple-100/50 overflow-hidden lg:sticky lg:top-24">

      
      <div className="hidden lg:flex bg-white/90 backdrop-blur-md border-b-2 border-gray-200">
        <button
          onClick={() => setActiveTab('subtitle')}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-4 transition-all text-sm font-medium
            ${activeTab === 'subtitle'
              ? 'text-purple-600 bg-gradient-to-r from-purple-50 to-pink-50 border-b-3 border-purple-600'
              : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/50'
            }
          `}
          style={activeTab === 'subtitle' ? { borderBottom: '3px solid rgb(147 51 234)' } : {}}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <span>字幕</span>
        </button>
        <button
          onClick={() => setActiveTab('loop')}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-4 transition-all text-sm font-medium
            ${activeTab === 'loop'
              ? 'text-purple-600 bg-gradient-to-r from-purple-50 to-pink-50 border-b-3 border-purple-600'
              : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/50'
            }
          `}
          style={activeTab === 'loop' ? { borderBottom: '3px solid rgb(147 51 234)' } : {}}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>循环</span>
        </button>
        <button
          onClick={() => setActiveTab('practice')}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-4 transition-all text-sm font-medium
            ${activeTab === 'practice'
              ? 'text-purple-600 bg-gradient-to-r from-purple-50 to-pink-50 border-b-3 border-purple-600'
              : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/50'
            }
          `}
          style={activeTab === 'practice' ? { borderBottom: '3px solid rgb(147 51 234)' } : {}}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>练习</span>
        </button>
      </div>

      
      <div className="lg:hidden px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          动态字幕        </h2>
      </div>
      
      
      {activeTab === 'subtitle' && (
        <div className="hidden lg:block">
          
          <div className="px-4 lg:px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSubtitleModeChange('bilingual')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  subtitleMode === 'bilingual'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
                }`}
              >
                双语
              </button>
              <button
                onClick={() => onSubtitleModeChange('chinese')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  subtitleMode === 'chinese'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => onSubtitleModeChange('english')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  subtitleMode === 'english'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
                }`}
              >
                英文
              </button>
              <button
                onClick={handleExportSubtitles}
                disabled={isExporting}
                className="ml-auto px-3 py-1.5 rounded-lg text-sm font-medium border border-purple-200 text-purple-600 bg-white hover:bg-purple-50 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isExporting ? '导出中...' : '导出字幕'}
              </button>
            </div>
          </div>

          
          <div
            ref={desktopListRef}
            className="p-4 space-y-3 h-[600px] overflow-y-auto"
          >
            <div ref={desktopTopSentinelRef} />
            {hasMoreBefore && subtitles.length > 0 && (
              <div className="text-center text-xs text-gray-400">向上滚动加载更早字幕</div>
            )}
            {subtitles.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-500">
                {isLoadingSubtitles ? '字幕加载中...' : '暂无字幕'}
              </div>
            )}
            {subtitles.map((subtitle) => {
              const isActive = subtitle.id === activeSubtitleId;

              return (
                <div
                  key={subtitle.id}
                  data-subtitle-id={subtitle.id}
                  className={`
                    p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer
                    ${
                      isActive
                        ? 'bg-yellow-50 border-yellow-400 shadow-md'
                        : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm'
                    }
                  `}
                  onClick={() => handleSubtitleClick(subtitle.id, subtitle.startTime)}
                >
                  
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`
                          text-xs font-bold px-2 py-1 rounded-full
                          ${isActive ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-100 text-gray-600'}
                        `}
                      >
                        {formatTime(subtitle.startTime)}
                      </span>
                      {isActive && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-yellow-700">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          播放中                        </span>
                      )}
                    </div>
                    {subtitle.dbId && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <FavoriteButton
                          type="subtitle_segment"
                          videoId={videoId}
                          itemId={subtitle.dbId}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>

                  
                  {(subtitleMode === 'bilingual' || subtitleMode === 'english') && (
                    <p
                      className={`
                        leading-relaxed font-semibold
                        ${subtitleMode === 'bilingual' ? 'mb-2' : ''}
                        ${isActive ? 'text-gray-900' : 'text-gray-700'}
                      `}
                      style={{ fontSize: `${fontSize}px` }}
                    >
                      {renderAnnotatedEnglish(subtitle.id, subtitle.text, subtitle.annotations)}
                    </p>
                  )}

                  
                  {(subtitleMode === 'bilingual' || subtitleMode === 'chinese') && (
                    <p
                      className={`
                        leading-relaxed
                        ${subtitleMode === 'chinese' ? 'font-semibold' : ''}
                        ${isActive ? 'text-gray-700' : 'text-gray-600'}
                      `}
                      style={{ fontSize: `${subtitleMode === 'bilingual' ? fontSize : fontSize - 2}px` }}
                    >
                      {subtitle.translation}
                    </p>
                  )}

                  
                  {isPracticeMode && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
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
            <div ref={desktopBottomSentinelRef} />
            {subtitles.length > 0 && (isLoadingSubtitles || hasMoreAfter) && (
              <div className="py-2 text-center text-xs text-gray-500">
                {isLoadingSubtitles ? '正在加载更多字幕...' : '继续向下滚动加载更多'}
              </div>
            )}
          </div>
        </div>
      )}

      
      {activeTab === 'loop' && (
        <div className="hidden lg:block">
          <div className="p-6 space-y-4 h-[600px] overflow-y-auto">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-3">视频循环</div>
              <div className="space-y-2">
                <button
                  onClick={() => onVideoLoopModeChange('single')}
                  className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all flex items-center justify-between ${
                    videoLoopMode === 'single'
                      ? 'bg-purple-50 text-purple-700 font-medium border-2 border-purple-200'
                      : 'bg-white text-gray-700 hover:bg-purple-50 border-2 border-gray-200'
                  }`}
                >
                  <span>单集播放</span>
                  {videoLoopMode === 'single' && <span className="text-purple-600 text-lg">✓</span>}
                </button>
                <button
                  onClick={() => onVideoLoopModeChange('loop')}
                  className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all flex items-center justify-between ${
                    videoLoopMode === 'loop'
                      ? 'bg-purple-50 text-purple-700 font-medium border-2 border-purple-200'
                      : 'bg-white text-gray-700 hover:bg-purple-50 border-2 border-gray-200'
                  }`}
                >
                  <span>单集循环</span>
                  {videoLoopMode === 'loop' && <span className="text-purple-600 text-lg">✓</span>}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-200 my-4"></div>

            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase mb-3">句子循环</div>
              <div className="space-y-2">
                <button
                  onClick={() => onSentenceLoopModeChange('continuous')}
                  className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all flex items-center justify-between ${
                    sentenceLoopMode === 'continuous'
                      ? 'bg-purple-50 text-purple-700 font-medium border-2 border-purple-200'
                      : 'bg-white text-gray-700 hover:bg-purple-50 border-2 border-gray-200'
                  }`}
                >
                  <span>连续播放</span>
                  {sentenceLoopMode === 'continuous' && <span className="text-purple-600 text-lg">✓</span>}
                </button>
                <button
                  onClick={() => onSentenceLoopModeChange('single')}
                  className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all flex items-center justify-between ${
                    sentenceLoopMode === 'single'
                      ? 'bg-purple-50 text-purple-700 font-medium border-2 border-purple-200'
                      : 'bg-white text-gray-700 hover:bg-purple-50 border-2 border-gray-200'
                  }`}
                >
                  <span>单句循环</span>
                  {sentenceLoopMode === 'single' && <span className="text-purple-600 text-lg">✓</span>}
                </button>
              </div>
            </div>

            {sentenceLoopMode === 'single' && (
              <>
                <div className="border-t border-gray-200 my-4"></div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-3">循环次数</div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, -1].map((count) => (
                      <button
                        key={count}
                        onClick={() => onLoopCountChange(count as LoopCount)}
                        className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                          loopCount === count
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-purple-50'
                        }`}
                      >
                        {count === -1 ? '无限' : `${count}次`}
                      </button>
                    ))}
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <div className="text-xs text-gray-500 mb-1">当前循环进度</div>
                    <div className="text-lg font-bold text-purple-600">
                      {loopCount === -1
                        ? `第 ${currentLoopIndex + 1} 次`
                        : `第 ${currentLoopIndex + 1} / ${loopCount} 次`}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      
      {activeTab === 'practice' && (
        <div className="hidden lg:block">
          <div className="p-6 space-y-4 h-[600px] overflow-y-auto">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3">英语练习</div>

            <button
              onClick={() => onPracticeModeChange(!isPracticeMode)}
              className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all flex items-center justify-between ${
                isPracticeMode
                  ? 'bg-purple-50 text-purple-700 font-medium border-2 border-purple-200'
                  : 'bg-white text-gray-700 hover:bg-purple-50 border-2 border-gray-200'
              }`}
            >
              <div>
                <div className="font-medium">跟读练习</div>
                <div className="text-xs text-gray-500 mt-1">录制你的发音并与原音对比</div>
              </div>
              {isPracticeMode && <span className="text-purple-600 text-lg">✓</span>}
            </button>

            <button
              onClick={() => onClozeModeChange(!isClozeMode)}
              className={`w-full px-4 py-3 text-left text-sm rounded-xl transition-all flex items-center justify-between ${
                isClozeMode
                  ? 'bg-purple-50 text-purple-700 font-medium border-2 border-purple-200'
                  : 'bg-white text-gray-700 hover:bg-purple-50 border-2 border-gray-200'
              }`}
            >
              <div>
                <div className="font-medium">填空练习</div>
                <div className="text-xs text-gray-500 mt-1">点击遮挡的单词来揭晓答案</div>
              </div>
              {isClozeMode && <span className="text-purple-600 text-lg">✓</span>}
            </button>

            {(isPracticeMode || isClozeMode) && (
              <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <div className="font-semibold mb-1">提示</div>
                    <div>
                      {isPracticeMode && '切换到“字幕”标签页开始跟读练习'}
                      {isClozeMode && !isPracticeMode && '切换到“字幕”标签页查看填空练习'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      
      <div className="lg:hidden">
        
        <div
          ref={mobileListRef}
          className={`p-3 space-y-2 ${
          themeMode === 'dark' ? 'bg-gray-900' : ''
        }`}
        >
          <div ref={mobileTopSentinelRef} />
          {hasMoreBefore && subtitles.length > 0 && (
            <div className={`text-center text-xs ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              向上滚动加载更早字幕
            </div>
          )}
          {subtitles.length === 0 && (
            <div className={`py-10 text-center text-sm ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {isLoadingSubtitles ? '字幕加载中...' : '暂无字幕'}
            </div>
          )}
          {subtitles.map((subtitle) => {
            const isActive = subtitle.id === activeSubtitleId;

            return (
              <div
                key={subtitle.id}
                data-subtitle-id={subtitle.id}
                className={`
                  p-3 rounded-xl border-2 transition-all duration-300 cursor-pointer
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
                
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`
                        text-xs font-bold px-2 py-0.5 rounded-full
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
                        播放中                      </span>
                    )}
                  </div>
                  {subtitle.dbId && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <FavoriteButton
                        type="subtitle_segment"
                        videoId={videoId}
                        itemId={subtitle.dbId}
                        size="sm"
                      />
                    </div>
                  )}
                </div>

                
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

                
                {isPracticeMode && (
                  <div className={`mt-2 pt-2 ${
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
          <div ref={mobileBottomSentinelRef} />
          {subtitles.length > 0 && (isLoadingSubtitles || hasMoreAfter) && (
            <div className={`py-2 text-center text-xs ${themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {isLoadingSubtitles ? '正在加载更多字幕...' : '继续向下滚动加载更多'}
            </div>
          )}
        </div>
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
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-2xl font-bold text-gray-900 break-words">
                    {cardPoint.text}
                  </div>
                  
                  <div onClick={(e) => e.stopPropagation()}>
                    <FavoriteButton
                      type="vocabulary"
                      videoId={videoId}
                      itemId={cardPoint.id}
                      size="md"
                    />
                  </div>
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
