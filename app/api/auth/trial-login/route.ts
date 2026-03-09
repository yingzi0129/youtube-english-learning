import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

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
    const email = `${phone}@app.example.com`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      // 如果密码错误，可能是试用账号修改了密码，尝试重置
      console.log('试用登录失败，尝试重置密码:', error?.message);

      const adminClient = createAdminClient();

      // 查找试用用户
      const { data: users } = await adminClient.auth.admin.listUsers();
      const trialUser = users?.users?.find(u => u.email === email);

      if (trialUser) {
        // 重置密码为环境变量中的密码
        const { error: resetError } = await adminClient.auth.admin.updateUserById(
          trialUser.id,
          { password }
        );

        if (resetError) {
          console.error('重置试用账号密码失败:', resetError);
          return NextResponse.json(
            { error: '试用登录失败' },
            { status: 401 }
          );
        }

        // 清除必须修改密码的标记
        await adminClient
          .from('profiles')
          .update({
            must_change_password: false,
            temp_password_set_at: null,
            temp_password_expires_at: null,
          })
          .eq('id', trialUser.id);

        // 重新尝试登录
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (retryError || !retryData.user) {
          return NextResponse.json(
            { error: '试用登录失败' },
            { status: 401 }
          );
        }

        return NextResponse.json({
          success: true,
          message: '试用登录成功',
        });
      }

      return NextResponse.json(
        { error: '试用登录失败' },
        { status: 401 }
      );
    }

    // 登录成功后，确保试用账号不需要修改密码
    const adminClient = createAdminClient();
    await adminClient
      .from('profiles')
      .update({
        must_change_password: false,
        temp_password_set_at: null,
        temp_password_expires_at: null,
      })
      .eq('id', data.user.id);

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
