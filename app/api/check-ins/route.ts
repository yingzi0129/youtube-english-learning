import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

export async function POST() {
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

    // 获取今日日期
    const todayDate = getChinaDate();

    // 检查今日是否已打卡
    const { data: existingCheckIn, error: checkError } = await supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', user.id)
      .eq('check_in_date', todayDate)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('检查打卡记录错误:', checkError);
      return NextResponse.json(
        { error: '检查打卡记录失败' },
        { status: 500 }
      );
    }

    // 如果今日已打卡，返回错误
    if (existingCheckIn) {
      return NextResponse.json(
        { error: '今日已打卡' },
        { status: 400 }
      );
    }

    // 创建打卡记录
    const { data: newCheckIn, error: insertError } = await supabase
      .from('check_ins')
      .insert({
        user_id: user.id,
        check_in_date: todayDate,
      })
      .select()
      .single();

    if (insertError) {
      console.error('创建打卡记录错误:', insertError);
      return NextResponse.json(
        { error: '打卡失败' },
        { status: 500 }
      );
    }

    // 获取更新后的打卡总天数
    const { count: checkInCount, error: countError } = await supabase
      .from('check_ins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      console.error('获取打卡天数错误:', countError);
    }

    return NextResponse.json({
      success: true,
      checkInDays: checkInCount || 0,
      checkInDate: todayDate,
    });
  } catch (error) {
    console.error('打卡错误:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
