'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { useAuth } from '@/features/auth/auth-context';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="container-page">
        <div className="hero-panel">
          <div className="space-y-3">
            <p className="hero-eyebrow">Loading workspace</p>
            <h1 className="hero-title text-3xl md:text-4xl">Preparing your academic dashboard</h1>
            <p className="hero-copy max-w-xl">
              We are restoring your secure session and loading the latest administrative data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen md:flex md:items-start">
      <Sidebar />
      <main className="w-full min-w-0">
        <div className="container-page">
          <Topbar />
          {children}
        </div>
      </main>
    </div>
  );
}
