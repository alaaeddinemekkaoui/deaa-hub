'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, UserCheck } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type AcademicClass = {
  id: number;
  name: string;
  year: number;
  filiere?: { id?: number; name: string } | null;
  _count?: { students: number; teachers: number; cours: number };
};

type Student = {
  id: number;
  fullName: string;
  codeMassar: string;
  anneeAcademique?: string | null;
  filiere?: { id: number; name: string } | null;
};

export default function StudentClassTransferPage() {
  const [allClasses, setAllClasses] = useState<AcademicClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Step 1 — source class
  const [sourceId, setSourceId] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');

  // Step 2 — students from source
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [studentSearch, setStudentSearch] = useState('');

  // Step 3 — target class + academic year
  const [targetId, setTargetId] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  // Confirm modal
  const [modalOpen, setModalOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Session log
  const [log, setLog] = useState<{ count: number; from: string; to: string }[]>([]);

  // Load all classes once
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingClasses(true);
        const res = await api.get<PaginatedResponse<AcademicClass>>('/classes', {
          params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' },
        });
        setAllClasses(res.data.data);
      } catch {
        toast.error('Impossible de charger les classes');
      } finally {
        setLoadingClasses(false);
      }
    };
    void load();
  }, []);

  // Load students when source class changes
  useEffect(() => {
    if (!sourceId) { setStudents([]); setSelected(new Set()); return; }
    const load = async () => {
      try {
        setLoadingStudents(true);
        const res = await api.get<{ data: Student[] }>(`/students/by-class/${sourceId}`);
        const list = Array.isArray(res.data) ? res.data : res.data.data ?? [];
        setStudents(list);
        setSelected(new Set());
      } catch {
        toast.error('Impossible de charger les étudiants');
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    void load();
  }, [sourceId]);

  // Default academic year from source class
  useEffect(() => {
    const src = allClasses.find((c) => String(c.id) === sourceId);
    if (src) setAcademicYear(`${src.year}/${src.year + 1}`);
  }, [sourceId, allClasses]);

  const sourceCandidates = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase();
    return q ? allClasses.filter((c) => c.name.toLowerCase().includes(q) || String(c.year).includes(q)) : allClasses;
  }, [allClasses, sourceSearch]);

  const targetCandidates = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    return allClasses.filter(
      (c) => String(c.id) !== sourceId && (!q || c.name.toLowerCase().includes(q) || String(c.year).includes(q)),
    );
  }, [allClasses, sourceId, targetSearch]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return q ? students.filter((s) => s.fullName.toLowerCase().includes(q) || s.codeMassar.toLowerCase().includes(q)) : students;
  }, [students, studentSearch]);

  const sourceClass = useMemo(() => allClasses.find((c) => String(c.id) === sourceId), [allClasses, sourceId]);
  const targetClass = useMemo(() => allClasses.find((c) => String(c.id) === targetId), [allClasses, targetId]);

  const toggleStudent = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selected.size === filteredStudents.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const canConfirm = selected.size > 0 && targetId && academicYear.trim();

  const onTransfer = async () => {
    if (!canConfirm || !sourceId) return;
    setTransferring(true);
    try {
      const res = await api.post<{ transferred: number; errors: string[] }>('/students/transfer', {
        fromClassId: Number(sourceId),
        toClassId: Number(targetId),
        studentIds: Array.from(selected),
        academicYear: academicYear.trim(),
      });
      const { transferred, errors } = res.data;
      if (transferred > 0) {
        toast.success(`${transferred} étudiant(s) transféré(s) vers « ${targetClass?.name} (${targetClass?.year}) »`);
        setLog((prev) => [{ count: transferred, from: sourceClass?.name + ' ' + (sourceClass?.year ?? ''), to: (targetClass?.name ?? '') + ' ' + (targetClass?.year ?? '') }, ...prev]);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} erreur(s) : ${errors[0]}`);
      }
      // Reload students
      setSelected(new Set());
      const updated = await api.get<{ data: Student[] }>(`/students/by-class/${sourceId}`);
      setStudents(Array.isArray(updated.data) ? updated.data : updated.data.data ?? []);
      setModalOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec du transfert'));
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Étudiants"
        title="Transfert d'étudiants entre classes"
        description="Sélectionnez une classe source, choisissez les étudiants à transférer, puis désignez la classe cible. Par exemple : de « APESA 1ère année » vers « 2ème année Prépa »."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Étudiants sélectionnés" value={selected.size} hint={students.length > 0 ? `sur ${students.length} dans la classe` : 'Choisir une classe source'} icon={UserCheck} />
        <MetricCard label="Classe source" value={sourceClass?.name ?? '—'} hint={sourceClass ? `Année ${sourceClass.year}` : 'Non sélectionnée'} icon={ArrowRight} />
        <MetricCard label="Transferts (session)" value={log.length} hint="Effectués maintenant" icon={ArrowRight} />
      </section>

      {/* Session log */}
      {log.length > 0 && (
        <section className="surface-card space-y-3">
          <h2 className="panel-title px-1">Transferts effectués</h2>
          <div className="divide-y divide-slate-100">
            {log.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-1 flex-wrap text-sm">
                <span className="status-chip status-chip--ok">{entry.count} étudiant(s)</span>
                <span className="font-medium text-slate-700">{entry.from}</span>
                <ArrowRight size={14} className="text-slate-400" />
                <span className="font-medium text-slate-700">{entry.to}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Step 1: Source class */}
        <section className="surface-card space-y-4">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">1 — Classe source</h2>
              <p className="panel-copy">Choisissez la classe d&apos;où proviennent les étudiants.</p>
            </div>
          </div>
          <div className="field-stack">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9 text-sm mb-2"
                placeholder="Filtrer les classes…"
                value={sourceSearch}
                onChange={(e) => setSourceSearch(e.target.value)}
              />
            </div>
            {loadingClasses ? (
              <div className="empty-note text-sm">Chargement…</div>
            ) : (
              <select
                className="input"
                value={sourceId}
                onChange={(e) => { setSourceId(e.target.value); setTargetId(''); }}
                size={8}
              >
                <option value="">— Sélectionner une classe —</option>
                {sourceCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.year}){c.filiere ? ` · ${c.filiere.name}` : ''}
                  </option>
                ))}
              </select>
            )}
            {sourceClass && (
              <p className="text-xs text-slate-500 mt-1">
                Classe sélectionnée : <strong>{sourceClass.name} ({sourceClass.year})</strong> · {students.length} étudiant(s)
              </p>
            )}
          </div>
        </section>

        {/* Step 3: Target class */}
        <section className="surface-card space-y-4">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">3 — Classe cible</h2>
              <p className="panel-copy">Classe de destination et année académique.</p>
            </div>
          </div>
          <div className="field-stack">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9 text-sm mb-2"
                placeholder="Filtrer les classes…"
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
              />
            </div>
            <select
              className="input"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              disabled={!sourceId}
              size={6}
            >
              <option value="">— Sélectionner une classe cible —</option>
              {targetCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.year}){c.filiere ? ` · ${c.filiere.name}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Année académique <span className="text-red-500">*</span></label>
            <input
              className="input"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="ex. 2026/2027"
            />
          </div>
          {targetClass && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
              <p className="font-medium text-emerald-800">{targetClass.name} ({targetClass.year})</p>
              <p className="text-emerald-600 text-xs mt-0.5">{targetClass.filiere?.name ?? 'Aucune filière'}</p>
            </div>
          )}
        </section>
      </div>

      {/* Step 2: Students */}
      {sourceId && (
        <section className="surface-card space-y-5">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">2 — Étudiants à transférer</h2>
              <p className="panel-copy">Cochez les étudiants à déplacer vers la classe cible.</p>
            </div>
            <div className="flex items-center gap-3">
              {selected.size > 0 && (
                <span className="status-chip status-chip--ok">{selected.size} sélectionné(s)</span>
              )}
              <button
                className="btn-primary"
                type="button"
                disabled={!canConfirm}
                onClick={() => setModalOpen(true)}
              >
                Transférer {selected.size > 0 ? `(${selected.size})` : ''} →
              </button>
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9 text-sm max-w-sm"
              placeholder="Rechercher étudiant…"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </div>

          {loadingStudents ? (
            <div className="empty-note">Chargement des étudiants…</div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState title="Aucun étudiant" description="Cette classe ne contient aucun étudiant correspondant." />
          ) : (
            <div className="data-table-wrap">
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selected.size === filteredStudents.length && filteredStudents.length > 0}
                          onChange={toggleAll}
                          className="accent-emerald-600"
                        />
                      </th>
                      <th>Nom complet</th>
                      <th>Code Massar</th>
                      <th>Année académique</th>
                      <th>Filière</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => (
                      <tr
                        key={s.id}
                        className={selected.has(s.id) ? 'bg-emerald-50' : ''}
                        onClick={() => toggleStudent(s.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(s.id)}
                            onChange={() => toggleStudent(s.id)}
                            className="accent-emerald-600"
                          />
                        </td>
                        <td className="font-medium text-slate-900">{s.fullName}</td>
                        <td className="font-mono text-xs">{s.codeMassar}</td>
                        <td>{s.anneeAcademique ?? '—'}</td>
                        <td>{s.filiere?.name ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Confirm modal */}
      <ModalShell
        open={modalOpen}
        title="Confirmer le transfert"
        description="Cette action déplacera les étudiants sélectionnés vers la classe cible."
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onTransfer} disabled={transferring}>
              {transferring ? 'Transfert en cours…' : `Transférer ${selected.size} étudiant(s)`}
            </button>
            <button className="btn-outline" type="button" onClick={() => setModalOpen(false)}>Annuler</button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <div className="flex items-center gap-4">
            <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Source</p>
              <p className="font-medium text-slate-800">{sourceClass?.name} ({sourceClass?.year})</p>
            </div>
            <ArrowRight size={20} className="text-slate-400 shrink-0" />
            <div className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 mb-1">Cible</p>
              <p className="font-medium text-emerald-800">{targetClass?.name} ({targetClass?.year})</p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
            <p className="text-slate-600"><strong>{selected.size}</strong> étudiant(s) seront transférés</p>
            <p className="text-slate-600">Année académique : <strong>{academicYear}</strong></p>
          </div>
          <p className="text-xs text-slate-500">
            Les étudiants transférés seront affectés à la nouvelle classe et leur historique sera mis à jour.
          </p>
        </div>
      </ModalShell>
    </div>
  );
}
