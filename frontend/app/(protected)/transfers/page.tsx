'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { api } from '@/services/api';
import { toast } from 'sonner';

/* ── Types ──────────────────────────────────────────────────────────────── */
type Department = { id: number; name: string };

type Filiere = {
  id: number;
  name: string;
  departmentId: number;
};

type AcademicClass = {
  id: number;
  name: string;
  year: number;
  filiereId: number | null;
  filiere?: { id: number; name: string } | null;
};

type StudentRow = {
  id: number;
  fullName: string;
  codeMassar: string;
  anneeAcademique: string;
  firstYearEntry: number;
  filiere?: { id: number; name: string } | null;
};

type StudentStatus = 'admis' | 'non_admis' | 'redoublant';
type StudentWithStatus = StudentRow & { status: StudentStatus };

type ProgressResult = { processed: number; errors: string[] };

/* ── Helpers ────────────────────────────────────────────────────────────── */
function nextAcademicYear(current: string): string {
  const match = current.match(/(\d{4})\/(\d{4})/);
  if (!match) return current;
  return `${Number(match[1]) + 1}/${Number(match[2]) + 1}`;
}

const STATUS_COLORS: Record<StudentStatus, string> = {
  admis: 'bg-emerald-50',
  non_admis: 'bg-red-50',
  redoublant: 'bg-orange-50',
};

const STATUS_BADGE: Record<StudentStatus, string> = {
  admis: 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800',
  non_admis: 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-800',
  redoublant: 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-orange-100 text-orange-800',
};

