import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTrialUser } from '@/lib/auth/trial';

// 获取中国时区的今日日期（格式：YYYY-MM-DD）
function getChinaDate(): string {
  const now = new Date();
  // 转换为中国时区（UTC+8）
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const year = chinaTime.getUTCFullYear();
  const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(chinaTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      const response = NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    const isTrial = isTrialUser(user);

    // 获取视频总数
    let videoQuery = supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('is_deleted', false);

    if (isTrial) {
      videoQuery = videoQuery.eq('is_trial', true);
    }

    // 获取打卡总天数
    const checkInQuery = supabase
      .from('check_ins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // 检查今日是否已打卡
    const todayDate = getChinaDate();
    const todayQuery = supabase
      .from('check_ins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('check_in_date', todayDate);

    const [videoRes, checkInRes, todayRes] = await Promise.all([
      videoQuery,
      checkInQuery,
      todayQuery,
    ]);

    if (videoRes.error) {
      console.error('获取视频总数错误:', videoRes.error);
      const response = NextResponse.json(
        { error: '获取视频总数失败' },
        { status: 500 }
      );
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    if (checkInRes.error) {
      console.error('获取打卡天数错误:', checkInRes.error);
      const response = NextResponse.json(
        { error: '获取打卡天数失败' },
        { status: 500 }
      );
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    if (todayRes.error) {
      console.error('检查今日打卡错误:', todayRes.error);
      const response = NextResponse.json(
        { error: '检查今日打卡失败' },
        { status: 500 }
      );
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }

    const response = NextResponse.json({
      videoCount: videoRes.count || 0,
      checkInDays: checkInRes.count || 0,
      hasCheckedInToday: (todayRes.count || 0) > 0,
    });
    response.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    response.headers.set('Vary', 'Cookie');
    return response;
  } catch (error) {
    console.error('获取打卡统计数据错误:', error);
    const response = NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
}
