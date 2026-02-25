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

  useEffect(() => {
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

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('获取用户状态失败:', profileError);
        }
        setMustChangePassword(false);
        setIsChecking(false);
        return;
      }

      setMustChangePassword(Boolean(profile?.must_change_password));
      setIsChecking(false);
    };

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
        onSuccess={() => setMustChangePassword(false)}
      />
    </>
  );
}
