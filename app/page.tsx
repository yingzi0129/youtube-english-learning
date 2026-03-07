import { Suspense } from 'react';
import HomePageClient from './HomePageClient';
import Loading from './loading';

export const dynamic = 'force-static';

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <HomePageClient />
    </Suspense>
  );
}
