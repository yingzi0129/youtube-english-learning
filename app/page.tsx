import { Suspense } from 'react';
import HomePageClient from './HomePageClient';
import Loading from './loading';

export const dynamic = 'force-static';
export const revalidate = 86400;

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <HomePageClient />
    </Suspense>
  );
}
