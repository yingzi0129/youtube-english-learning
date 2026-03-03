'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import ForcePasswordChangeModal from './ForcePasswordChangeModal';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const supabase = createClient();

  const checkAuth = async () => {
    if (pathname === '/login' || pathname === '/register') {
      setIsChecking(false);
      setMustChangePassword(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // 添加时间戳避免缓存，并使用 single() 确保获取最新数据
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('must_change_password')
      .eq('id', user.id)
      .single();

    if (profileError) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('获取用户状态失败:', profileError);
      }
      setMustChangePassword(false);
      setIsChecking(false);
      return;
    }

    console.log('查询到的用户状态:', profile);
    setMustChangePassword(Boolean(profile?.must_change_password));
    setIsChecking(false);
  };

  const handlePasswordChangeSuccess = async () => {
    console.log('密码修改成功回调，重新检查用户状态');
    // 重新检查用户状态，确保数据库更新生效
    setIsChecking(true);
    await checkAuth();
  };

  useEffect(() => {

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
        setMustChangePassword(false);
      } else if (event === 'SIGNED_IN') {
        setIsChecking(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <ForcePasswordChangeModal
        open={mustChangePassword}
        onSuccess={handlePasswordChangeSuccess}
      />
    </>
  );
}
