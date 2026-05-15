'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { LoadingScreen } from '@/components/admin/loading-screen';
import { useAuth } from '@/features/auth/auth-context';
import { STUDENT_ONLY_ROUTES } from '@/components/layout/navigation';

// Pages that the 'user' role cannot access
const USER_ROLE_BLOCKED = [
  '/workflows',
  '/activity-logs',
  '/users',
  '/statistics',
];

const RESTAURATION_ALLOWED = ['/dashboard', '/restauration', '/restauration/verification'];
const INTERNAT_ALLOWED = ['/dashboard', '/internat'];

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const syncSidebarWithViewport = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };

    syncSidebarWithViewport();
    window.addEventListener('resize', syncSidebarWithViewport);
    return () => window.removeEventListener('resize', syncSidebarWithViewport);
  }, []);

  useEffect(() => {
    if (window.innerWidth >= 768) return;
    const closeSidebar = window.setTimeout(() => {
      setSidebarOpen(false);
    }, 0);
    return () => window.clearTimeout(closeSidebar);
  }, [pathname]);

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

    if (
      !loading &&
      user?.role === 'restauration' &&
      !RESTAURATION_ALLOWED.some((allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`))
    ) {
      router.replace('/restauration');
    }

    if (
      !loading &&
      user?.role === 'internat' &&
      !INTERNAT_ALLOWED.some((allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`))
    ) {
      router.replace('/internat');
    }

    if (
      !loading &&
      user?.role === 'student' &&
      !STUDENT_ONLY_ROUTES.some((allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`))
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

  return (
    <div className="min-h-screen">
      <Topbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
      />
      <div className="md:px-3">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className={`w-full min-w-0 transition-[padding] duration-300 ${sidebarOpen ? 'md:pl-[244px]' : 'md:pl-0'}`}>
          <div className="container-page">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
