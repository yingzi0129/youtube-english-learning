import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/auth/permissions';

export async function GET() {
  try {
    // 检查是否为管理员
    const adminCheck = await isAdmin();
    if (!adminCheck) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const supabase = await createClient();

    // 并发获取统计数据
    const [
      { count: videosCount },
      { count: usersCount },
      { count: activationCodesCount },
      { count: usedCodesCount },
    ] = await Promise.all([
      supabase.from('videos').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('activation_codes').select('*', { count: 'exact', head: true }),
      supabase.from('activation_codes').select('*', { count: 'exact', head: true }).eq('is_used', true),
    ]);

    return NextResponse.json({
      videos: videosCount || 0,
      users: usersCount || 0,
      activationCodes: activationCodesCount || 0,
      usedCodes: usedCodesCount || 0,
    });
  } catch (error: any) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}
