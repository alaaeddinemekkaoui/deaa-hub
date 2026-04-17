'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  BarChart2,
  BookOpen,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  DoorOpen,
  FileStack,
  FileText,
  GraduationCap,
  Layers,
  Medal,
  NotebookPen,
  RefreshCw,
  Scale,
  UserCog,
  Users,
  CopyPlus,
  MoveRight,
} from 'lucide-react';
import { MetricCard } from '@/components/admin/metric-card';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage } from '@/services/api';
import { useAuth } from '@/features/auth/auth-context';

/* ── Types ────────────────────────────────────────────────────────── */
type DashboardStats = {
  totalStudents: number;
  teachersCount: number;
  departmentsCount: number;
  filieresCount: number;
  classesCount: number;
  dossiersCount: number;
};

type SectionAction = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

type ActionSection = {
  id: string;
  heading: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  accent: string;
  cardColor: string;
  actions: SectionAction[];
  roles?: string[];
};

/* ── Section definitions ──────────────────────────────────────────── */
const ACTION_SECTIONS: ActionSection[] = [
  /* ── 1. Étudiants & Enseignants ─────────────────────────────── */
  {
    id: 'people',
    heading: 'Étudiants & Enseignants',
    description: 'Profils, dossiers, promotions et encadrement pédagogique',
    icon: GraduationCap,
    accent: 'bg-emerald-50 text-emerald-800 border-b border-emerald-200',
    cardColor: 'hover:border-emerald-300 hover:bg-emerald-50/70 hover:shadow-emerald-100',
    actions: [
      { href: '/students',  label: 'Étudiants',    description: 'Profils et cohortes',           icon: GraduationCap },
      { href: '/teachers',  label: 'Enseignants',  description: 'Permanents et vacataires',       icon: Users },
      { href: '/laureates', label: 'Lauréats',     description: 'Diplômes et suivi',              icon: Medal },
      { href: '/transfers', label: 'Transferts',   description: 'Passage inter-établissements',   icon: ArrowLeftRight },
    ],
  },

  /* ── 2. Épreuves & Délibération ─────────────────────────────── */
  {
    id: 'exams',
    heading: 'Épreuves & Délibération',
    description: 'Saisie des notes, résultats et relevés officiels',
    icon: Scale,
    accent: 'bg-teal-50 text-teal-800 border-b border-teal-200',
    cardColor: 'hover:border-teal-300 hover:bg-teal-50/70 hover:shadow-teal-100',
    actions: [
      { href: '/grades',       label: 'Épreuves',     description: 'Notes par classe et module',  icon: BookOpen },
      { href: '/deliberation', label: 'Délibération', description: 'Résultats et relevés de notes', icon: Scale },
      { href: '/student-class-transfer', label: 'Passage de classe', description: "Transfert d'étudiants", icon: MoveRight },
    ],
  },

  /* ── 3. Filières & Structure académique ─────────────────────── */
  {
    id: 'academic',
    heading: 'Filières & Structure Académique',
    description: 'Filières, modules, classes et organisation pédagogique',
    icon: BookOpenCheck,
    accent: 'bg-sky-50 text-sky-800 border-b border-sky-200',
    cardColor: 'hover:border-sky-300 hover:bg-sky-50/70 hover:shadow-sky-100',
    actions: [
      { href: '/filieres',         label: 'Filières',           description: 'Programmes et voies',       icon: BookOpen },
      { href: '/academic',         label: 'Modules & Éléments', description: 'CM · TD · TP',              icon: BookOpenCheck },
      { href: '/classes',          label: 'Classes',            description: 'Cohortes et groupes',       icon: CalendarRange },
      { href: '/classes/cours',    label: 'Cours par classe',   description: 'Affectation des cours',     icon: NotebookPen },
      { href: '/classes/transfer', label: 'Transfert de classe',description: 'Clonage inter-années',      icon: CopyPlus },
    ],
  },

  /* ── 4. Organisation institutionnelle ───────────────────────── */
  {
    id: 'org',
    heading: 'Organisation Institutionnelle',
    description: 'Départements, cycles, options et structure de l\'établissement',
    icon: Building2,
    accent: 'bg-slate-50 text-slate-800 border-b border-slate-200',
    cardColor: 'hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-slate-100',
    actions: [
      { href: '/departments', label: 'Départements', description: 'Structures institutionnelles', icon: Building2 },
      { href: '/structure',   label: 'Options',      description: 'Spécialités par filière',      icon: Layers },
      { href: '/cycles',      label: 'Cycles',       description: 'Cycles académiques',           icon: RefreshCw },
    ],
  },

  /* ── 5. Emploi du temps & Salles ────────────────────────────── */
  {
    id: 'timetable',
    heading: 'Emploi du Temps & Salles',
    description: 'Planification hebdomadaire et gestion des espaces',
    icon: CalendarDays,
    accent: 'bg-rose-50 text-rose-800 border-b border-rose-200',
    cardColor: 'hover:border-rose-300 hover:bg-rose-50/70 hover:shadow-rose-100',
    actions: [
      { href: '/timetable',         label: 'Emploi du temps', description: 'Planification hebdomadaire', icon: CalendarDays },
      { href: '/rooms',             label: 'Salles',          description: 'Espaces et équipements',     icon: DoorOpen },
      { href: '/room-reservations', label: 'Réservations',    description: 'Occupation des salles',      icon: CalendarRange },
    ],
  },

  /* ── 6. Demandes de documents ───────────────────────────────── */
  {
    id: 'demandes',
    heading: 'Demandes de Documents',
    description: 'Suivi des demandes de documents administratifs des étudiants',
    icon: FileText,
    accent: 'bg-amber-50 text-amber-800 border-b border-amber-200',
    cardColor: 'hover:border-amber-300 hover:bg-amber-50/70 hover:shadow-amber-100',
    actions: [
      { href: '/workflows', label: 'Demandes',         description: 'Toutes les demandes en cours',    icon: FileText },
      { href: '/settings/document-types', label: 'Types de documents', description: 'Catégories configurées', icon: FileStack },
    ],
    roles: ['admin', 'staff'],
  },

  /* ── 7. Administration ──────────────────────────────────────── */
  {
    id: 'admin',
    heading: 'Administration',
    description: 'Utilisateurs, statistiques et journaux d\'activité',
    icon: UserCog,
    accent: 'bg-purple-50 text-purple-800 border-b border-purple-200',
    cardColor: 'hover:border-purple-300 hover:bg-purple-50/70 hover:shadow-purple-100',
    roles: ['admin', 'staff'],
    actions: [
      { href: '/users',       label: 'Utilisateurs', description: 'Comptes et rôles',       icon: UserCog },
      { href: '/statistics',  label: 'Statistiques', description: 'Données et exports CSV', icon: BarChart2 },
      { href: '/activity-logs', label: 'Journaux',   description: "Historique d'activité",  icon: Activity },
    ],
  },
];

