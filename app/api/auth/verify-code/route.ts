import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: '请输入激活码' },
        { status: 400 }
      );
    }

    // 查询激活码是否存在且未使用
    const { data, error } = await supabase
      .from('activation_codes')
      .select('*')
      .eq('code', code)
      .eq('is_used', false)
      .single();

    if (error || !data) {
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
