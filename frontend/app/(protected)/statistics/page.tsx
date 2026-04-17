'use client';

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
  BookOpen,
  Building2,
  CalendarRange,
  Download,
  FileStack,
  GraduationCap,
  Users,
  X,
} from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { MetricCard } from '@/components/admin/metric-card';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage } from '@/services/api';
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
  { key: 'fullName',        label: 'Nom complet',       resolve: (r) => String(r.fullName ?? '') },
  { key: 'codeMassar',      label: 'Code Massar',        resolve: (r) => String(r.codeMassar ?? '') },
  { key: 'cin',             label: 'CIN',                resolve: (r) => String(r.cin ?? '') },
  { key: 'email',           label: 'Email',              resolve: (r) => String(r.email ?? '') },
  { key: 'telephone',       label: 'Téléphone',          resolve: (r) => String(r.telephone ?? '') },
  { key: 'sex',             label: 'Sexe',               resolve: (r) => String(r.sex ?? '') },
  { key: 'nationalite',     label: 'Nationalité',        resolve: (r) => String(r.nationalite ?? '') },
  { key: 'dateNaissance',   label: 'Date de naissance',  resolve: (r) => r.dateNaissance ? new Date(String(r.dateNaissance)).toLocaleDateString() : '' },
  { key: 'cycle',           label: 'Cycle',              resolve: (r) => String(r.cycle ?? '') },
  { key: 'anneeAcademique', label: 'Année académique',   resolve: (r) => String(r.anneeAcademique ?? '') },
  { key: 'firstYearEntry',  label: "Année d'entrée",     resolve: (r) => String(r.firstYearEntry ?? '') },
  { key: 'filiere',         label: 'Filière',            resolve: (r) => String((r.filiere as Record<string, unknown>)?.name ?? '') },
  { key: 'academicClass',   label: 'Classe',             resolve: (r) => String((r.academicClass as Record<string, unknown>)?.name ?? '') },
];

const TEACHER_FIELDS: FieldDef[] = [
  { key: 'firstName',  label: 'Prénom',       resolve: (r) => String(r.firstName ?? '') },
  { key: 'lastName',   label: 'Nom',          resolve: (r) => String(r.lastName ?? '') },
  { key: 'email',      label: 'Email',        resolve: (r) => String(r.email ?? '') },
  { key: 'telephone',  label: 'Téléphone',    resolve: (r) => String(r.telephone ?? '') },
  { key: 'cin',        label: 'CIN',          resolve: (r) => String(r.cin ?? '') },
  { key: 'department', label: 'Département',  resolve: (r) => String((r.department as Record<string, unknown>)?.name ?? '') },
  { key: 'filiere',    label: 'Filière',      resolve: (r) => String((r.filiere as Record<string, unknown>)?.name ?? '') },
  { key: 'role',       label: 'Rôle',         resolve: (r) => String((r.role as Record<string, unknown>)?.name ?? '') },
  { key: 'grade',      label: 'Grade',        resolve: (r) => String((r.grade as Record<string, unknown>)?.name ?? '') },
  { key: 'createdAt',  label: "Date d'ajout", resolve: (r) => r.createdAt ? new Date(String(r.createdAt)).toLocaleDateString() : '' },
];

