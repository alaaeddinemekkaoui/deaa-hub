'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowLeftRight,
  BookOpen,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  Download,
  DoorOpen,
  FileStack,
  GraduationCap,
  Medal,
  NotebookPen,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { MetricCard } from '@/components/admin/metric-card';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage } from '@/services/api';
import { useAuth } from '@/features/auth/auth-context';
import { toast } from 'sonner';

/* ── Types ────────────────────────────────────────────────────────── */
type Overview = {
  stats: {
    totalStudents: number;
    teachersCount: number;
    departmentsCount: number;
    filieresCount: number;
    classesCount: number;
    dossiersCount: number;
  };
  studentsPerFiliere: Array<{ filiere: string; total: number }>;
  studentsPerCycle: Array<{ cycle: string; total: number }>;
  laureatesPerYear: Array<{ year: number; total: number }>;
  recentActivity: Array<{
    id: number;
    action: string;
    timestamp: string;
    user: { id: number; fullName: string; role: string };
  }>;
};

type ExportEntity = 'students' | 'teachers' | 'departments';

type FieldDef = { key: string; label: string; resolve: (row: Record<string, unknown>) => string };

const STUDENT_FIELDS: FieldDef[] = [
  { key: 'fullName',         label: 'Nom complet',          resolve: (r) => String(r.fullName ?? '') },
  { key: 'codeMassar',       label: 'Code Massar',          resolve: (r) => String(r.codeMassar ?? '') },
  { key: 'cin',              label: 'CIN',                  resolve: (r) => String(r.cin ?? '') },
  { key: 'email',            label: 'Email',                resolve: (r) => String(r.email ?? '') },
  { key: 'telephone',        label: 'Téléphone',            resolve: (r) => String(r.telephone ?? '') },
  { key: 'sex',              label: 'Sexe',                 resolve: (r) => String(r.sex ?? '') },
  { key: 'nationalite',      label: 'Nationalité',          resolve: (r) => String(r.nationalite ?? '') },
  { key: 'dateNaissance',    label: 'Date de naissance',    resolve: (r) => r.dateNaissance ? new Date(String(r.dateNaissance)).toLocaleDateString() : '' },
  { key: 'cycle',            label: 'Cycle',                resolve: (r) => String(r.cycle ?? '') },
  { key: 'anneeAcademique',  label: 'Année académique',     resolve: (r) => String(r.anneeAcademique ?? '') },
  { key: 'firstYearEntry',   label: "Année d'entrée",       resolve: (r) => String(r.firstYearEntry ?? '') },
  { key: 'filiere',          label: 'Filière',              resolve: (r) => String((r.filiere as Record<string,unknown>)?.name ?? '') },
  { key: 'academicClass',    label: 'Classe',               resolve: (r) => String((r.academicClass as Record<string,unknown>)?.name ?? '') },
];

const TEACHER_FIELDS: FieldDef[] = [
  { key: 'firstName',   label: 'Prénom',       resolve: (r) => String(r.firstName ?? '') },
  { key: 'lastName',    label: 'Nom',          resolve: (r) => String(r.lastName ?? '') },
  { key: 'email',       label: 'Email',        resolve: (r) => String(r.email ?? '') },
  { key: 'telephone',   label: 'Téléphone',    resolve: (r) => String(r.telephone ?? '') },
  { key: 'cin',         label: 'CIN',          resolve: (r) => String(r.cin ?? '') },
  { key: 'department',  label: 'Département',  resolve: (r) => String((r.department as Record<string,unknown>)?.name ?? '') },
  { key: 'filiere',     label: 'Filière',      resolve: (r) => String((r.filiere as Record<string,unknown>)?.name ?? '') },
  { key: 'role',        label: "Rôle",         resolve: (r) => String((r.role as Record<string,unknown>)?.name ?? '') },
  { key: 'grade',       label: 'Grade',        resolve: (r) => String((r.grade as Record<string,unknown>)?.name ?? '') },
  { key: 'createdAt',   label: "Date d'ajout", resolve: (r) => r.createdAt ? new Date(String(r.createdAt)).toLocaleDateString() : '' },
];

const DEPARTMENT_FIELDS: FieldDef[] = [
  { key: 'name',   label: 'Nom du département', resolve: (r) => String(r.name ?? '') },
  { key: 'code',   label: 'Code',               resolve: (r) => String(r.code ?? '') },
];

