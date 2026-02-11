import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionToken } = await request.json();

    if (!userId || !sessionToken) {
      return NextResponse.json(
        { valid: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 查询用户的 session token
    const { data: user, error } = await supabaseServer
      .from('users')
      .select('session_token')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { valid: false, error: '用户不存在' },
        { status: 404 }
      );
    }

    // 验证 session token 是否匹配
    if (user.session_token !== sessionToken) {
      return NextResponse.json(
        { valid: false, error: '登录已失效，请重新登录' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      message: 'Session 有效'
    });
  } catch (error) {
    console.error('验证 session 错误:', error);
    return NextResponse.json(
      { valid: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
