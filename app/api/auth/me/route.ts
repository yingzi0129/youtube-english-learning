import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTrialUser } from '@/lib/auth/trial';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const url = request.nextUrl;
    const lite = url.searchParams.get('lite') === '1';
    let role: string | null = null;

    if (!lite) {
      const { data: roleData } = await supabase.rpc('get_user_role');
      role = roleData || 'user';
    } else {
      const roleHint = (user.user_metadata as any)?.role || (user.app_metadata as any)?.role;
      role = roleHint || 'user';
    }

    return NextResponse.json(
      {
        id: user.id,
        phone: user.user_metadata?.phone || null,
        role: role || 'user',
        isTrial: isTrialUser(user),
      },
      {
        headers: {
          'Cache-Control': lite
            ? 'private, max-age=30, stale-while-revalidate=60'
            : 'private, max-age=10, stale-while-revalidate=30',
          'Vary': 'Cookie',
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
