'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { LoadingScreen } from '@/components/admin/loading-screen';
import { useAuth } from '@/features/auth/auth-context';

// Pages that the 'user' role cannot access
const USER_ROLE_BLOCKED = [
  '/workflows',
  '/activity-logs',
  '/users',
  '/statistics',
];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    // Redirect 'user' role away from admin-only pages
    if (
      !loading &&
      user?.role === 'user' &&
      USER_ROLE_BLOCKED.some((blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`))
    ) {
      router.replace('/dashboard');
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  const isDashboard = pathname === '/dashboard';

  if (isDashboard) {
    return (
      <div className="min-h-screen">
        <div className="container-page">
          <Topbar />
          {children}
        </div>
      </div>
    );
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
