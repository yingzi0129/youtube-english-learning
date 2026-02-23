'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HomeClient from './HomeClient';

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

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const authResp = await fetch('/api/auth/me');
        if (!authResp.ok) {
          router.push('/login');
          return;
        }
        const authData: AuthResponse = await authResp.json();

        if (authData?.isTrial) {
          router.replace('/trial');
          return;
        }

        if (!cancelled) {
          setIsAdmin(authData?.role === 'admin');
          setUserLabel(authData?.phone ? authData.phone : undefined);
        }

        const videosResp = await fetch('/api/videos');
        const videosData = await videosResp.json();
        if (!videosResp.ok) {
          throw new Error(videosData?.error || '获取视频失败');
        }

        if (!cancelled) {
          setVideos(videosData?.videos || []);
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
    };
  }, [router]);

  return (
    <HomeClient
      isAdmin={isAdmin}
      videos={videos}
      error={error}
      userLabel={userLabel}
      isLoading={isLoading}
    />
  );
}
