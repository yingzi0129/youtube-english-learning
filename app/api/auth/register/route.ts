import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

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

    // 1. 再次验证激活码是否有效
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

    // 2. 检查手机号是否已注册
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: '该手机号已被注册' },
        { status: 400 }
      );
    }

    // 3. 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. 创建用户
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        phone,
        password_hash: passwordHash,
        activation_code: activationCode
      })
      .select()
      .single();

    if (userError) {
      console.error('创建用户错误:', userError);
      return NextResponse.json(
        { error: '注册失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 5. 标记激活码为已使用
    const { error: updateError } = await supabase
      .from('activation_codes')
      .update({
        is_used: true,
        used_by_user_id: newUser.id,
        used_at: new Date().toISOString()
      })
      .eq('code', activationCode);

    if (updateError) {
      console.error('更新激活码状态错误:', updateError);
      // 这里不返回错误，因为用户已经创建成功
    }

    return NextResponse.json({
      success: true,
      message: '注册成功',
      user: {
        id: newUser.id,
        phone: newUser.phone
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
