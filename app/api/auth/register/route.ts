import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { phone, password, activationCode } = await request.json();

    // 验证输入
    if (!phone || !password || !activationCode) {
      return NextResponse.json(
        { error: '请填写完整信息' },
        { status: 400 }
      );
    }

    // 验证手机号格式（11位数字）
    if (!/^[0-9]{11}$/.test(phone)) {
      return NextResponse.json(
        { error: '手机号格式不正确，请输入11位数字' },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少为6位' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. 验证激活码是否有效
    const { data: codeData, error: codeError } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('code', activationCode)
      .eq('is_used', false)
      .single();

    if (codeError || !codeData) {
      return NextResponse.json(
        { error: '激活码无效或已被使用' },
        { status: 400 }
      );
    }

    // 2. 使用 Supabase Auth 注册用户
    // 将手机号作为 email（格式：phone@app.local）
    const email = `${phone}@app.local`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          phone: phone,
          activation_code: activationCode
        }
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: '该手机号已被注册' },
          { status: 400 }
        );
      }
      console.error('注册错误:', authError);
      return NextResponse.json(
        { error: '注册失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 3. 标记激活码为已使用
    if (authData.user) {
      await supabase
        .from('activation_codes')
        .update({
          is_used: true,
          used_by_user_id: authData.user.id,
          used_at: new Date().toISOString()
        })
        .eq('code', activationCode);
    }

    return NextResponse.json({
      success: true,
      message: '注册成功',
      user: {
        id: authData.user?.id,
        phone: phone
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
