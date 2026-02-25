import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: '请填写新密码' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少为 6 位' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      console.error('更新密码失败:', updateError);
      return NextResponse.json(
        { error: '更新密码失败' },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        must_change_password: false,
        temp_password_set_at: null,
        temp_password_expires_at: null,
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('更新用户状态失败:', profileError);
      return NextResponse.json(
        { error: '更新密码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('更新密码失败:', error);
    return NextResponse.json(
      { error: error.message || '更新密码失败' },
      { status: 500 }
    );
  }
}
