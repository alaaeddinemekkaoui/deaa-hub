'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, GraduationCap, Plus, Users, X } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Department = { id: number; name: string };
type Filiere = { id: number; name: string; departmentId: number };
type AcademicOption = { id: number; name: string; filiereId: number };
type AcademicClass = { id: number; name: string; year: number; filiereId?: number | null; optionId?: number | null };
type Teacher = { id: number; firstName: string; lastName: string };

type CoursAssignment = {
  id: number;
  coursId: number;
  classId: number;
  teacherId: number | null;
  cours: { id: number; name: string };
  teacher: { id: number; firstName: string; lastName: string } | null;
};

type CoursForClass = {
  id: number;
  name: string;
  type: string;
  volumeHoraire?: number | null;
  totalClasses: number;
  teachers: { assignmentId: number; teacher: { id: number; firstName: string; lastName: string } }[];
  hasUnassigned: boolean; // true if there's a row with teacherId=null
};

type ManualCours = { id: number; name: string; _count: { classes: number } };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoursPage() {
  // ── Cascade class selector ──
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [options, setOptions] = useState<AcademicOption[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterFiliereId, setFilterFiliereId] = useState('');
  const [filterOptionId, setFilterOptionId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loadingMeta, setLoadingMeta] = useState(true);

  // ── Cours for selected class ──
  const [assignments, setAssignments] = useState<CoursAssignment[]>([]);
  const [loadingCours, setLoadingCours] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Teacher assignment inline ──
  const [assigningCoursId, setAssigningCoursId] = useState<number | null>(null);
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  // ── Manual cours creation modal ──
  const [manualModal, setManualModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualType, setManualType] = useState<'CM' | 'TD' | 'TP'>('CM');
  const [manualTeacherIds, setManualTeacherIds] = useState<string[]>([]);
  const [savingManual, setSavingManual] = useState(false);
  const [allCours, setAllCours] = useState<ManualCours[]>([]);

  // ─── Load meta (departments, filieres, etc.) once ───
  useEffect(() => {
    const load = async () => {
      try {
        const [deptRes, fRes, oRes, cRes, tRes] = await Promise.all([
          api.get<PaginatedResponse<Department>>('/departments', { params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<Filiere>>('/filieres', { params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<AcademicOption>>('/options', { params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<AcademicClass>>('/classes', { params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<Teacher>>('/teachers', { params: { page: 1, limit: 200, sortBy: 'lastName', sortOrder: 'asc' } }),
        ]);
        setDepartments(deptRes.data.data);
        setFilieres(fRes.data.data);
        setOptions(oRes.data.data);
        setClasses(cRes.data.data);
        setTeachers(tRes.data.data);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les données'));
      } finally {
        setLoadingMeta(false);
      }
    };
    void load();
  }, []);

  // ─── Load cours for selected class ───
  useEffect(() => {
    if (!selectedClassId) { setAssignments([]); return; }
    const load = async () => {
      setLoadingCours(true);
      try {
        const res = await api.get<CoursAssignment[]>(`/classes/${selectedClassId}/cours`);
        setAssignments(res.data);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les cours'));
      } finally {
        setLoadingCours(false);
      }
    };
    void load();
  }, [selectedClassId, refreshKey]);

  // ─── Cascade resets ───
  const handleDeptChange = (v: string) => { setFilterDeptId(v); setFilterFiliereId(''); setFilterOptionId(''); setSelectedClassId(''); };
  const handleFiliereChange = (v: string) => { setFilterFiliereId(v); setFilterOptionId(''); setSelectedClassId(''); };
  const handleOptionChange = (v: string) => { setFilterOptionId(v); setSelectedClassId(''); };

  // ─── Computed cascade lists ───
  const filteredFilieres = useMemo(
    () => filterDeptId ? filieres.filter((f) => String(f.departmentId) === filterDeptId) : filieres,
    [filterDeptId, filieres],
  );
  const filteredOptions = useMemo(
    () => filterFiliereId ? options.filter((o) => String(o.filiereId) === filterFiliereId) : [],
    [filterFiliereId, options],
  );
  const filteredClasses = useMemo(() => {
    let list = classes;
    if (filterFiliereId) list = list.filter((c) => String(c.filiereId) === filterFiliereId);
    if (filterOptionId) list = list.filter((c) => String(c.optionId) === filterOptionId);
    return list;
  }, [filterFiliereId, filterOptionId, classes]);

  // ─── Group assignments by coursId ───
  const groupedCours = useMemo<CoursForClass[]>(() => {
    const map = new Map<number, CoursForClass>();
    for (const a of assignments) {
      if (!map.has(a.coursId)) {
        map.set(a.coursId, {
          id: a.coursId,
          name: a.cours.name,
          type: 'CM',
          volumeHoraire: null,
          totalClasses: 0,
          teachers: [],
          hasUnassigned: false,
        });
      }
      const entry = map.get(a.coursId)!;
      if (a.teacher) {
        entry.teachers.push({ assignmentId: a.id, teacher: a.teacher });
      } else {
        entry.hasUnassigned = true;
      }
    }
    return Array.from(map.values());
  }, [assignments]);

  const selectedClass = useMemo(() => classes.find((c) => String(c.id) === selectedClassId), [classes, selectedClassId]);

  // ─── Teacher assignment ───
  const openAssignTeacher = (coursId: number) => {
    setAssigningCoursId(coursId);
    setAssignTeacherId('');
  };

  const saveTeacherAssign = async () => {
    if (!assignTeacherId || !selectedClassId || !assigningCoursId) return;
    setSavingAssign(true);
    try {
      await api.post(`/cours/${assigningCoursId}/classes`, {
        classId: Number(selectedClassId),
        teacherIds: [Number(assignTeacherId)],
      });
      toast.success('Enseignant affecté');
      setAssigningCoursId(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'affectation"));
    } finally {
      setSavingAssign(false);
    }
  };

  const removeTeacher = async (coursId: number, teacherId: number) => {
    if (!selectedClassId) return;
    if (!window.confirm('Retirer cet enseignant de ce cours ?')) return;
    try {
      await api.delete(`/cours/${coursId}/classes/${selectedClassId}`, { params: { teacherId } });
      toast.success('Enseignant retiré');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la suppression'));
    }
  };

  const removeCours = async (coursId: number) => {
    if (!selectedClassId) return;
    if (!window.confirm('Retirer ce cours de la classe ?')) return;
    try {
      await api.delete(`/cours/${coursId}/classes/${selectedClassId}`);
      toast.success('Cours retiré de la classe');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec'));
    }
  };

  // ─── Manual cours creation ───
  const openManualModal = async () => {
    setManualName(''); setManualType('CM'); setManualTeacherIds([]);
    try {
      const res = await api.get<PaginatedResponse<ManualCours>>('/cours', { params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' } });
      setAllCours(res.data.data);
    } catch {
      setAllCours([]);
    }
    setManualModal(true);
  };

  const saveManual = async () => {
    if (!manualName.trim() || !selectedClassId) return;
    setSavingManual(true);
    try {
      const created = await api.post<{ id: number }>('/cours', { name: manualName.trim(), type: manualType });
      await api.post(`/cours/${created.data.id}/classes`, {
        classId: Number(selectedClassId),
        teacherIds: manualTeacherIds.length ? manualTeacherIds.map(Number) : undefined,
      });
      toast.success('Cours ajouté');
      setManualModal(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de la création du cours"));
    } finally {
      setSavingManual(false);
    }
  };

  // ─── Metrics ───
  const totalTeacherAssignments = useMemo(
    () => groupedCours.reduce((s, c) => s + c.teachers.length, 0),
    [groupedCours],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Emploi du temps"
        title="Cours par classe"
        description="Sélectionnez une classe pour consulter ses cours et affecter des enseignants. Les cours sont générés automatiquement depuis les modules."
      />

      {/* ── Class selector ── */}
      <section className="surface-card space-y-4">
        <div>
          <h2 className="panel-title">Sélectionner une classe</h2>
          <p className="panel-copy">Filtrez par département et filière pour trouver rapidement une classe.</p>
        </div>
        {loadingMeta ? (
          <p className="text-sm text-slate-400">Chargement...</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="field-stack">
              <label className="field-label">Département</label>
              <select className="input" value={filterDeptId} onChange={(e) => handleDeptChange(e.target.value)}>
                <option value="">Tous les départements</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="field-stack">
              <label className="field-label">Filière</label>
              <select className="input" value={filterFiliereId} onChange={(e) => handleFiliereChange(e.target.value)} disabled={filteredFilieres.length === 0}>
                <option value="">Toutes les filières</option>
                {filteredFilieres.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="field-stack">
              <label className="field-label">Option</label>
              <select className="input" value={filterOptionId} onChange={(e) => handleOptionChange(e.target.value)} disabled={!filterFiliereId}>
                <option value="">Toutes les options</option>
                {filteredOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div className="field-stack">
              <label className="field-label">Classe <span className="text-red-500">*</span></label>
              <select className="input" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} disabled={!filterFiliereId || filteredClasses.length === 0}>
                <option value="">Sélectionner une classe</option>
                {filteredClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* ── No class selected ── */}
      {!selectedClassId ? (
        <section className="surface-card">
          <EmptyState
            title="Aucune classe sélectionnée"
            description="Sélectionnez un département, une filière puis une classe pour consulter ses cours."
          />
        </section>
      ) : (
        <>
          {/* ── Metrics ── */}
          <section className="grid gap-4 md:grid-cols-3">
            <div className="surface-card flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                <BookOpen size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Cours</p>
                <p className="text-2xl font-semibold text-slate-900">{groupedCours.length}</p>
              </div>
            </div>
            <div className="surface-card flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                <Users size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Enseignants affectés</p>
                <p className="text-2xl font-semibold text-slate-900">{totalTeacherAssignments}</p>
              </div>
            </div>
            <div className="surface-card flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                <GraduationCap size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Sans enseignant</p>
                <p className="text-2xl font-semibold text-slate-900">{groupedCours.filter((c) => c.teachers.length === 0).length}</p>
              </div>
            </div>
          </section>

          {/* ── Cours table ── */}
          <section className="surface-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="panel-title">
                  Cours de <span className="text-emerald-600">{selectedClass?.name}</span>
                </h2>
                <p className="panel-copy">Affectez des enseignants à chaque cours. Les cours sans enseignant sont signalés.</p>
              </div>
              <button className="btn-primary" type="button" onClick={openManualModal}>
                <Plus size={14} className="mr-1 inline" />Ajouter manuellement
              </button>
            </div>

            {loadingCours ? (
              <div className="empty-note">Chargement des cours...</div>
            ) : groupedCours.length === 0 ? (
              <EmptyState
                title="Aucun cours pour cette classe"
                description="Les cours sont générés automatiquement depuis les modules affectés à cette classe."
              />
            ) : (
              <div className="data-table-wrap">
                <div className="table-scroll">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Cours</th>
                        <th>Enseignants</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedCours.map((cours) => (
                        <tr key={cours.id}>
                          <td>
                            <p className="font-medium text-slate-900">{cours.name}</p>
                            {cours.teachers.length === 0 && (
                              <span className="mt-0.5 inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                                Sans enseignant
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {cours.teachers.map(({ assignmentId, teacher }) => (
                                <span
                                  key={assignmentId}
                                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                                >
                                  {teacher.firstName} {teacher.lastName}
                                  <button
                                    type="button"
                                    className="rounded-full hover:bg-slate-200"
                                    onClick={() => removeTeacher(cours.id, teacher.id)}
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                              {/* Inline teacher picker */}
                              {assigningCoursId === cours.id ? (
                                <div className="flex items-center gap-1">
                                  <select
                                    className="input text-xs py-1 px-2 h-7"
                                    value={assignTeacherId}
                                    onChange={(e) => setAssignTeacherId(e.target.value)}
                                    autoFocus
                                  >
                                    <option value="">Choisir...</option>
                                    {teachers
                                      .filter((t) => !cours.teachers.some((ct) => ct.teacher.id === t.id))
                                      .map((t) => (
                                        <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                                      ))}
                                  </select>
                                  <button
                                    type="button"
                                    className="btn-primary text-xs py-1 px-2 h-7"
                                    onClick={saveTeacherAssign}
                                    disabled={!assignTeacherId || savingAssign}
                                  >
                                    OK
                                  </button>
                                  <button type="button" className="btn-outline text-xs py-1 px-2 h-7" onClick={() => setAssigningCoursId(null)}>✕</button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:text-emerald-600"
                                  onClick={() => openAssignTeacher(cours.id)}
                                  title="Affecter un enseignant"
                                >
                                  <Plus size={11} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn-outline text-xs"
                              onClick={() => removeCours(cours.id)}
                            >
                              Retirer
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* ── Manual cours modal ── */}
      <ModalShell
        open={manualModal}
        title="Ajouter un cours manuellement"
        description={`Ce cours sera affecté à ${selectedClass?.name ?? 'la classe sélectionnée'}.`}
        onClose={() => setManualModal(false)}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={saveManual} disabled={savingManual || !manualName.trim()}>
              Créer et affecter
            </button>
            <button className="btn-outline" type="button" onClick={() => setManualModal(false)}>Annuler</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="field-stack col-span-2">
              <label className="field-label">Nom du cours <span className="text-red-500">*</span></label>
              <input
                className="input"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="ex. Droit du travail, Communication orale"
              />
            </div>
            <div className="field-stack col-span-2">
              <label className="field-label">Type</label>
              <select className="input" value={manualType} onChange={(e) => setManualType(e.target.value as 'CM' | 'TD' | 'TP')}>
                <option value="CM">CM — Cours Magistral</option>
                <option value="TD">TD — Travaux Dirigés</option>
                <option value="TP">TP — Travaux Pratiques</option>
              </select>
            </div>
          </div>

          <div className="field-stack">
            <label className="field-label">Enseignant(s) (optionnel)</label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
              {teachers.map((t) => {
                const id = String(t.id);
                return (
                  <label key={t.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={manualTeacherIds.includes(id)}
                      onChange={() => setManualTeacherIds((prev) =>
                        prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
                      )}
                    />
                    <span>{t.firstName} {t.lastName}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {allCours.length > 0 && (
            <p className="text-xs text-slate-400">
              {allCours.length} cours déjà dans le catalogue. Utilisez un nom différent pour créer un cours distinct.
            </p>
          )}
        </div>
      </ModalShell>
    </div>
  );
}
