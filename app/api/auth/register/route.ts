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

    // 1. 使用 RPC 函数验证激活码（安全）
    const { data: isValid, error: verifyError } = await supabase.rpc('verify_activation_code', {
      code_input: activationCode
    });

    console.log('验证激活码结果:', { isValid, verifyError });

    if (verifyError) {
      console.error('验证激活码 RPC 错误:', verifyError);
      return NextResponse.json(
        { error: '激活码验证失败：' + verifyError.message },
        { status: 500 }
      );
    }

    if (!isValid) {
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

    // 3. 使用 RPC 函数标记激活码为已使用（安全）
    if (authData.user) {
      const { data: marked, error: markError } = await supabase.rpc('mark_activation_code_used', {
        code_input: activationCode,
        user_id_input: authData.user.id
      });

      if (markError || !marked) {
        console.error('标记激活码错误:', markError);
        // 注意：用户已创建，但激活码未标记，这是一个边缘情况
      }
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
