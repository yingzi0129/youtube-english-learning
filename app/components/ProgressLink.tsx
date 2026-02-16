'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NProgress from 'nprogress';
import { ComponentProps, MouseEvent } from 'react';

type LinkProps = ComponentProps<typeof Link>;

export default function ProgressLink({ href, onClick, ...props }: LinkProps) {
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // 如果有自定义的 onClick，先执行
    if (onClick) {
      onClick(e);
    }

    // 如果是外部链接或者被阻止了默认行为，不显示进度条
    if (e.defaultPrevented || typeof href !== 'string' || href.startsWith('http')) {
      return;
    }

    // 显示进度条
    NProgress.start();

    // 使用 router.push 进行导航
    e.preventDefault();
    router.push(href);
  };

  return <Link href={href} onClick={handleClick} {...props} />;
}