const FIELDS_BY_ENTITY: Record<ExportEntity, FieldDef[]> = {
  students:    STUDENT_FIELDS,
  teachers:    TEACHER_FIELDS,
  departments: DEPARTMENT_FIELDS,
};

const ENTITY_LABELS: Record<ExportEntity, string> = {
  students:    'Étudiants',
  teachers:    'Enseignants',
  departments: 'Départements',
};

const ENTITY_ENDPOINT: Record<ExportEntity, string> = {
  students:    '/students?limit=2000',
  teachers:    '/teachers?limit=2000',
  departments: '/departments?limit=500',
};

/* ── Helpers ──────────────────────────────────────────────────────── */
function buildCsv(rows: Record<string, unknown>[], fields: FieldDef[]): string {
  const header = fields.map((f) => `"${f.label}"`).join(',');
  const lines = rows.map((row) =>
    fields.map((f) => `"${f.resolve(row).replace(/"/g, '""')}"`).join(','),
  );
  return [header, ...lines].join('\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── Quick actions ────────────────────────────────────────────────── */
type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  color: string;
  roles?: string[];
};

const QUICK_ACTIONS: QuickAction[] = [
  { href: '/students',         label: 'Étudiants',          description: 'Consulter et gérer les dossiers',   icon: GraduationCap, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { href: '/teachers',         label: 'Enseignants',         description: 'Permanents et vacataires',          icon: Users,         color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { href: '/laureates',        label: 'Lauréats',            description: 'Diplômes et suivi',                 icon: Medal,         color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { href: '/transfers',        label: 'Passage de classe',   description: 'Transférer des étudiants',          icon: ArrowLeftRight, color: 'bg-violet-50 text-violet-700 border-violet-200' },
  { href: '/academic',         label: 'Modules & Éléments', description: 'Structure pédagogique',             icon: BookOpenCheck, color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { href: '/classes',          label: 'Classes',             description: 'Cohortes et groupes',               icon: CalendarRange, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { href: '/classes/cours',    label: 'Cours par classe',   description: 'Affectation des cours',             icon: NotebookPen,   color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { href: '/timetable',        label: "Emploi du temps",    description: 'Planification hebdomadaire',        icon: CalendarDays,  color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { href: '/rooms',            label: 'Salles',              description: 'Espaces et équipements',            icon: DoorOpen,      color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { href: '/departments',      label: 'Départements',        description: 'Structures institutionnelles',      icon: Building2,     color: 'bg-slate-50 text-slate-700 border-slate-200' },
  { href: '/filieres',         label: 'Filières',            description: 'Programmes et voies',               icon: BookOpen,      color: 'bg-lime-50 text-lime-700 border-lime-200' },
  { href: '/users',            label: 'Utilisateurs',        description: 'Comptes et rôles',                  icon: UserCog,       color: 'bg-purple-50 text-purple-700 border-purple-200', roles: ['admin'] },
];

const COLORS = ['#1a6b4a', '#2f855a', '#c97b2f', '#0f766e', '#475569'];

/* ── Export modal ─────────────────────────────────────────────────── */
function ExportModal({ onClose }: { onClose: () => void }) {
  const [entity, setEntity] = useState<ExportEntity | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const fields = entity ? FIELDS_BY_ENTITY[entity] : [];

  const toggleField = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(fields.map((f) => f.key)));
  const clearAll  = () => setSelected(new Set());

  const handleEntitySelect = (e: ExportEntity) => {
    setEntity(e);
    // Pre-select first 3 fields by default
    setSelected(new Set(FIELDS_BY_ENTITY[e].slice(0, 3).map((f) => f.key)));
  };

  const handleExport = async () => {
    if (!entity || selected.size === 0) return;
    setExporting(true);
    try {
      const res = await api.get<{ data: Record<string, unknown>[] }>(ENTITY_ENDPOINT[entity]);
      const rows: Record<string, unknown>[] = Array.isArray(res.data)
        ? (res.data as Record<string, unknown>[])
        : (res.data?.data ?? []);
      const chosenFields = fields.filter((f) => selected.has(f.key));
      const csv = buildCsv(rows, chosenFields);
      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(csv, `${entity}-${date}.csv`);
      toast.success(`${rows.length} enregistrement(s) exporté(s)`);
      onClose();
    } catch {
      toast.error("Échec de l'exportation. Veuillez réessayer.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Exporter les statistiques</h2>
            <p className="text-sm text-slate-500">Choisissez une entité puis les champs à inclure.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Step 1 — Entity */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
              1 — Entité à exporter
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(['students', 'teachers', 'departments'] as ExportEntity[]).map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => handleEntitySelect(e)}
                  className={`rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                    entity === e
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/40'
                  }`}
                >
                  {ENTITY_LABELS[e]}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Fields */}
          {entity && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  2 — Champs à inclure
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAll} className="text-xs text-emerald-700 hover:underline">
                    Tout sélectionner
                  </button>
                  <span className="text-xs text-slate-300">·</span>
                  <button type="button" onClick={clearAll} className="text-xs text-slate-500 hover:underline">
                    Effacer
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                {fields.map((f) => (
                  <label key={f.key} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.has(f.key)}
                      onChange={() => toggleField(f.key)}
                      className="h-4 w-4 rounded border-slate-300 accent-emerald-700"
                    />
                    <span className="text-sm text-slate-700">{f.label}</span>
                  </label>
                ))}
              </div>
              {selected.size === 0 && (
                <p className="mt-2 text-xs text-amber-600">Sélectionnez au moins un champ.</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" className="btn-outline" onClick={onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!entity || selected.size === 0 || exporting}
            onClick={handleExport}
          >
            <Download size={15} />
            {exporting ? 'Exportation…' : 'Exporter CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'viewer';

  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<Overview>('/dashboard/overview');
        setOverview(response.data);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, "Impossible de charger l'aperçu du tableau de bord."));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stats = overview?.stats;
  const topFilieres = (overview?.studentsPerFiliere ?? []).slice(0, 6);
  const visibleActions = QUICK_ACTIONS.filter((a) => !a.roles || a.roles.includes(role));

  return (
    <>
      {showExport && <ExportModal onClose={() => setShowExport(false)} />}

      <div className="space-y-6">
        <PageHeader
          eyebrow="Aperçu institutionnel"
          title="Opérations académiques en un coup d'œil"
          description="Supervisez les départements, les programmes, les classes et l'activité récente depuis ce tableau de bord."
          actions={
            <>
              <div className="stat-inline">
                <Building2 size={14} />
                {stats?.departmentsCount ?? 0} départements
              </div>
              <div className="stat-inline">
                <BookOpen size={14} />
                {stats?.filieresCount ?? 0} filières
              </div>
              <div className="stat-inline">
                <CalendarRange size={14} />
                {stats?.classesCount ?? 0} classes
              </div>
              <button
                type="button"
                className="btn-primary flex items-center gap-1.5"
                onClick={() => setShowExport(true)}
              >
                <Download size={14} />
                Statistiques
              </button>
            </>
          }
        />

        {/* ── Metric cards ── */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Étudiants"   value={stats?.totalStudents ?? 0}   hint="Enregistrements d'apprenants suivis"  icon={GraduationCap} />
          <MetricCard label="Enseignants" value={stats?.teachersCount ?? 0}   hint="Personnel permanent et vacataires"    icon={Users} />
          <MetricCard label="Départements" value={stats?.departmentsCount ?? 0} hint="Structures institutionnelles"       icon={Building2} />
          <MetricCard label="Filières"    value={stats?.filieresCount ?? 0}   hint="Programmes académiques"               icon={BookOpen} />
          <MetricCard label="Classes"     value={stats?.classesCount ?? 0}    hint="Cohortes et groupes gérés"            icon={CalendarRange} />
          <MetricCard label="Documents"   value={stats?.dossiersCount ?? 0}   hint="Fichiers administratifs suivis"       icon={FileStack} />
        </section>

        {/* ── Quick actions ── */}
        <section className="surface-card space-y-5">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Actions rapides</h2>
              <p className="panel-copy">Accédez directement aux sections clés de la plateforme.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {visibleActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`group flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition hover:-translate-y-0.5 hover:shadow-sm ${action.color}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70">
                  <action.icon size={18} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-tight">{action.label}</p>
                  <p className="mt-0.5 truncate text-[11px] opacity-70">{action.description}</p>
                </div>
                <ChevronRight size={15} className="ml-auto shrink-0 opacity-40 transition group-hover:opacity-80" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Charts row 1 ── */}
        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="surface-card space-y-5">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Distribution des étudiants par filière</h2>
                <p className="panel-copy">Identifiez la concentration du programme et la pression d'effectifs potentielle.</p>
              </div>
            </div>
            {loading ? <div className="empty-note">Chargement…</div>
             : error ? <div className="empty-note">{error}</div>
             : topFilieres.length === 0 ? (
               <EmptyState title="Aucune distribution disponible" description="Les graphiques apparaîtront une fois des dossiers créés." />
             ) : (
               <div className="h-[340px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={topFilieres} barSize={28}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#d8e4dc" />
                     <XAxis dataKey="filiere" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                     <YAxis tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                     <Tooltip cursor={{ fill: 'rgba(26, 107, 74, 0.08)' }} />
                     <Bar dataKey="total" radius={[12, 12, 0, 0]} fill="#1a6b4a" />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             )}
          </div>

          <div className="surface-card space-y-5">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Distribution par cycle</h2>
                <p className="panel-copy">Équilibre entre les parcours prépa, ingénieur et vétérinaire.</p>
              </div>
            </div>
            {loading ? <div className="empty-note">Chargement…</div>
             : error ? <div className="empty-note">{error}</div>
             : (overview?.studentsPerCycle ?? []).length === 0 ? (
               <EmptyState title="Aucune donnée de cycle" description="Créez des dossiers d'étudiants pour visualiser les cycles." />
             ) : (
               <div className="h-[340px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={overview?.studentsPerCycle ?? []} dataKey="total" nameKey="cycle" innerRadius={72} outerRadius={110} paddingAngle={4}>
                       {(overview?.studentsPerCycle ?? []).map((item, index) => (
                         <Cell key={`${item.cycle}-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <Tooltip />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
             )}
          </div>
        </section>

        {/* ── Charts row 2 ── */}
        <section className="grid gap-5 xl:grid-cols-[0.95fr_1.25fr]">
          <div className="surface-card space-y-5">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Lauréats par année</h2>
                <p className="panel-copy">Suivez les diplômes archivés à travers les cohortes de graduation.</p>
              </div>
            </div>
            {loading ? <div className="empty-note">Chargement…</div>
             : error ? <div className="empty-note">{error}</div>
             : (overview?.laureatesPerYear ?? []).length === 0 ? (
               <EmptyState title="Pas encore d'archive" description="Les tendances apparaîtront une fois les dossiers de lauréats saisis." />
             ) : (
               <div className="h-[280px]">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={overview?.laureatesPerYear ?? []} barSize={34}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#d8e4dc" />
                     <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                     <YAxis tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                     <Tooltip />
                     <Bar dataKey="total" radius={[12, 12, 0, 0]} fill="#c97b2f" />
                   </BarChart>
                 </ResponsiveContainer>
               </div>
             )}
          </div>

          <div className="surface-card space-y-5">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Activité administrative récente</h2>
                <p className="panel-copy">Surveillez les dernières actions des utilisateurs sur la plateforme.</p>
              </div>
            </div>
            {loading ? <div className="empty-note">Chargement…</div>
             : error ? <div className="empty-note">{error}</div>
             : (overview?.recentActivity ?? []).length === 0 ? (
               <EmptyState title="Aucune activité récente" description="Les actions du personnel apparaîtront ici." />
             ) : (
               <div className="space-y-3">
                 {(overview?.recentActivity ?? []).map((item) => (
                   <div key={item.id} className="rounded-3xl border bg-white/75 px-4 py-4 shadow-[0_20px_50px_-36px_rgba(15,36,26,0.32)]">
                     <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                       <div className="flex items-start gap-3">
                         <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-primary">
                           <Activity size={18} />
                         </div>
                         <div className="space-y-1">
                           <p className="font-medium text-slate-950">{item.action}</p>
                           <p className="text-sm text-slate-500">
                             {item.user.fullName} · <span className="capitalize">{item.user.role}</span>
                           </p>
                         </div>
                       </div>
                       <span className="status-chip status-chip--muted">
                         {new Date(item.timestamp).toLocaleString()}
                       </span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </section>
      </div>
    </>
  );
}
