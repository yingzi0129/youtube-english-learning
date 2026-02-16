import HomeClient from './HomeClient';
import { createClient } from '@/lib/supabase/server';
import { getUserRole } from '@/lib/auth/permissions';

export default async function Home() {
  // 获取当前用户角色
  const userRole = await getUserRole();
  const isAdmin = userRole === 'admin';

  // 从数据库获取视频数据
  const supabase = await createClient();
  const { data: videosData, error } = await supabase
    .from('videos')
    .select('*')
    .eq('is_deleted', false)
    .order('published_at', { ascending: false });

  // 格式化视频数据
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

  return <HomeClient isAdmin={isAdmin} videos={videos} error={error} />;
}
