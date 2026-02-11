import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: '请输入激活码' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 使用 RPC 函数验证激活码（安全）
    // 不直接查询表，防止攻击者窃取激活码
    const { data, error } = await supabase.rpc('verify_activation_code', {
      code_input: code
    });

    if (error) {
      console.error('验证激活码错误:', error);
      return NextResponse.json(
        { error: '验证失败，请稍后重试' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: '激活码无效或已被使用' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '激活码验证成功'
    });
  } catch (error) {
    console.error('验证激活码错误:', error);
    return NextResponse.json(
      { error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}
