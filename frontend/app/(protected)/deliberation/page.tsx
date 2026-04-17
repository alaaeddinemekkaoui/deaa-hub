'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  Printer,
  User,
} from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { MetricCard } from '@/components/admin/metric-card';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import {
  api,
  fetchRef,
  getApiErrorMessage,
  PaginatedResponse,
} from '@/services/api';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

type AcademicYear = { id: number; label: string; isCurrent: boolean };
type Department = { id: number; name: string };
type Filiere = { id: number; name: string; departmentId: number };
type AcademicOption = { id: number; name: string; filiereId: number };

type AcademicClass = {
  id: number;
  name: string;
  year: number;
  filiereId?: number | null;
  optionId?: number | null;
  filiere?: { id: number; name: string; department?: { id: number; name: string } } | null;
  academicOption?: { id: number; name: string } | null;
};

type ElementRow = {
  id: number;
  name: string;
  type: 'CM' | 'TD' | 'TP';
  volumeHoraire?: number | null;
};

type ModuleRow = {
  id: number;
  name: string;
  semestre?: string | null;
  elements: ElementRow[];
};

type GradeCell = { score: number; maxScore: number; assessmentType: string | null };

type StudentRow = {
  id: number;
  fullName: string;
  codeMassar: string;
  dateNaissance?: string | null;
  grades: Record<number, GradeCell>;
  moduleAverages: Record<number, number | null>;
  overallAverage: number | null;
};

type DeliberationData = {
  class: {
    id: number;
    name: string;
    year: number;
    filiere?: { name: string } | null;
    academicOption?: { name: string } | null;
  };
  modules: ModuleRow[];
  students: StudentRow[];
  academicYear: string | null;
  semester: string | null;
};

// ─── Computed student row with filtered averages ──────────────────────────────

type ComputedStudent = StudentRow & {
  filteredModuleAverages: Record<number, number | null>;
  filteredOverallAverage: number | null;
};

function computeStudentAverages(
  student: StudentRow,
  modules: ModuleRow[],
): ComputedStudent {
  const filteredModuleAverages: Record<number, number | null> = {};

  for (const mod of modules) {
    const elementGrades = mod.elements
      .map((el) => student.grades[el.id])
      .filter((g): g is GradeCell => g !== undefined);

    if (elementGrades.length === 0) {
      filteredModuleAverages[mod.id] = null;
    } else {
      const avg =
        elementGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20, 0) /
        elementGrades.length;
      filteredModuleAverages[mod.id] = Math.round(avg * 100) / 100;
    }
  }

  const validAverages = Object.values(filteredModuleAverages).filter(
    (v): v is number => v !== null,
  );
  const filteredOverallAverage =
    validAverages.length > 0
      ? Math.round(
          (validAverages.reduce((sum, v) => sum + v, 0) / validAverages.length) * 100,
        ) / 100
      : null;

  return { ...student, filteredModuleAverages, filteredOverallAverage };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtScore(score: number, maxScore: number): string {
  return `${score}/${maxScore}`;
}

function fmtAvg(avg: number | null): string {
  if (avg === null) return '—';
  return avg.toFixed(2);
}

function mention(avg: number | null): string {
  if (avg === null) return '—';
  if (avg >= 16) return 'Très bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez bien';
  if (avg >= 10) return 'Passable';
  return 'Insuffisant';
}

