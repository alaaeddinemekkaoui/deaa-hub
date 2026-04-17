'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  BarChart2,
  BookOpen,
  BookOpenCheck,
  Building2,
  CalendarRange,
  CalendarDays,
  ChevronDown,
  CopyPlus,
  DoorOpen,
  FileStack,
  FileText,
  GraduationCap,
  Home,
  Layers,
  Medal,

  NotebookPen,
  RefreshCw,
  Scale,
  Settings,
  UserCog,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/auth-context';

type NavItem = {
  href: string;
  label: string;
  caption: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
  /** Roles that can see this group. Omit = everyone. */
  roles?: string[];
};

const navigation: NavGroup[] = [
  {
    heading: 'Accueil',
    items: [
      { href: '/dashboard', label: 'Tableau de bord', caption: 'Vue générale', icon: Home },
    ],
  },
  {
    heading: 'Étudiants',
    roles: ['admin', 'staff', 'viewer', 'user'],
    items: [
      { href: '/students',      label: 'Étudiants',    caption: 'Profils et cohortes',              icon: GraduationCap },
      { href: '/grades',        label: 'Épreuves',     caption: 'Notes par classe et module',       icon: BookOpen },
      { href: '/deliberation',  label: 'Délibération', caption: 'Résultats et relevés de notes',    icon: Scale },
      { href: '/laureates',     label: 'Lauréats',     caption: 'Diplômes et suivi',                icon: Medal },
      { href: '/transfers',     label: 'Transferts',   caption: 'Passage inter-établissements',     icon: ArrowLeftRight },
    ],
  },
  {
    heading: 'Enseignants',
    roles: ['admin', 'staff', 'viewer', 'user'],
    items: [
      { href: '/teachers', label: 'Professeurs', caption: 'Permanents et vacataires', icon: Users },
    ],
  },
  {
    heading: 'Structure Académique',
    items: [
      { href: '/academic', label: 'Modules & Éléments', caption: 'Modules · CM · TD · TP', icon: BookOpenCheck },
    ],
  },
  {
    heading: 'Classes',
    items: [
      { href: '/classes',          label: 'Gestion des Classes', caption: 'Cohortes et groupes',   icon: CalendarRange },
      { href: '/classes/cours',    label: 'Cours par classe',    caption: 'Affectation des cours', icon: NotebookPen },
      { href: '/classes/transfer', label: 'Transfert de classe', caption: 'Clonage inter-années',  icon: CopyPlus },
    ],
  },
  {
    heading: 'Emploi du Temps & Salles',
    items: [
      { href: '/timetable',         label: 'Emploi du temps',      caption: 'Planification hebdomadaire', icon: CalendarDays },
      { href: '/rooms',             label: 'Gestion des salles',   caption: 'Espaces et équipements',     icon: DoorOpen },
      { href: '/room-reservations', label: 'Réservation de salle', caption: 'Occupation des salles',      icon: CalendarRange },
    ],
  },
  {
    heading: 'Structure Organisationnelle',
    items: [
      { href: '/departments', label: 'Départements', caption: "Structures de l'établissement", icon: Building2 },
      { href: '/filieres',    label: 'Filières',     caption: 'Programmes et voies',           icon: BookOpen },
      { href: '/structure',   label: 'Options',      caption: 'Spécialités par filière',       icon: Layers },
      { href: '/cycles',      label: 'Cycles',       caption: 'Cycles académiques',            icon: RefreshCw },
    ],
  },
  {
    heading: 'Demandes de documents',
    roles: ['admin', 'staff', 'viewer'],
    items: [
      { href: '/workflows', label: 'Demandes', caption: 'Suivi des demandes de docs', icon: FileText },
    ],
  },
  {
    heading: 'Administration',
    roles: ['admin', 'staff'],
    items: [
      { href: '/users',       label: 'Utilisateurs', caption: 'Accès et rôles',         icon: UserCog },
      { href: '/statistics',  label: 'Statistiques', caption: 'Données et exports CSV', icon: BarChart2 },
    ],
  },
  {
    heading: 'Paramètres',
    roles: ['admin', 'staff'],
    items: [
      { href: '/settings/academic-years',   label: 'Années académiques', caption: 'Gérer les années académiques',  icon: Settings },
      { href: '/settings/document-types',   label: 'Types de documents', caption: 'Catégories de documents admin', icon: FileStack },
      { href: '/activity-logs',             label: 'Journaux',           caption: "Historique d'activité",         icon: Activity },
    ],
  },
];

const allHrefs = navigation.flatMap((g) => g.items.map((i) => i.href));

function getActiveHref(pathname: string): string | undefined {
  return allHrefs
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
}

function getActiveGroup(pathname: string): string | undefined {
  const best = getActiveHref(pathname);
  if (!best) return undefined;
  return navigation.find((g) => g.items.some((i) => i.href === best))?.heading;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.role ?? 'viewer';

  const visibleGroups = navigation.filter(
    (group) => !group.roles || group.roles.includes(role),
  );

  // Initialise: all groups open
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(navigation.map((g) => g.heading)),
  );

  // Auto-expand the active group when pathname changes
  useEffect(() => {
    const activeGroup = getActiveGroup(pathname);
    if (activeGroup) {
      setOpenGroups((prev) => {
        if (prev.has(activeGroup)) return prev;
        return new Set([...prev, activeGroup]);
      });
    }
  }, [pathname]);

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
    <aside
      className="w-full shrink-0 border-b border-black/10 p-3 text-white md:sticky md:top-0 md:h-screen md:w-[260px] md:self-start md:overflow-y-auto md:border-r md:border-b-0 md:p-4"
      style={{ background: 'linear-gradient(180deg, #0e2016 0%, #163320 100%)' }}
    >
      <div className="space-y-4 md:min-h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Image src="/logo0.png" alt="IAV Hassan II" width={24} height={24} priority />
          </div>
          <div>
            <p className="text-[13px] font-bold leading-tight tracking-tight text-white">DEAA Hub</p>
            <p className="text-[10px] leading-tight text-white/50">IAV Hassan II</p>
          </div>
        </div>

        {/* Department badge for regular users */}
        {role === 'user' && user?.departments && user.departments.length > 0 && (
          <div className="mx-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Mes départements</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {user.departments.map((d) => (
                <span key={d.id} className="rounded-full bg-emerald-800/60 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                  {d.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-white/8" />

        {/* Navigation groups */}
        <nav className="grid gap-1">
          {visibleGroups.map((group) => {
            const isOpen = openGroups.has(group.heading);
            return (
              <div key={group.heading}>
                {/* Group header — clickable to collapse/expand */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.heading)}
                  className="group/hd flex w-full items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40 group-hover/hd:text-white/65 transition-colors">
                    {group.heading}
                  </p>
                  <ChevronDown
                    size={11}
                    className={cn(
                      'text-white/30 transition-transform duration-300 group-hover/hd:text-white/55',
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
                          className={cn('sidebar-link', active && 'active')}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
                            <span className="text-[13px]">{label}</span>
                          </div>
                          <span
                            className={cn(
                              'pl-[26px] text-[11px] leading-4',
                              active ? 'text-slate-400' : 'text-white/35',
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
  );
}
