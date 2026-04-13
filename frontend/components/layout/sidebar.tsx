'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  BookOpenCheck,
  Building2,
  CalendarRange,
  CalendarDays,
  CopyPlus,
  DoorOpen,
  GraduationCap,
  Home,
  Layers,
  Medal,
  MoveRight,
  NotebookPen,
  RefreshCw,
  UserCog,
  Users,
  Workflow,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  caption: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
};

type NavGroup = {
  heading: string;
  items: NavItem[];
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
    items: [
      { href: '/students',                label: 'Étudiants',               caption: 'Profils et cohortes',        icon: GraduationCap },
      { href: '/laureates',               label: 'Lauréats',                caption: 'Diplômes et suivi',          icon: Medal },
      { href: '/transfers',               label: 'Transferts',              caption: 'Passage inter-établissements', icon: ArrowLeftRight },
    ],
  },
  {
    heading: 'Enseignants',
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
    heading: 'Emploi du Temps et Gestion des Salles',
    items: [
      { href: '/timetable', label: 'Emploi du temps', caption: 'Planification hebdomadaire', icon: CalendarDays },
      { href: '/rooms', label: 'Gestion des salles', caption: 'Espaces et équipements', icon: DoorOpen },
      { href: '/room-reservations', label: 'Réservation de salle', caption: 'Occupation des salles', icon: CalendarRange },
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
    heading: 'Administration',
    items: [
      { href: '/workflows',     label: 'Workflows',    caption: 'Suivi des dossiers',    icon: Workflow },
      { href: '/activity-logs', label: 'Journaux',     caption: "Historique d'activité", icon: Activity },
      { href: '/users',         label: 'Utilisateurs', caption: 'Accès et rôles',        icon: UserCog },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

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

        {/* Divider */}
        <div className="border-t border-white/8" />

        {/* Navigation groups */}
        <nav className="grid gap-3">
          {navigation.map((group) => (
            <div key={group.heading}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/35">
                {group.heading}
              </p>
              <div className="grid gap-0.5">
                {group.items.map(({ href, label, caption, icon: Icon }) => {
                  const allHrefs = navigation.flatMap((g) => g.items.map((i) => i.href));
                  const bestMatch = allHrefs
                    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
                    .sort((a, b) => b.length - a.length)[0];
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
          ))}
        </nav>
      </div>
    </aside>
  );
}
