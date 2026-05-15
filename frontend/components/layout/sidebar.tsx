'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-context';
import { filterNavigationForRole, getActiveGroup, getActiveHref, navigation } from '@/components/layout/navigation';

type SidebarProps = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role ?? 'viewer';

  const visibleGroups = filterNavigationForRole(role);

  // Initialise: all groups open
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(navigation.map((g) => g.heading)),
  );

  const activeGroup = getActiveGroup(pathname);
  const effectiveOpenGroups =
    activeGroup && !openGroups.has(activeGroup)
      ? new Set([...openGroups, activeGroup])
      : openGroups;

  const toggleGroup = (heading: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(heading)) next.delete(heading);
      else next.add(heading);
      return next;
    });
  };

  const bestMatch = getActiveHref(pathname);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-slate-950/28 backdrop-blur-[2px] transition-opacity duration-300 md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          'text-slate-900 transition-all duration-300 ease-in-out md:fixed md:left-3 md:top-[116px] md:z-20 md:h-[calc(100vh-128px)]',
          open
            ? 'fixed inset-x-3 top-[88px] z-40 max-h-[calc(100vh-104px)] overflow-y-auto p-0 opacity-100 md:inset-auto md:w-[228px] md:max-h-none md:overflow-hidden md:p-0'
            : 'pointer-events-none fixed inset-x-3 top-[82px] z-40 max-h-0 -translate-y-3 overflow-hidden opacity-0 md:inset-auto md:w-0 md:max-h-screen md:translate-y-0',
        )}
        aria-hidden={!open}
      >
        <div className="flex max-h-[inherit] flex-col space-y-4 rounded-[1.6rem] border border-slate-200/80 bg-white/92 p-3 shadow-[0_24px_70px_-46px_rgba(15,36,26,0.28)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/78 md:h-full md:w-[228px] md:bg-white/72 md:supports-[backdrop-filter]:bg-white/58">
        {/* Department badge for regular users */}
        {(['user', 'teacher', 'student', 'inspector'] as const).includes(role as 'user' | 'teacher' | 'student' | 'inspector') && user?.departments && user.departments.length > 0 && (
          <div className="mx-1 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mes départements</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {user.departments.map((d) => (
                <span key={d.id} className="rounded-full border border-[#1b5e3b]/12 bg-[#1b5e3b]/8 px-2 py-0.5 text-[11px] font-medium text-[#1b5e3b]">
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-200/80" />

        {/* Navigation groups */}
        <nav className="grid min-h-0 flex-1 gap-1 overflow-y-auto pr-1">
          {visibleGroups.map((group) => {
            const isOpen = effectiveOpenGroups.has(group.heading);
            return (
              <div key={group.heading}>
                {/* Group header — clickable to collapse/expand */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.heading)}
                  className="group/hd flex w-full items-center justify-between rounded-xl px-3 py-1.5 transition-colors hover:bg-slate-100/70"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500 group-hover/hd:text-slate-700 transition-colors">
                    {group.heading}
                  </p>
                  <ChevronDown
                    size={11}
                    className={cn(
                      'text-slate-400 transition-transform duration-300 group-hover/hd:text-slate-600',
                      isOpen ? 'rotate-0' : '-rotate-90',
                    )}
                  />
                </button>

                {/* Collapsible content with animation */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0',
                  )}
                >
                  <div className="grid gap-0.5 pb-1">
                    {group.items.map(({ href, label, caption, icon: Icon }) => {
                      const active = href === bestMatch;
                      return (
                        <Link
                          key={`${group.heading}-${label}`}
                          href={href}
                          prefetch={false}
                          onClick={onClose}
                          className={cn('sidebar-link', active && 'active')}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                            <span className="text-[13px]">{label}</span>
                          </div>
                          <span
                            className={cn(
                              'pl-[26px] text-[11px] leading-4',
                              active ? 'text-slate-500' : 'text-slate-500/80',
                            )}
                          >
                            {caption}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
        </div>
      </aside>
    </>
  );
}
