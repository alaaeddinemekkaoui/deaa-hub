'use client';

import { LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-context';
import { useRouter } from 'next/navigation';

export function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <header className="mb-6 flex items-center justify-between gap-4 rounded-2xl border bg-white px-5 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          IAV Hassan II — DEAA Hub
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
          <p className="font-medium text-slate-900 leading-tight">{user?.fullName ?? user?.email}</p>
          <p className="text-xs text-slate-400 capitalize">{user?.role ?? 'viewer'}</p>
        </div>
        <button
          className="btn-outline py-2 px-3 text-xs"
          type="button"
          onClick={() => { logout(); router.push('/login'); }}
        >
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>
    </header>
  );
}
