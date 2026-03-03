import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

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

    // 使用管理员客户端更新 profiles 表（绕过 RLS）
    const adminClient = createAdminClient();
    const { error: profileError } = await adminClient
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
        { error: '更新用户状态失败' },
        { status: 500 }
      );
    }

    // 验证更新是否成功
    const { data: updatedProfile } = await adminClient
      .from('profiles')
      .select('must_change_password')
      .eq('id', user.id)
      .single();

    console.log('密码更新成功，用户状态:', updatedProfile);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('更新密码失败:', error);
    return NextResponse.json(
      { error: error.message || '更新密码失败' },
      { status: 500 }
    );
  }
}
