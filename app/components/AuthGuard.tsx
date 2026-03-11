'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  clearMustChangePasswordCache,
  readMustChangePassword,
  writeMustChangePassword,
} from '@/lib/auth/must-change';
import ForcePasswordChangeModal from './ForcePasswordChangeModal';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  const checkAuth = async () => {
    if (pathname === '/login' || pathname === '/register') {
      setIsChecking(false);
      setMustChangePassword(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      clearMustChangePasswordCache();
      setCurrentUserId(null);
      router.push('/login');
      return;
    }

    setCurrentUserId(user.id);

    // 优先使用本地缓存，避免每次刷新都查库
    const cached = readMustChangePassword(user.id);
    if (cached !== null) {
      setMustChangePassword(cached);
      setIsChecking(false);
      return;
    }

    // 缓存缺失时再查询一次数据库并写入缓存
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

    const mustChange = Boolean(profile?.must_change_password);
    writeMustChangePassword(user.id, mustChange);
    console.log('查询到的用户状态:', profile);
    setMustChangePassword(mustChange);
    setIsChecking(false);
  };

  const handlePasswordChangeSuccess = async () => {
    console.log('密码修改成功回调，更新本地状态');
    if (currentUserId) {
      writeMustChangePassword(currentUserId, false);
    }
    setMustChangePassword(false);
    setIsChecking(false);
  };

  useEffect(() => {

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearMustChangePasswordCache();
        setCurrentUserId(null);
        router.push('/login');
        setMustChangePassword(false);
      } else if (event === 'SIGNED_IN') {
        const userId = session?.user?.id;
        setCurrentUserId(userId ?? null);
        const cached = readMustChangePassword(userId);
        if (cached !== null) {
          setMustChangePassword(cached);
        }
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
