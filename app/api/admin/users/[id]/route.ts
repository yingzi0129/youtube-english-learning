import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = await request.json();
    const params = await context.params;
    const userId = params.id;

    // 验证 userId
    if (!userId || userId === 'undefined') {
      return NextResponse.json(
        { error: '无效的用户ID' },
        { status: 400 }
      );
    }

    // 验证角色值
    if (!role || !['user', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: '无效的角色值' },
        { status: 400 }
      );
    }

    // 直接更新用户角色（RLS 策略会验证管理员权限）
    const supabase = await createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      console.error('更新用户角色失败:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('更新用户角色失败:', error);
    return NextResponse.json(
      { error: error.message || '更新失败' },
      { status: 500 }
    );
  }
}
