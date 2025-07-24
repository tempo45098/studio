import { AetherUIMain } from '@/components/aether-ui-main';
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <main>
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
        <AetherUIMain />
      </Suspense>
    </main>
  );
}
