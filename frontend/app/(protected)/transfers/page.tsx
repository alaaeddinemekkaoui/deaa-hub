'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, FileText, FileSpreadsheet, Upload, X } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { api } from '@/services/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

type AcademicClass = {
  id: number;
  name: string;
  filiere?: { name: string } | null;
};

type StudentRow = {
  id: number;
  fullName: string;
  codeMassar: string;
  anneeAcademique: string;
  filiere?: { name: string } | null;
};

type TransferResult = {
  transferred: number;
  errors: string[];
};

/* ── Next academic year helper ─────────────────────────────────────────── */
function nextAcademicYear(current: string): string {
  const match = current.match(/(\d{4})\/(\d{4})/);
  if (!match) return current;
  const start = Number(match[1]) + 1;
  const end = Number(match[2]) + 1;
  return `${start}/${end}`;
}

/* ── Import CSV/XLSX and return student IDs ────────────────────────────── */
async function parseImportedIds(file: File): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
        const ids = rows
          .map((r) => Number(r['studentId'] ?? r['id'] ?? r['Id'] ?? r['StudentId']))
          .filter((n) => Number.isInteger(n) && n > 0);
        resolve(ids);
      } catch {
        reject(new Error('Failed to parse file'));
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsArrayBuffer(file);
  });
}