function mentionColor(avg: number | null): string {
  if (avg === null) return 'text-slate-400';
  if (avg >= 16) return 'text-emerald-600 font-semibold';
  if (avg >= 14) return 'text-blue-600 font-semibold';
  if (avg >= 12) return 'text-cyan-600';
  if (avg >= 10) return 'text-amber-600';
  return 'text-red-600 font-semibold';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DeliberationPage() {
  const { user } = useAuth();
  const restrictedToOwnDepartments = user?.role === 'user' || user?.role === 'viewer';

  // Reference data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [options, setOptions] = useState<AcademicOption[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  // Selectors
  const [departmentId, setDepartmentId] = useState('');
  const [filiereId, setFiliereId] = useState('');
  const [optionId, setOptionId] = useState('');
  const [classId, setClassId] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');

  // Loaded data
  const [data, setData] = useState<DeliberationData | null>(null);
  const [loadingRef, setLoadingRef] = useState(true);
  const [loading, setLoading] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'classe' | 'releve'>('classe');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [decisionOverrides, setDecisionOverrides] = useState<Record<number, 'admis' | 'ajourné'>>({});

  // ─── Reference data visibility ─────────────────────────────────────────────

  const visibleDepartments = useMemo(() => {
    if (!restrictedToOwnDepartments) return departments;
    const allowed = new Set((user?.departments ?? []).map((d) => d.id));
    return departments.filter((d) => allowed.has(d.id));
  }, [departments, restrictedToOwnDepartments, user?.departments]);

  const visibleFilieres = useMemo(() => {
    const allowedDepts = new Set(visibleDepartments.map((d) => d.id));
    return filieres.filter((f) => {
      if (!allowedDepts.has(f.departmentId)) return false;
      if (departmentId && String(f.departmentId) !== departmentId) return false;
      return true;
    });
  }, [departmentId, filieres, visibleDepartments]);

  const visibleOptions = useMemo(() => {
    if (!filiereId) return [];
    return options.filter((o) => String(o.filiereId) === filiereId);
  }, [filiereId, options]);

  const visibleClasses = useMemo(() => {
    return classes.filter((c) => {
      const cDeptId = c.filiere?.department?.id;
      if (departmentId && String(cDeptId ?? '') !== departmentId) return false;
      if (filiereId && String(c.filiereId ?? '') !== filiereId) return false;
      if (optionId && String(c.optionId ?? '') !== optionId) return false;
      return true;
    });
  }, [classes, departmentId, filiereId, optionId]);

  // ─── Semester derived from loaded modules ──────────────────────────────────

  const availableSemesters = useMemo(() => {
    if (!data) return [];
    const values = data.modules
      .map((m) => m.semestre)
      .filter((s): s is string => !!s);
    return [...new Set(values)].sort();
  }, [data]);

  // Modules visible for the selected semester
  const visibleModules = useMemo(() => {
    if (!data) return [];
    if (!semester) return data.modules;
    return data.modules.filter((m) => !m.semestre || m.semestre === semester);
  }, [data, semester]);

  // Students with averages recomputed over the visible modules
  const computedStudents = useMemo<ComputedStudent[]>(() => {
    if (!data) return [];
    return data.students.map((s) => computeStudentAverages(s, visibleModules));
  }, [data, visibleModules]);

  const passCount = useMemo(
    () => computedStudents.filter((s) => (s.filteredOverallAverage ?? 0) >= 10).length,
    [computedStudents],
  );
  const failCount = useMemo(
    () =>
      computedStudents.filter(
        (s) => s.filteredOverallAverage !== null && s.filteredOverallAverage < 10,
      ).length,
    [computedStudents],
  );

  const selectedStudent = useMemo(
    () => computedStudents.find((s) => s.id === selectedStudentId) ?? null,
    [computedStudents, selectedStudentId],
  );

  // ─── Load reference data ───────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingRef(true);
        const [depsRes, filRes, optRes, classRes, yearsRes] = await Promise.all([
          fetchRef<PaginatedResponse<Department>>(
            '/departments?page=1&limit=200&sortBy=name&sortOrder=asc',
          ),
          fetchRef<PaginatedResponse<Filiere>>(
            '/filieres?page=1&limit=500&sortBy=name&sortOrder=asc',
          ),
          fetchRef<PaginatedResponse<AcademicOption>>(
            '/options?page=1&limit=500&sortBy=name&sortOrder=asc',
          ),
          fetchRef<PaginatedResponse<AcademicClass>>(
            '/classes?page=1&limit=500&sortBy=name&sortOrder=asc',
          ),
          fetchRef<AcademicYear[]>('/academic-years'),
        ]);
        setDepartments(depsRes.data);
        setFilieres(filRes.data);
        setOptions(optRes.data);
        setClasses(classRes.data);
        const years = yearsRes;
        setAcademicYears(years);
        const current = years.find((y) => y.isCurrent);
        if (current) setAcademicYear(current.label);
        else if (years.length > 0) setAcademicYear(years[0].label);
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Impossible de charger les données de référence.'),
        );
      } finally {
        setLoadingRef(false);
      }
    };
    void load();
  }, []);

  // Auto-select single department
  useEffect(() => {
    if (restrictedToOwnDepartments && user?.departments?.length === 1 && !departmentId) {
      setDepartmentId(String(user.departments[0].id));
    }
  }, [departmentId, restrictedToOwnDepartments, user?.departments]);

  // Cascade reset filière
  useEffect(() => {
    const still = visibleFilieres.some((f) => String(f.id) === filiereId);
    if (!still) setFiliereId('');
  }, [departmentId, filiereId, visibleFilieres]);

  // Cascade reset option
  useEffect(() => {
    const still = visibleOptions.some((o) => String(o.id) === optionId);
    if (!still) setOptionId('');
  }, [filiereId, optionId, visibleOptions]);

  // Reset semester when class changes
  useEffect(() => {
    setSemester('');
    setSelectedStudentId(null);
    setDecisionOverrides({});
  }, [classId]);

  // ─── Load deliberation ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!classId) {
      setData(null);
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await api.get<DeliberationData>(
          `/grades/deliberation/class/${classId}`,
          {
            params: {
              academicYear: academicYear.trim() || undefined,
              semester: semester.trim() || undefined,
            },
          },
        );
        setData(res.data);
        setSelectedStudentId(null);
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Impossible de charger la délibération.'),
        );
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, [classId, academicYear, semester]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Évaluations"
        title="Délibération"
        description="Consultez les résultats par classe et semestre, extrayez les relevés de notes et imprimez les tableaux de délibération."
      />

      {/* Metrics */}
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Étudiants"
          value={data?.students.length ?? 0}
          hint="Dans la classe"
          icon={GraduationCap}
        />
        <MetricCard
          label="Modules"
          value={visibleModules.length}
          hint={semester ? `Semestre ${semester}` : 'Tous les semestres'}
          icon={BookOpen}
        />
        <MetricCard label="Admis" value={passCount} hint="Moyenne ≥ 10/20" icon={GraduationCap} />
        <MetricCard label="Non admis" value={failCount} hint="Moyenne < 10/20" icon={User} />
      </section>

      {/* Filters */}
      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Sélection de la classe</h2>
            <p className="panel-copy">
              Choisissez la classe, l&apos;année académique et le semestre pour afficher les résultats.
            </p>
          </div>
          {data && (
            <button
              className="btn-outline flex items-center gap-2"
              type="button"
              onClick={() => window.print()}
            >
              <Printer size={14} />
              Imprimer
            </button>
          )}
        </div>

        {loadingRef ? (
          <div className="empty-note">Chargement des filtres...</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="field-stack">
              <label className="field-label">Département</label>
              <select
                className="input"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={restrictedToOwnDepartments && visibleDepartments.length <= 1}
              >
                <option value="">Tous</option>
                {visibleDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Filière</label>
              <select
                className="input"
                value={filiereId}
                onChange={(e) => setFiliereId(e.target.value)}
              >
                <option value="">Toutes</option>
                {visibleFilieres.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Option</label>
              <select
                className="input"
                value={optionId}
                onChange={(e) => setOptionId(e.target.value)}
                disabled={!filiereId}
              >
                <option value="">Toutes</option>
                {visibleOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Classe</label>
              <select
                className="input"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">Choisir</option>
                {visibleClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.year})
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Année académique</label>
              <select
                className="input"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              >
                <option value="">Toutes les années</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.label}>
                    {y.label}
                    {y.isCurrent ? ' (en cours)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Semestre</label>
              <select
                className="input"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                disabled={!data || availableSemesters.length === 0}
              >
                <option value="">Tous les semestres</option>
                {availableSemesters.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Main content */}
      {!classId ? (
        <EmptyState
          title="Choisissez une classe"
          description="Sélectionnez la classe pour afficher les résultats de délibération."
        />
      ) : loading ? (
        <div className="surface-card">
          <div className="empty-note">Chargement des résultats...</div>
        </div>
      ) : !data ? null : (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 print:hidden">
            <button
              type="button"
              className={activeTab === 'classe' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setActiveTab('classe')}
            >
              Vue classe
            </button>
            <button
              type="button"
              className={activeTab === 'releve' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setActiveTab('releve')}
            >
              Relevé de notes
            </button>
          </div>

          {/* ── Tab: Vue classe ──────────────────────────────────────────────── */}
          {activeTab === 'classe' && (
            <section className="surface-card space-y-4">
              {/* Print header */}
              <div className="hidden print:block space-y-1 mb-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest">
                  Institut Agronomique et Vétérinaire Hassan II
                </p>
                <h1 className="text-xl font-bold text-slate-900">
                  Tableau de délibération — {data.class.name} ({data.class.year})
                </h1>
                {data.academicYear && (
                  <p className="text-sm text-slate-600">
                    Année académique : {data.academicYear}
                    {semester ? ` · ${semester}` : ''}
                  </p>
                )}
                {data.class.filiere && (
                  <p className="text-sm text-slate-600">
                    Filière : {data.class.filiere.name}
                  </p>
                )}
              </div>

              <div className="panel-header print:hidden">
                <div>
                  <h2 className="panel-title">Tableau de délibération</h2>
                  <p className="panel-copy">
                    {data.class.name} ({data.class.year})
                    {data.academicYear && ` · ${data.academicYear}`}
                    {semester && ` · ${semester}`}
                  </p>
                </div>
              </div>

              {computedStudents.length === 0 ? (
                <EmptyState
                  title="Aucun étudiant"
                  description="Cette classe ne contient pas encore d&apos;étudiants."
                />
              ) : visibleModules.length === 0 ? (
                <EmptyState
                  title="Aucun module"
                  description={
                    semester
                      ? `Aucun module n'est assigné à ce semestre pour cette classe.`
                      : `Aucun module n'est assigné à cette classe.`
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      {/* Module header row */}
                      <tr className="bg-slate-100">
                        <th
                          rowSpan={2}
                          className="border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700 min-w-[180px]"
                        >
                          Étudiant
                        </th>
                        <th
                          rowSpan={2}
                          className="border border-slate-300 px-2 py-2 text-left font-semibold text-slate-700 text-xs whitespace-nowrap"
                        >
                          Code Massar
                        </th>
                        {visibleModules.map((mod) => (
                          <th
                            key={mod.id}
                            colSpan={mod.elements.length + 1}
                            className="border border-slate-300 px-2 py-1.5 text-center font-semibold text-slate-800 text-xs bg-emerald-50"
                          >
                            {mod.name}
                            {mod.semestre && (
                              <span className="ml-1 font-normal text-slate-500">
                                ({mod.semestre})
                              </span>
                            )}
                          </th>
                        ))}
                        <th
                          rowSpan={2}
                          className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 text-xs bg-amber-50 whitespace-nowrap"
                        >
                          Moy. générale
                        </th>
                        <th
                          rowSpan={2}
                          className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 text-xs bg-amber-50"
                        >
                          Mention
                        </th>
                        <th
                          rowSpan={2}
                          className="border border-slate-300 px-2 py-2 text-center font-semibold text-slate-700 text-xs bg-amber-50"
                        >
                          Décision
                        </th>
                      </tr>
                      {/* Element header row */}
                      <tr className="bg-slate-50">
                        {visibleModules.map((mod) => (
                          <Fragment key={mod.id}>
                            {mod.elements.map((el) => (
                              <th
                                key={el.id}
                                className="border border-slate-300 px-2 py-1.5 text-center text-[11px] text-slate-600 whitespace-nowrap"
                              >
                                {el.name}
                                <br />
                                <span className="text-slate-400 text-[10px]">{el.type}</span>
                              </th>
                            ))}
                            <th className="border border-slate-300 px-2 py-1.5 text-center text-[11px] font-semibold text-slate-700 bg-emerald-50/60 whitespace-nowrap">
                              Moy.
                            </th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {computedStudents.map((student, idx) => {
                        const avg = student.filteredOverallAverage;
                        const autoAdmitted = (avg ?? 0) >= 10;
                        const override = decisionOverrides[student.id];
                        const effectiveAdmitted = override !== undefined
                          ? override === 'admis'
                          : autoAdmitted;
                        return (
                          <tr
                            key={student.id}
                            className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                          >
                            <td className="border border-slate-200 px-3 py-2 font-medium text-slate-900 text-xs">
                              {student.fullName}
                            </td>
                            <td className="border border-slate-200 px-2 py-2 text-slate-500 text-xs">
                              {student.codeMassar}
                            </td>
                            {visibleModules.map((mod) => (
                              <Fragment key={mod.id}>
                                {mod.elements.map((el) => {
                                  const g = student.grades[el.id];
                                  return (
                                    <td
                                      key={el.id}
                                      className="border border-slate-200 px-2 py-2 text-center text-xs"
                                    >
                                      {g ? (
                                        <span
                                          className={
                                            g.score / g.maxScore < 0.5
                                              ? 'text-red-600'
                                              : 'text-slate-700'
                                          }
                                        >
                                          {fmtScore(g.score, g.maxScore)}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="border border-slate-200 px-2 py-2 text-center text-xs font-semibold bg-emerald-50/40">
                                  <span
                                    className={mentionColor(
                                      student.filteredModuleAverages[mod.id] ?? null,
                                    )}
                                  >
                                    {fmtAvg(student.filteredModuleAverages[mod.id] ?? null)}
                                  </span>
                                </td>
                              </Fragment>
                            ))}
                            <td className="border border-slate-200 px-2 py-2 text-center text-xs font-bold bg-amber-50/40">
                              <span className={mentionColor(avg)}>{fmtAvg(avg)}</span>
                            </td>
                            <td className="border border-slate-200 px-2 py-2 text-center text-[11px] bg-amber-50/40">
                              <span className={mentionColor(avg)}>{mention(avg)}</span>
                            </td>
                            <td className="border border-slate-200 px-1 py-1 text-center text-[11px] font-semibold bg-amber-50/40">
                              {avg === null ? (
                                <span className="text-slate-400">—</span>
                              ) : (
                                <>
                                  <select
                                    className={`print:hidden rounded-full px-2 py-0.5 text-[11px] font-semibold border cursor-pointer outline-none transition-colors ${
                                      effectiveAdmitted
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:border-emerald-500'
                                        : 'bg-red-50 text-red-700 border-red-300 hover:border-red-500'
                                    }${override !== undefined ? ' ring-1 ring-offset-1 ring-amber-400' : ''}`}
                                    value={override ?? 'auto'}
                                    title="Modifier la décision du jury"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === 'auto') {
                                        setDecisionOverrides((prev) => {
                                          const next = { ...prev };
                                          delete next[student.id];
                                          return next;
                                        });
                                      } else {
                                        setDecisionOverrides((prev) => ({
                                          ...prev,
                                          [student.id]: val as 'admis' | 'ajourné',
                                        }));
                                      }
                                    }}
                                  >
                                    <option value="auto">
                                      {autoAdmitted ? 'Admis' : 'Ajourné'}
                                    </option>
                                    <option value="admis">Admis ✓</option>
                                    <option value="ajourné">Ajourné ✗</option>
                                  </select>
                                  <span
                                    className={`hidden print:inline ${effectiveAdmitted ? 'text-emerald-700' : 'text-red-700'}`}
                                  >
                                    {effectiveAdmitted ? 'Admis' : 'Ajourné'}
                                  </span>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Summary */}
              {computedStudents.length > 0 && (
                <div className="flex flex-wrap gap-4 pt-2 text-sm text-slate-600 print:pt-4">
                  <span>
                    Total : <strong>{computedStudents.length}</strong> étudiant(s)
                  </span>
                  <span className="text-emerald-700">
                    Admis : <strong>{passCount}</strong>
                  </span>
                  <span className="text-red-700">
                    Ajournés : <strong>{failCount}</strong>
                  </span>
                  <span>
                    Taux de réussite :{' '}
                    <strong>
                      {computedStudents.length > 0
                        ? `${Math.round((passCount / computedStudents.length) * 100)}%`
                        : '—'}
                    </strong>
                  </span>
                </div>
              )}
            </section>
          )}

          {/* ── Tab: Relevé de notes ─────────────────────────────────────────── */}
          {activeTab === 'releve' && (
            <section className="surface-card space-y-5">
              <div className="panel-header print:hidden">
                <div>
                  <h2 className="panel-title">Relevé de notes individuel</h2>
                  <p className="panel-copy">
                    Sélectionnez un étudiant pour afficher et imprimer son relevé.
                  </p>
                </div>
              </div>

              {/* Student selector */}
              <div className="field-stack max-w-sm print:hidden">
                <label className="field-label">Étudiant</label>
                <select
                  className="input"
                  value={selectedStudentId ?? ''}
                  onChange={(e) =>
                    setSelectedStudentId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">Choisir un étudiant</option>
                  {computedStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.codeMassar})
                    </option>
                  ))}
                </select>
              </div>

              {!selectedStudent ? (
                <EmptyState
                  title="Aucun étudiant sélectionné"
                  description="Choisissez un étudiant dans la liste pour afficher son relevé de notes."
                />
              ) : (
                <ReleveDeNote
                  student={selectedStudent}
                  modules={visibleModules}
                  classInfo={data.class}
                  academicYear={data.academicYear}
                  semester={semester}
                  decisionOverride={
                    selectedStudent.id in decisionOverrides
                      ? decisionOverrides[selectedStudent.id] === 'admis'
                      : undefined
                  }
                />
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Relevé de note component ─────────────────────────────────────────────────

type ReleveProps = {
  student: ComputedStudent;
  modules: ModuleRow[];
  classInfo: DeliberationData['class'];
  academicYear: string | null;
  semester: string;
  /** If defined, overrides the auto-computed Admis/Ajourné decision. */
  decisionOverride?: boolean;
};

function ReleveDeNote({ student, modules, classInfo, academicYear, semester, decisionOverride }: ReleveProps) {
  const avg = student.filteredOverallAverage;
  const autoAdmitted = (avg ?? 0) >= 10;
  const admitted = decisionOverride !== undefined ? decisionOverride : autoAdmitted;
  const isOverridden = decisionOverride !== undefined && decisionOverride !== autoAdmitted;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Institut Agronomique et Vétérinaire Hassan II
        </p>
        <h2 className="text-lg font-bold text-slate-900">Relevé de Notes</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600 pt-1">
          <span>
            <span className="text-slate-400">Étudiant :</span>{' '}
            <strong>{student.fullName}</strong>
          </span>
          <span>
            <span className="text-slate-400">Code Massar :</span>{' '}
            <strong>{student.codeMassar}</strong>
          </span>
          <span>
            <span className="text-slate-400">Classe :</span>{' '}
            <strong>
              {classInfo.name} ({classInfo.year})
            </strong>
          </span>
          {classInfo.filiere && (
            <span>
              <span className="text-slate-400">Filière :</span>{' '}
              <strong>{classInfo.filiere.name}</strong>
            </span>
          )}
          {academicYear && (
            <span>
              <span className="text-slate-400">Année :</span>{' '}
              <strong>{academicYear}</strong>
            </span>
          )}
          {semester && (
            <span>
              <span className="text-slate-400">Semestre :</span>{' '}
              <strong>{semester}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Grades table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-4 py-2.5 text-left font-semibold text-slate-700">
                Module
              </th>
              <th className="border border-slate-300 px-4 py-2.5 text-left font-semibold text-slate-700">
                Élément de module
              </th>
              <th className="border border-slate-300 px-2 py-2.5 text-center font-semibold text-slate-700">
                Type
              </th>
              <th className="border border-slate-300 px-3 py-2.5 text-center font-semibold text-slate-700">
                Note
              </th>
              <th className="border border-slate-300 px-3 py-2.5 text-center font-semibold text-slate-700">
                Barème
              </th>
              <th className="border border-slate-300 px-3 py-2.5 text-center font-semibold text-slate-700">
                Note /20
              </th>
            </tr>
          </thead>
          <tbody>
            {modules.map((mod) => {
              const rowCount = mod.elements.length || 1;
              const modAvg = student.filteredModuleAverages[mod.id] ?? null;

              return mod.elements.length === 0 ? (
                <tr key={mod.id}>
                  <td className="border border-slate-200 px-4 py-2 font-medium text-slate-800">
                    {mod.name}
                  </td>
                  <td
                    colSpan={5}
                    className="border border-slate-200 px-4 py-2 text-slate-400 text-center"
                  >
                    Aucun élément
                  </td>
                </tr>
              ) : (
                mod.elements.map((el, elIdx) => {
                  const g = student.grades[el.id];
                  const normalized =
                    g ? Math.round((g.score / g.maxScore) * 20 * 100) / 100 : null;
                  return (
                    <tr
                      key={el.id}
                      className={elIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                    >
                      {elIdx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="border border-slate-200 px-4 py-2 font-semibold text-slate-800 align-top"
                        >
                          <div>{mod.name}</div>
                          {mod.semestre && (
                            <div className="text-xs text-slate-400 font-normal">
                              {mod.semestre}
                            </div>
                          )}
                          <div className="mt-2 text-xs text-slate-600">
                            Moy. module :{' '}
                            <span className={`font-bold ${mentionColor(modAvg)}`}>
                              {fmtAvg(modAvg)}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="border border-slate-200 px-4 py-2 text-slate-700">
                        {el.name}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 text-center text-xs text-slate-500">
                        {el.type}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center font-medium">
                        {g ? (
                          <span
                            className={g.score / g.maxScore < 0.5 ? 'text-red-600' : 'text-slate-800'}
                          >
                            {g.score}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center text-slate-500">
                        {g ? g.maxScore : '—'}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center font-semibold">
                        {normalized !== null ? (
                          <span className={normalized < 10 ? 'text-red-600' : 'text-slate-800'}>
                            {normalized.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-amber-50 font-bold">
              <td
                colSpan={5}
                className="border border-slate-300 px-4 py-3 text-right text-slate-800"
              >
                Moyenne générale
              </td>
              <td
                className={`border border-slate-300 px-3 py-3 text-center text-base ${mentionColor(avg)}`}
              >
                {fmtAvg(avg)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Decision box */}
      <div className="flex flex-wrap gap-4 items-center">
        <div
          className={`rounded-2xl px-6 py-4 flex-1 text-center ${
            admitted
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">
            Décision du jury
          </p>
          <p className={`text-2xl font-bold ${admitted ? 'text-emerald-700' : 'text-red-700'}`}>
            {avg === null ? 'Notes manquantes' : admitted ? 'ADMIS(E)' : 'AJOURNÉ(E)'}
          </p>
          <p className={`text-sm mt-1 ${mentionColor(avg)}`}>{mention(avg)}</p>
          {isOverridden && (
            <p className="text-[11px] text-amber-600 mt-1 font-medium">
              Décision modifiée manuellement
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 px-6 py-4 flex-1 text-center space-y-1">
          <p className="text-xs text-slate-500 uppercase tracking-widest">
            Signature du directeur
          </p>
          <div className="h-16 border-b border-dashed border-slate-300 mt-2" />
          <p className="text-xs text-slate-400">Cachet et signature</p>
        </div>
      </div>
    </div>
  );
}
