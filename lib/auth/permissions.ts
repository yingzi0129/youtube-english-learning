import { createClient } from '@/lib/supabase/server';

/**
 * 获取当前用户的角色
 * @returns 用户角色 ('user' | 'admin') 或 null（未登录）
 */
export async function getUserRole(): Promise<'user' | 'admin' | null> {
  try {
    const supabase = await createClient();

    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // 使用RPC函数获取角色（绕过RLS限制）
    const { data: role, error: roleError } = await supabase.rpc('get_user_role');

    if (roleError) {
      console.error('获取用户角色RPC错误:', roleError);
      return null;
    }

    return role as 'user' | 'admin';
  } catch (error) {
    console.error('获取用户角色失败:', error);
    return null;
  }
}

/**
 * 检查当前用户是否为管理员
 * @returns true 表示是管理员，false 表示不是
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin';
}

/**
 * 获取当前用户信息（包含角色）
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // 使用RPC函数获取角色（绕过RLS限制）
    const { data: role, error: roleError } = await supabase.rpc('get_user_role');

    if (roleError) {
      console.error('获取用户角色RPC错误:', roleError);
    }

    // 尝试从profiles表获取完整信息（用于显示）
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email,
      phone: profile?.phone || user.user_metadata?.phone,
      role: (role || 'user') as 'user' | 'admin',
      created_at: user.created_at,
    };
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}
