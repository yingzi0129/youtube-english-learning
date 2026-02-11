'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      // 公开页面，不需要验证
      if (pathname === '/login' || pathname === '/register') {
        setIsChecking(false);
        return;
      }

      // 检查用户是否已登录
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // 未登录，重定向到登录页
        router.push('/login');
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      } else if (event === 'SIGNED_IN') {
        setIsChecking(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  // 公开页面直接显示
  if (pathname === '/login' || pathname === '/register') {
    return <>{children}</>;
  }

  // 正在检查认证状态
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

  return <>{children}</>;
}
