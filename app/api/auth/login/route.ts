import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
