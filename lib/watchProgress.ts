import { createClient } from '@/lib/supabase/client';

/**
 * 更新视频观看进度
 * @param videoId 视频ID
 * @param progressSeconds 观看进度（秒）
 * @param durationSeconds 视频总时长（秒）
 */
export async function updateWatchProgress(
  videoId: string,
  progressSeconds: number,
  durationSeconds: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: '用户未登录' };
    }

    // 使用 upsert 插入或更新观看记录
    const { error: upsertError } = await supabase
      .from('watch_history')
      .upsert(
        {
          user_id: user.id,
          video_id: videoId,
          progress_seconds: Math.floor(progressSeconds),
          duration_seconds: Math.floor(durationSeconds),
        },
        {
          onConflict: 'user_id,video_id',
        }
      );

    if (upsertError) {
      console.error('更新观看进度错误:', upsertError);
      return { success: false, error: '更新观看进度失败' };
    }

    return { success: true };
  } catch (error) {
    console.error('更新观看进度错误:', error);
    return { success: false, error: '更新观看进度失败' };
  }
}

/**
 * 获取视频的观看进度
 * @param videoId 视频ID
 * @returns 观看进度（秒），如果没有记录则返回 0
 */
export async function getWatchProgress(videoId: string): Promise<number> {
  try {
    const supabase = createClient();

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return 0;
    }

    // 查询观看记录
    const { data, error } = await supabase
      .from('watch_history')
      .select('progress_seconds')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.progress_seconds;
  } catch (error) {
    console.error('获取观看进度错误:', error);
    return 0;
  }
}
