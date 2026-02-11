'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  // 验证 session 是否有效
  const verifySession = async () => {
    const userStr = localStorage.getItem('user');
    const sessionToken = localStorage.getItem('sessionToken');

    if (!userStr || !sessionToken) {
      return false;
    }

    try {
      const user = JSON.parse(userStr);
      const response = await fetch('/api/auth/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          sessionToken: sessionToken,
        }),
      });

      const data = await response.json();

      if (!data.valid) {
        // Session 无效，清除本地存储
        localStorage.removeItem('user');
        localStorage.removeItem('sessionToken');
        return false;
      }

      return true;
    } catch (error) {
      console.error('验证 session 错误:', error);
      return false;
    }
  };

  useEffect(() => {
    // 不需要保护的公开路由
    const publicRoutes = ['/login', '/register'];

    // 检查当前路由是否是公开路由
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    const checkAuth = async () => {
      if (!isPublicRoute) {
        // 验证 session
        const isValid = await verifySession();

        if (!isValid) {
          // Session 无效，跳转到登录页
          router.push('/login?expired=true');
        } else {
          // Session 有效，允许访问
          setIsChecking(false);
        }
      } else {
        // 公开路由，直接允许访问
        setIsChecking(false);
      }
    };

    checkAuth();

    // 每 30 秒检查一次 session 是否有效
    const interval = setInterval(async () => {
      if (!isPublicRoute) {
        const isValid = await verifySession();
        if (!isValid) {
          // Session 无效，显示提示并跳转到登录页
          alert('您的账号在其他地方登录，当前登录已失效');
          router.push('/login?expired=true');
        }
      }
    }, 30000); // 30秒检查一次

    return () => clearInterval(interval);
  }, [pathname, router]);

  // 在检查期间显示加载状态
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
