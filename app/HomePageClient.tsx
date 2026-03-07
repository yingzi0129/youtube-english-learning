'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HomeClient from './HomeClient';
import { useFavoritesStore } from '@/lib/stores/favorites-store';

type VideoItem = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  duration_minutes: number;
  creator: string;
  tags: string[];
  difficulty: '初级' | '中级' | '高级';
  date: string;
};

type AuthResponse = {
  id: string;
  phone?: string | null;
  role?: 'user' | 'admin';
  isTrial?: boolean;
};

export default function HomePageClient() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLabel, setUserLabel] = useState<string | undefined>(undefined);
  const { fetchFavorites } = useFavoritesStore();
  const isMobile = typeof window !== 'undefined'
    ? window.matchMedia('(max-width: 768px)').matches
      || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    : false;
  const favoritesDelayMs = isMobile ? 1200 : 0;
  const statsDelayMs = isMobile ? 1500 : 0;

  useEffect(() => {
    let cancelled = false;
    let favoritesTimer: ReturnType<typeof setTimeout> | null = null;
    const videosController = new AbortController();
    const videosPromise = fetch('/api/videos?fields=card', { signal: videosController.signal }).catch((err: any) => {
      if (err?.name === 'AbortError') {
        return null;
      }
      throw err;
    });

    const loadData = async () => {
      try {
        const authResp = await fetch('/api/auth/me?lite=1');
        if (!authResp.ok) {
          videosController.abort();
          router.push('/login');
          return;
        }
        const authData: AuthResponse = await authResp.json();

        if (authData?.isTrial) {
          videosController.abort();
          router.replace('/trial');
          return;
        }

        if (!cancelled) {
          setIsAdmin(authData?.role === 'admin');
          setUserLabel(authData?.phone ? authData.phone : undefined);
        }

        const videosResp = await videosPromise;
        if (!videosResp) {
          return;
        }
        const videosData = await videosResp.json();
        if (!videosResp.ok) {
          throw new Error(videosData?.error || '获取视频失败');
        }

        if (!cancelled) {
          setVideos(videosData?.videos || []);
          // 加载收藏数据（仅需要 IDs）
          if (favoritesDelayMs > 0) {
            favoritesTimer = setTimeout(() => {
              if (!cancelled) {
                fetchFavorites(undefined, 'ids');
              }
            }, favoritesDelayMs);
          } else {
            fetchFavorites(undefined, 'ids');
          }
        }

        // 在后台补充角色信息，不阻塞首屏
        if (!cancelled && authData?.role !== 'admin') {
          setTimeout(async () => {
            try {
              const roleResp = await fetch('/api/auth/me');
              if (!roleResp.ok) return;
              const roleData: AuthResponse = await roleResp.json();
              if (!cancelled) {
                setIsAdmin(roleData?.role === 'admin');
              }
            } catch {
              // ignore
            }
          }, 500);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();
    return () => {
      cancelled = true;
      if (favoritesTimer) {
        clearTimeout(favoritesTimer);
      }
      videosController.abort();
    };
  }, [router, fetchFavorites, favoritesDelayMs]);

  return (
    <HomeClient
      isAdmin={isAdmin}
      videos={videos}
      error={error}
      userLabel={userLabel}
      isLoading={isLoading}
      statsDelayMs={statsDelayMs}
    />
  );
}
