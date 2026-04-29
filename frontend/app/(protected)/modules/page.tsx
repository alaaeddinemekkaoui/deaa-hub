'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { filterNavigationForRole } from '@/components/layout/navigation';

export default function ModulesPage() {
  const { user } = useAuth();
  const groups = filterNavigationForRole(user?.role ?? 'viewer');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Navigation"
        title="Modules"
        description="Tous les modules accessibles à votre rôle, regroupés sur une page centrale."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <article key={group.heading} className="surface-card space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{group.heading}</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">{group.items.length} module{group.items.length > 1 ? 's' : ''}</h2>
            </div>
            <div className="grid gap-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 transition hover:border-emerald-200 hover:bg-emerald-50/40"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-950">{item.label}</span>
                      <span className="block truncate text-xs text-slate-500">{item.caption}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