const DEPARTMENT_FIELDS: FieldDef[] = [
  { key: 'name', label: 'Nom du département', resolve: (r) => String(r.name ?? '') },
  { key: 'code', label: 'Code',               resolve: (r) => String(r.code ?? '') },
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

const CHART_COLORS = ['#1a6b4a', '#2f855a', '#c97b2f', '#0f766e', '#475569'];

/* ── Helpers ─────────────────────────────────────────────────────── */
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

/* ── Export panel ─────────────────────────────────────────────────── */
function ExportPanel() {
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

  const handleEntitySelect = (e: ExportEntity) => {
    setEntity(e);
    setSelected(new Set(FIELDS_BY_ENTITY[e].map((f) => f.key)));
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
    } catch {
      toast.error("Échec de l'exportation. Veuillez réessayer.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="surface-card space-y-5">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Exporter les données</h2>
          <p className="panel-copy">Sélectionnez une entité et les champs à inclure dans l&apos;export CSV.</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Step 1 — Entity */}
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            1 — Entité à exporter
          </p>
          <div className="flex flex-wrap gap-3">
            {(['students', 'teachers', 'departments'] as ExportEntity[]).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => handleEntitySelect(e)}
                className={`rounded-2xl border px-5 py-3 text-sm font-medium transition ${
                  entity === e
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
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
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                2 — Champs à inclure
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelected(new Set(fields.map((f) => f.key)))}
                  className="text-xs text-emerald-700 hover:underline"
                >
                  Tout sélectionner
                </button>
                <span className="text-xs text-slate-300">·</span>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-slate-500 hover:underline"
                >
                  Effacer
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 sm:grid-cols-3">
              {fields.map((f) => (
                <label key={f.key} className="flex cursor-pointer items-center gap-2.5">
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

        {/* Export button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            disabled={!entity || selected.size === 0 || exporting}
            onClick={handleExport}
          >
            <Download size={15} />
            {exporting ? 'Exportation en cours…' : 'Télécharger CSV'}
          </button>
          {entity && selected.size > 0 && (
            <p className="text-sm text-slate-500">
              {selected.size} champ{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function StatisticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<Overview>('/dashboard/overview');
        setOverview(res.data);
      } catch (err) {
        setError(getApiErrorMessage(err, "Impossible de charger les statistiques."));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const stats = overview?.stats;
  const topFilieres = (overview?.studentsPerFiliere ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analyse institutionnelle"
        title="Statistiques & Exportation"
        description="Consultez la distribution des effectifs, les tendances de diplomation et exportez les données au format CSV."
      />

      {/* ── Metric cards ── */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Étudiants"    value={stats?.totalStudents ?? 0}    hint="Apprenants enregistrés"           icon={GraduationCap} />
        <MetricCard label="Enseignants"  value={stats?.teachersCount ?? 0}    hint="Personnel permanent et vacataires" icon={Users} />
        <MetricCard label="Départements" value={stats?.departmentsCount ?? 0} hint="Structures institutionnelles"      icon={Building2} />
        <MetricCard label="Filières"     value={stats?.filieresCount ?? 0}    hint="Programmes académiques"            icon={BookOpen} />
        <MetricCard label="Classes"      value={stats?.classesCount ?? 0}     hint="Cohortes et groupes gérés"         icon={CalendarRange} />
        <MetricCard label="Documents"    value={stats?.dossiersCount ?? 0}    hint="Fichiers administratifs suivis"    icon={FileStack} />
      </section>

      {/* ── Export panel ── */}
      <ExportPanel />

      {/* ── Charts row 1 ── */}
      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="surface-card space-y-5">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Distribution des étudiants par filière</h2>
              <p className="panel-copy">Identifiez la concentration du programme et la pression d&apos;effectifs potentielle.</p>
            </div>
          </div>
          {loading ? (
            <div className="empty-note">Chargement…</div>
          ) : error ? (
            <div className="empty-note">{error}</div>
          ) : topFilieres.length === 0 ? (
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
          {loading ? (
            <div className="empty-note">Chargement…</div>
          ) : error ? (
            <div className="empty-note">{error}</div>
          ) : (overview?.studentsPerCycle ?? []).length === 0 ? (
            <EmptyState title="Aucune donnée de cycle" description="Créez des dossiers d'étudiants pour visualiser les cycles." />
          ) : (
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview?.studentsPerCycle ?? []}
                    dataKey="total"
                    nameKey="cycle"
                    innerRadius={72}
                    outerRadius={110}
                    paddingAngle={4}
                  >
                    {(overview?.studentsPerCycle ?? []).map((item, index) => (
                      <Cell key={`${item.cycle}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
          {loading ? (
            <div className="empty-note">Chargement…</div>
          ) : error ? (
            <div className="empty-note">{error}</div>
          ) : (overview?.laureatesPerYear ?? []).length === 0 ? (
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
          {loading ? (
            <div className="empty-note">Chargement…</div>
          ) : error ? (
            <div className="empty-note">{error}</div>
          ) : (overview?.recentActivity ?? []).length === 0 ? (
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
  );
}
