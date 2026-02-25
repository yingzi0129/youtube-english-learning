import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json();

    // 验证输入
    if (!phone || !password) {
      return NextResponse.json(
        { error: '请输入手机号和密码' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 使用 Supabase Auth 登录
    // 将手机号转换为 email 格式
    const email = `${phone}@app.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: '手机号或密码错误' },
        { status: 401 }
      );
    }

    // 返回用户信息
    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('must_change_password, temp_password_expires_at')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('获取用户状态失败:', profileError);
    }

    if (profile?.must_change_password && profile.temp_password_expires_at) {
      const expiresAt = new Date(profile.temp_password_expires_at);
      if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
        await supabase.auth.signOut();
        return NextResponse.json(
          { error: '临时密码已过期，请联系管理员重置' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: data.user.id,
        phone: data.user.user_metadata.phone,
        created_at: data.user.created_at
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