/* ── Page ─────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'viewer';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<{ stats: DashboardStats }>('/dashboard/overview');
        setStats(res.data.stats);
      } catch (err) {
        void getApiErrorMessage(err, '');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const visibleSections = ACTION_SECTIONS.filter((s) => !s.roles || s.roles.includes(role));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Aperçu institutionnel"
        title="Tableau de bord"
        description="Vue d'ensemble et accès rapide à tous les modules de la plateforme."
        actions={
          <Link href="/statistics" className="btn-outline flex items-center gap-2">
            <BarChart2 size={14} />
            Statistiques & Export
          </Link>
        }
      />

      {/* ── Metric strip ── */}
      {!loading && stats && (
        <section className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Étudiants"    value={stats.totalStudents}    hint="Apprenants enregistrés"       icon={GraduationCap} />
          <MetricCard label="Enseignants"  value={stats.teachersCount}    hint="Personnel pédagogique"        icon={Users} />
          <MetricCard label="Départements" value={stats.departmentsCount} hint="Structures institutionnelles" icon={Building2} />
          <MetricCard label="Filières"     value={stats.filieresCount}    hint="Programmes académiques"       icon={BookOpen} />
          <MetricCard label="Classes"      value={stats.classesCount}     hint="Cohortes actives"             icon={CalendarRange} />
          <MetricCard label="Documents"    value={stats.dossiersCount}    hint="Fichiers administratifs"      icon={FileStack} />
        </section>
      )}

      {/* ── Section navigation ── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Navigation par module</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Cliquez sur une carte pour accéder au module correspondant.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {visibleSections.map((section) => (
            <div
              key={section.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Section header */}
              <div className={`flex items-center gap-4 px-6 py-4 ${section.accent}`}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm">
                  <section.icon size={20} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold leading-tight">{section.heading}</p>
                  <p className="text-[12px] opacity-60 mt-0.5 leading-snug">{section.description}</p>
                </div>
              </div>

              {/* Inner action cards */}
              <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                {section.actions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`group flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 transition hover:-translate-y-0.5 hover:shadow-md ${section.cardColor}`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                      <action.icon size={16} strokeWidth={1.8} className="text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-slate-800 leading-snug">
                        {action.label}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {action.description}
                      </p>
                    </div>
                    <ChevronRight
                      size={12}
                      className="self-end text-slate-300 transition group-hover:text-slate-500 group-hover:translate-x-0.5"
                    />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
