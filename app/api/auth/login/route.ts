import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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

    // 1. 查询用户
    const { data: user, error } = await supabaseServer
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: '手机号或密码错误' },
        { status: 401 }
      );
    }

    // 2. 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: '手机号或密码错误' },
        { status: 401 }
      );
    }

    // 3. 生成新的 session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // 4. 更新用户的 session token 和最后登录时间
    await supabaseServer
      .from('users')
      .update({
        session_token: sessionToken,
        last_login_at: new Date().toISOString()
      })
      .eq('id', user.id);

    // 5. 返回用户信息和 session token
    return NextResponse.json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        phone: user.phone,
        created_at: user.created_at
      },
      sessionToken: sessionToken
    });
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