/* ── Cascading class selector component ────────────────────────────────── */
function ClassSelector({
  label,
  hint,
  value,
  onChange,
  departments,
  filieres,
  classes,
  excludeClassId,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  departments: Department[];
  filieres: Filiere[];
  classes: AcademicClass[];
  excludeClassId?: string;
  disabled?: boolean;
}) {
  const [deptFilter, setDeptFilter] = useState('');
  const [filiereFilter, setFiliereFilter] = useState('');

  const filteredFilieres = useMemo(
    () => (deptFilter ? filieres.filter((f) => f.departmentId === Number(deptFilter)) : filieres),
    [filieres, deptFilter],
  );

  const filteredClasses = useMemo(() => {
    let result = classes;
    if (excludeClassId) result = result.filter((c) => String(c.id) !== excludeClassId);
    if (filiereFilter) result = result.filter((c) => c.filiereId === Number(filiereFilter));
    else if (deptFilter) {
      const deptFiliereIds = new Set(
        filieres.filter((f) => f.departmentId === Number(deptFilter)).map((f) => f.id),
      );
      result = result.filter((c) => c.filiereId !== null && deptFiliereIds.has(c.filiereId!));
    }
    return result;
  }, [classes, filieres, deptFilter, filiereFilter, excludeClassId]);

  // Clear filière filter when dept changes
  const handleDeptChange = (v: string) => {
    setDeptFilter(v);
    setFiliereFilter('');
    onChange('');
  };

  const handleFiliereChange = (v: string) => {
    setFiliereFilter(v);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <label className="field-label">{label}</label>
      {hint && <p className="text-xs text-slate-400 -mt-1">{hint}</p>}

      {/* Department filter */}
      <div className="grid grid-cols-2 gap-2">
        <select
          className="input text-sm"
          value={deptFilter}
          onChange={(e) => handleDeptChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">Tous les départements ({departments.length})</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select
          className="input text-sm"
          value={filiereFilter}
          onChange={(e) => handleFiliereChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">Toutes les filières ({filteredFilieres.length})</option>
          {filteredFilieres.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      {/* Class dropdown */}
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">— choisir une classe ({filteredClasses.length}) —</option>
        {filteredClasses.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.name}
            {c.filiere ? ` · ${c.filiere.name}` : ''}
          </option>
        ))}
      </select>

      {filteredClasses.length === 0 && (filiereFilter || deptFilter) && (
        <p className="text-xs text-slate-400">Aucune classe pour ce filtre.</p>
      )}
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────────── */
export default function TransfersPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);

  const [fromClassId, setFromClassId] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [students, setStudents] = useState<StudentWithStatus[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [academicYear, setAcademicYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ProgressResult | null>(null);

  /* load reference data on mount */
  useEffect(() => {
    Promise.all([
      api.get('/departments', { params: { limit: 200 } }),
      api.get('/filieres', { params: { limit: 200 } }),
      api.get('/classes', { params: { limit: 200 } }),
    ]).then(([deptRes, filRes, clsRes]) => {
      setDepartments((deptRes.data?.data as Department[]) || []);
      setFilieres((filRes.data?.data as Filiere[]) || []);
      setClasses((clsRes.data?.data as AcademicClass[]) || []);
    }).catch(() => toast.error('Impossible de charger les données'));
  }, []);

  /* load students when source class changes */
  useEffect(() => {
    if (!fromClassId) { setStudents([]); return; }
    setLoadingStudents(true);
    api.get(`/students/by-class/${fromClassId}`)
      .then((r) => {
        const data: StudentRow[] = Array.isArray(r.data) ? r.data : [];
        setStudents(data.map((s) => ({ ...s, status: 'admis' as StudentStatus })));
        if (data.length > 0) {
          setAcademicYear(nextAcademicYear(data[0].anneeAcademique));
        }
      })
      .catch(() => toast.error('Impossible de charger les étudiants'))
      .finally(() => setLoadingStudents(false));
  }, [fromClassId]);

  const setStudentStatus = (id: number, status: StudentStatus) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const setAllStatus = (status: StudentStatus) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const counts = students.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {} as Record<StudentStatus, number>);

  const canSubmit = fromClassId && toClassId && fromClassId !== toClassId && students.length > 0 && academicYear.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await api.post<ProgressResult>('/students/progress', {
        fromClassId: Number(fromClassId),
        toClassId: Number(toClassId),
        academicYear: academicYear.trim(),
        students: students.map((s) => ({ id: s.id, status: s.status })),
      });
      setResult(res.data);
      if (res.data.processed > 0) {
        toast.success(`${res.data.processed} étudiant(s) traité(s) avec succès`);
      }
    } catch {
      toast.error('Le traitement a échoué. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFromClassId('');
    setToClassId('');
    setStudents([]);
    setAcademicYear('');
    setResult(null);
  };

  const targetClassName = classes.find((c) => String(c.id) === toClassId)?.name;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Passage de classe"
        description="Sélectionnez la classe source, définissez le statut de chaque étudiant, puis choisissez la classe cible pour les admis."
      />

      {result ? (
        <div className="surface-card space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800">
              {result.processed} étudiant(s) traité(s) avec succès
            </p>
          </div>
          {result.errors.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
                {result.errors.length} problème(s)
              </p>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs text-red-700">{err}</p>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button className="btn-primary" type="button" onClick={handleReset}>
              Nouveau passage
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── Step 1: Source class ── */}
          <div className="surface-card space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Étape 1 — Classe source
            </p>
            <ClassSelector
              label="Classe source"
              value={fromClassId}
              onChange={(v) => { setFromClassId(v); setToClassId(''); setResult(null); }}
              departments={departments}
              filieres={filieres}
              classes={classes}
            />
          </div>

          {/* ── Step 2: Students with status ── */}
          {fromClassId && (
            <div className="surface-card space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Étape 2 — Statut des étudiants
                </p>

                {students.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {(counts.admis ?? 0) > 0 && (
                      <span className={STATUS_BADGE.admis}>
                        <CheckCircle size={11} />
                        {counts.admis} admis
                      </span>
                    )}
                    {(counts.non_admis ?? 0) > 0 && (
                      <span className={STATUS_BADGE.non_admis}>
                        <XCircle size={11} />
                        {counts.non_admis} non admis
                      </span>
                    )}
                    {(counts.redoublant ?? 0) > 0 && (
                      <span className={STATUS_BADGE.redoublant}>
                        <RefreshCw size={11} />
                        {counts.redoublant} redoublant(s)
                      </span>
                    )}
                    <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                      <span className="text-xs text-slate-400 mr-1">Tout :</span>
                      <button type="button" className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100" onClick={() => setAllStatus('admis')}>Admis</button>
                      <button type="button" className="rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-100" onClick={() => setAllStatus('non_admis')}>Non Admis</button>
                      <button type="button" className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 hover:bg-orange-100" onClick={() => setAllStatus('redoublant')}>Redoublant</button>
                    </div>
                  </div>
                )}
              </div>

              {loadingStudents ? (
                <p className="text-sm text-slate-400">Chargement des étudiants…</p>
              ) : students.length === 0 ? (
                <p className="text-sm text-slate-400">Aucun étudiant dans cette classe.</p>
              ) : (
                <div className="data-table-wrap">
                  <div className="table-scroll">
                    <table className="table-base">
                      <thead>
                        <tr>
                          <th>Étudiant</th>
                          <th>Code Massar</th>
                          <th>Filière</th>
                          <th>Année actuelle</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => (
                          <tr key={s.id} className={STATUS_COLORS[s.status]}>
                            <td className="font-medium text-slate-900">{s.fullName}</td>
                            <td className="text-slate-500">{s.codeMassar}</td>
                            <td className="text-slate-500">{s.filiere?.name ?? '—'}</td>
                            <td className="text-slate-500">{s.anneeAcademique}</td>
                            <td>
                              <div className="relative inline-block">
                                <select
                                  className={`appearance-none cursor-pointer rounded-lg border py-1 pl-2.5 pr-7 text-xs font-semibold focus:outline-none transition-colors
                                    ${s.status === 'admis' ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                                      : s.status === 'non_admis' ? 'border-red-300 bg-red-100 text-red-800'
                                      : 'border-orange-300 bg-orange-100 text-orange-800'}`}
                                  value={s.status}
                                  onChange={(e) => setStudentStatus(s.id, e.target.value as StudentStatus)}
                                >
                                  <option value="admis">Admis</option>
                                  <option value="non_admis">Non Admis</option>
                                  <option value="redoublant">Redoublant</option>
                                </select>
                                <ChevronDown size={12} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-current opacity-60" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {students.length > 0 && (
                <p className="text-xs text-slate-500 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <strong>Admis</strong> → déplacés vers la classe cible, année mise à jour.{' '}
                  <strong>Non Admis / Redoublant</strong> → restent dans la même classe, année mise à jour. L&apos;historique est conservé.
                </p>
              )}
            </div>
          )}

          {/* ── Step 3: Target class + year ── */}
          {fromClassId && students.length > 0 && (
            <div className="surface-card space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Étape 3 — Classe cible &amp; année académique
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <ClassSelector
                  label="Classe cible"
                  hint="Pour les étudiants admis uniquement"
                  value={toClassId}
                  onChange={setToClassId}
                  departments={departments}
                  filieres={filieres}
                  classes={classes}
                  excludeClassId={fromClassId}
                />
                <div className="field-stack">
                  <label className="field-label">Nouvelle année académique</label>
                  <input
                    className="input"
                    placeholder="ex. 2026/2027"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">Appliquée à tous les étudiants.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Submit ── */}
          {students.length > 0 && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-slate-500">
                {counts.admis ?? 0} admis → <strong>{targetClassName ?? '—'}</strong>
                {(counts.non_admis ?? 0) + (counts.redoublant ?? 0) > 0 && (
                  <span className="ml-2 text-slate-400">
                    · {(counts.non_admis ?? 0) + (counts.redoublant ?? 0)} restent dans leur classe
                  </span>
                )}
              </p>
              <button
                className="btn-primary"
                type="button"
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Traitement en cours…' : `Valider le passage (${students.length} étudiants)`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