export default function TransfersPage() {
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [fromClassId, setFromClassId] = useState('');
  const [toClassId, setToClassId] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [academicYear, setAcademicYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TransferResult | null>(null);

  // CSV/XLSX import for student selection
  const fileRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importedIds, setImportedIds] = useState<number[] | null>(null);

  /* load classes on mount */
  useEffect(() => {
    api.get<{ data: AcademicClass[] }>('/classes', { params: { limit: 200 } })
      .then((r) => {
        const classData = r.data?.data || [];
        setClasses(classData);
      })
      .catch((error) => {
        console.error('Failed to load classes:', error);
        toast.error('Impossible de charger les classes');
      });
  }, []);

  /* load students when fromClass changes */
  useEffect(() => {
    if (!fromClassId) { setStudents([]); setSelectedIds(new Set()); return; }
    setLoadingStudents(true);
    const classIdNum = Number(fromClassId);
    if (!Number.isInteger(classIdNum) || classIdNum < 1) {
      console.error('Invalid classId:', fromClassId);
      toast.error('ID de classe invalide');
      setLoadingStudents(false);
      return;
    }
    api.get(`/students/by-class/${classIdNum}`)
      .then((r) => {
        const studentData = Array.isArray(r.data) ? r.data : (r.data?.data as StudentRow[]) || [];
        setStudents(studentData);
        setSelectedIds(new Set());
        // auto-suggest next academic year from first student
        if (studentData.length > 0) {
          setAcademicYear(nextAcademicYear(studentData[0].anneeAcademique));
        }
      })
      .catch((error) => {
        console.error('Failed to load students:', error);
        if (error.response?.status === 404) {
          toast.error('Aucun étudiant trouvé dans cette classe');
        } else {
          toast.error('Impossible de charger les étudiants de la classe sélectionnée');
        }
      })
      .finally(() => setLoadingStudents(false));
  }, [fromClassId]);

  const allChecked = students.length > 0 && selectedIds.size === students.length;
  const toggleAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(students.map((s) => s.id)));
  };
  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* handle file import for student IDs */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setImportFile(f);
    if (!f) { setImportedIds(null); return; }
    try {
      const ids = await parseImportedIds(f);
      setImportedIds(ids);
      // pre-select matching students
      const matching = new Set(
        students.filter((s) => ids.includes(s.id)).map((s) => s.id),
      );
      setSelectedIds(matching);
      toast.success(`${matching.size} student(s) selected from file`);
    } catch {
      toast.error('Impossible de lire le fichier importé');
    }
  };

  const activeIds = useMemo(
    () => (importedIds !== null ? importedIds : [...selectedIds]),
    [importedIds, selectedIds],
  );

  const canTransfer =
    fromClassId &&
    toClassId &&
    fromClassId !== toClassId &&
    activeIds.length > 0 &&
    academicYear.trim();

  const handleTransfer = async () => {
    if (!canTransfer) return;
    setSubmitting(true);
    try {
      const res = await api.post<TransferResult>('/students/transfer', {
        fromClassId: Number(fromClassId),
        toClassId: Number(toClassId),
        studentIds: activeIds,
        academicYear: academicYear.trim(),
      });
      setResult(res.data);
      if (res.data.transferred > 0) {
        toast.success(`${res.data.transferred} étudiant(s) transféré(s) avec succès`);
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error('Le transfert a échoué. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFromClassId('');
    setToClassId('');
    setStudents([]);
    setSelectedIds(new Set());
    setAcademicYear('');
    setResult(null);
    setImportFile(null);
    setImportedIds(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transfert d'étudiants"
        description="Déplacez un groupe d'étudiants d'une classe à une autre et mettez à jour leur année académique. L'historique de leur classe est préservé automatiquement."
      />

      {result ? (
        /* ── Result view ── */
        <div className="surface-card space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800">
              {result.transferred} étudiant(s) transféré(s) avec succès
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
              Nouveau transfert
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Step 1: From / To / Year ── */}
          <div className="surface-card space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Étape 1 — Sélectionner les classes &amp; l'année cible
            </p>
            <div className="grid gap-4 md:grid-cols-3 items-end">
              <div className="field-stack">
                <label className="field-label">De la classe</label>
                <select
                  className="input"
                  value={fromClassId}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    console.log('Selected class ID:', selectedValue);
                    setFromClassId(selectedValue);
                    setResult(null);
                  }}
                >
                  <option value="">— choisir la classe source —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}{c.filiere ? ` (${c.filiere.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-center pt-5 text-slate-400">
                <ArrowRight size={20} />
              </div>

              <div className="field-stack">
                <label className="field-label">Vers la classe</label>
                <select
                  className="input"
                  value={toClassId}
                  onChange={(e) => {
                    const selectedValue = e.target.value;
                    console.log('Selected target class ID:', selectedValue);
                    setToClassId(selectedValue);
                  }}
                >
                  <option value="">— choisir la classe cible —</option>
                  {classes
                    .filter((c) => String(c.id) !== fromClassId)
                    .map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}{c.filiere ? ` (${c.filiere.name})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="field-stack max-w-xs">
              <label className="field-label">Année académique cible</label>
              <input
                className="input"
                placeholder="ex. 2026/2027"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
              />
              <p className="text-xs text-slate-400">
                L'année académique des étudiants sera mise à jour à cette valeur.
              </p>
            </div>
          </div>

          {/* ── Step 2: Select students ── */}
          {fromClassId && (
            <div className="surface-card space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Étape 2 — Sélectionner les étudiants
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {importedIds !== null
                      ? `${importedIds.length} du fichier`
                      : `${selectedIds.size} sélectionné(s)`}
                  </span>
                  {/* import file */}
                  <button
                    type="button"
                    className="btn-outline gap-1.5 text-xs py-1"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={13} />
                    Importer la liste
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {importFile && (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-500"
                      onClick={() => {
                        setImportFile(null);
                        setImportedIds(null);
                        if (fileRef.current) fileRef.current.value = '';
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {importFile && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                  {importFile.name.endsWith('.xlsx')
                    ? <FileSpreadsheet size={16} className="text-emerald-600" />
                    : <FileText size={16} className="text-emerald-600" />}
                  <span className="font-medium text-slate-800">{importFile.name}</span>
                  <span className="text-slate-500 text-xs">
                    — {importedIds?.length ?? 0} IDs trouvés
                  </span>
                </div>
              )}

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
                          <th className="w-10">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              onChange={toggleAll}
                              className="cursor-pointer"
                              disabled={importedIds !== null}
                            />
                          </th>
                          <th>Étudiant</th>
                          <th>Code Massar</th>
                          <th>Filière</th>
                          <th>Année actuelle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => {
                          const checked = importedIds !== null
                            ? importedIds.includes(s.id)
                            : selectedIds.has(s.id);
                          return (
                            <tr
                              key={s.id}
                              className={checked ? 'bg-emerald-50/60' : ''}
                              onClick={() => importedIds === null && toggleOne(s.id)}
                              style={{ cursor: importedIds === null ? 'pointer' : 'default' }}
                            >
                              <td onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => importedIds === null && toggleOne(s.id)}
                                  className="cursor-pointer"
                                  disabled={importedIds !== null}
                                />
                              </td>
                              <td className="font-medium text-slate-900">{s.fullName}</td>
                              <td className="text-slate-500">{s.codeMassar}</td>
                              <td className="text-slate-500">{s.filiere?.name ?? '—'}</td>
                              <td className="text-slate-500">{s.anneeAcademique}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Execute ── */}
          <div className="flex justify-end gap-2">
            <button
              className="btn-primary"
              type="button"
              disabled={!canTransfer || submitting}
              onClick={handleTransfer}
            >
              {submitting ? 'Transfert en cours…' : `Transférer ${activeIds.length} étudiant(s)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
