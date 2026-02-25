import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { randomInt } from 'crypto';

const TEMP_PASSWORD_LENGTH = 8;
const TEMP_PASSWORD_TTL_HOURS = 24;
const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateTempPassword = () => {
  let result = '';
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i += 1) {
    result += TEMP_PASSWORD_CHARS[randomInt(0, TEMP_PASSWORD_CHARS.length)];
  }
  return result;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const userId = params.id;

    if (!userId || userId === 'undefined') {
      return NextResponse.json(
        { error: '无效的用户ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: '无权限操作' },
        { status: 403 }
      );
    }

    const tempPassword = generateTempPassword();
    const expiresAt = new Date(Date.now() + TEMP_PASSWORD_TTL_HOURS * 60 * 60 * 1000);

    const adminClient = createAdminClient();
    const { error: resetError } = await adminClient.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (resetError) {
      console.error('重置密码失败:', resetError);
      return NextResponse.json(
        { error: '重置密码失败' },
        { status: 500 }
      );
    }

    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({
        must_change_password: true,
        temp_password_set_at: new Date().toISOString(),
        temp_password_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('更新用户状态失败:', profileUpdateError);
      return NextResponse.json(
        { error: '重置密码失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      temporaryPassword: tempPassword,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('重置密码失败:', error);
    return NextResponse.json(
      { error: error.message || '重置密码失败' },
      { status: 500 }
    );
  }
}
