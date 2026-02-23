import HomeClient from '../HomeClient';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/permissions';
import { getTrialContext } from '@/lib/auth/trial';
import { redirect } from 'next/navigation';

export default async function TrialPage() {
  const { isTrial } = await getTrialContext();
  if (!isTrial) {
    redirect('/');
  }

  const userRole = await getUserRole();
  const isAdmin = userRole === 'admin';

  const supabase = await createClient();

  const { data: settingsData, error: settingsError } = await supabase
    .from('trial_page_settings')
    .select('notice_title, notice_content, is_active')
    .eq('key', 'default')
    .limit(1);

  const settings = settingsError ? null : settingsData?.[0];
  const notice = settings?.is_active && settings.notice_content
    ? { title: settings.notice_title || undefined, content: settings.notice_content }
    : null;

  const { data: videosData, error } = await supabase
    .from('videos')
    .select('*')
    .eq('is_deleted', false)
    .eq('is_trial', true)
    .order('published_at', { ascending: false });

  const videos = videosData?.map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    thumbnail: video.thumbnail_url,
    duration: `${video.duration_minutes}分钟`,
    duration_minutes: video.duration_minutes,
    creator: video.creator_name,
    tags: video.tags || [],
    difficulty: video.difficulty as '初级' | '中级' | '高级',
    date: new Date(video.published_at).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).replace(/\//g, '/'),
  })) || [];

  return (
    <HomeClient
      isAdmin={isAdmin}
      videos={videos}
      error={error}
      userLabel="试用用户"
      notice={notice}
    />
  );
}
