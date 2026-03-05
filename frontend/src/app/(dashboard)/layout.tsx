'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    if (!token) router.replace('/login');
  }, [token, router]);

  if (!token) return null;

  return (
    <AuroraBackground className="flex-row items-stretch justify-start h-screen overflow-hidden" showRadialGradient>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
      </main>
    </AuroraBackground>
  );
}
