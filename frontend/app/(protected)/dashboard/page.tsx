'use client';

import Link from 'next/link';
import {
  BarChart2,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { filterNavigationForRole } from '@/components/layout/navigation';
import { useAuth } from '@/features/auth/auth-context';

const sectionStyles = [
  {
    accent: 'bg-[#f3f5f4] text-[#123524] border-b border-slate-200',
    cardColor: 'hover:border-[#1b5e3b]/25 hover:bg-[#1b5e3b]/[0.04] hover:shadow-emerald-100',
  },
  {
    accent: 'bg-[#f8f1f0] text-[#8f1d22] border-b border-[#e8d2d1]',
    cardColor: 'hover:border-[#8f1d22]/25 hover:bg-[#8f1d22]/[0.04] hover:shadow-rose-100',
  },
  {
    accent: 'bg-[#f5f5f5] text-slate-800 border-b border-slate-200',
    cardColor: 'hover:border-slate-300 hover:bg-slate-50/90 hover:shadow-slate-100',
  },
] as const;

/* ── Page ─────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'viewer';

  const visibleSections = filterNavigationForRole(role);
  const studentItems = visibleSections.flatMap((section) => section.items).filter((item) => item.href !== '/dashboard');

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Aperçu institutionnel"
        title="Tableau de bord"
        description="Vue d'ensemble et accès rapide aux principales sections de la plateforme."
        actions={['admin', 'staff'].includes(role) ? (
          <Link href="/statistics" className="btn-outline flex items-center gap-2">
            <BarChart2 size={14} />
            Statistiques & Export
          </Link>
        ) : undefined}
      />

      {/* ── Section navigation ── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Navigation rapide</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Cliquez sur une carte pour accéder à la section correspondante.
          </p>
        </div>

        {role === 'student' ? (
          <div className="surface-card">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {studentItems.map((action, index) => {
                const style = sectionStyles[index % sectionStyles.length];
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`group flex min-h-32 flex-col gap-3 rounded-[1.6rem] border border-slate-100 bg-slate-50/50 p-4 transition hover:-translate-y-0.5 hover:shadow-md ${style.cardColor}`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                      <action.icon size={18} strokeWidth={1.8} className="text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-slate-900 leading-snug">{action.label}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{action.caption}</p>
                    </div>
                    <ChevronRight size={13} className="self-end text-slate-300 transition group-hover:text-slate-500 group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {visibleSections.map((section, index) => {
            const style = sectionStyles[index % sectionStyles.length];
            const SectionIcon = section.items[0]?.icon;
            return (
            <div
              key={section.heading}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className={`flex items-center gap-4 px-6 py-4 ${style.accent}`}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm">
                  {SectionIcon ? <SectionIcon size={20} strokeWidth={1.8} /> : null}
                </div>
                <div className="min-w-0">
                  <p className="text-[16px] font-bold leading-tight">{section.heading}</p>
                  <p className="mt-0.5 text-[12px] opacity-70 leading-snug">
                    Accès rapide aux pages de la section.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                {section.items.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`group flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition hover:-translate-y-0.5 hover:shadow-md ${style.cardColor}`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                      <action.icon size={17} strokeWidth={1.8} className="text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-slate-900 leading-snug">
                        {action.label}
                      </p>
                      <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
                        {action.caption}
                      </p>
                    </div>
                    <ChevronRight
                      size={13}
                      className="self-end text-slate-300 transition group-hover:text-slate-500 group-hover:translate-x-0.5"
                    />
                  </Link>
                ))}
              </div>
            </div>
          )})}
        </div>
        )}
      </section>
    </div>
  );
}
