import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const phone = process.env.TRIAL_PHONE?.trim();
    const password = process.env.TRIAL_PASSWORD;

    if (!phone || !password) {
      return NextResponse.json(
        { error: '试用账号未配置' },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const email = `${phone}@app.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: '试用登录失败' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '试用登录成功',
    });
  } catch (error) {
    console.error('试用登录错误:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
