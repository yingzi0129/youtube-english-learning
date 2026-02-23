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
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const isTrial = isTrialUser(user);

    // 获取视频总数
    let videoQuery = supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false);

    if (isTrial) {
      videoQuery = videoQuery.eq('is_trial', true);
    }

    const { count: videoCount, error: videoError } = await videoQuery;

    if (videoError) {
      console.error('获取视频总数错误:', videoError);
      return NextResponse.json(
        { error: '获取视频总数失败' },
        { status: 500 }
      );
    }

    // 获取打卡总天数
    const { count: checkInCount, error: checkInError } = await supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (checkInError) {
      console.error('获取打卡天数错误:', checkInError);
      return NextResponse.json(
        { error: '获取打卡天数失败' },
        { status: 500 }
      );
    }

    // 检查今日是否已打卡
    const todayDate = getChinaDate();
    const { data: todayCheckIn, error: todayError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', user.id)
      .eq('check_in_date', todayDate)
      .single();

    if (todayError && todayError.code !== 'PGRST116') {
      // PGRST116 表示没有找到记录，这是正常的
      console.error('检查今日打卡错误:', todayError);
      return NextResponse.json(
        { error: '检查今日打卡失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      videoCount: videoCount || 0,
      checkInDays: checkInCount || 0,
      hasCheckedInToday: !!todayCheckIn,
    });
  } catch (error) {
    console.error('获取打卡统计数据错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
