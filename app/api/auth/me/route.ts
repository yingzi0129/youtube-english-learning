import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTrialUser } from '@/lib/auth/trial';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { data: role } = await supabase.rpc('get_user_role');

    return NextResponse.json(
      {
        id: user.id,
        phone: user.user_metadata?.phone || null,
        role: role || 'user',
        isTrial: isTrialUser(user),
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
