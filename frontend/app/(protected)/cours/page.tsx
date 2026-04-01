'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, GraduationCap, Search, Users } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Cours = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count: { classes: number };
};

type Department = { id: number; name: string };
type Filiere = { id: number; name: string; departmentId: number };
type AcademicOption = { id: number; name: string; filiereId: number };
type AcademicClass = {
  id: number;
  name: string;
  year: number;
  cycle?: string | null;
  optionId?: number | null;
  filiereId?: number | null;
};
type Teacher = { id: number; firstName: string; lastName: string };

type ClassCoursAssignment = {
  id: number;
  classId: number;
  coursId: number;
  teacherId: number | null;
  cours: { id: number; name: string };
  teacher: { id: number; firstName: string; lastName: string } | null;
};

const PAGE_SIZE = 8;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoursPage() {
  const [rows, setRows] = useState<Cours[]>([]);
  const [allCours, setAllCours] = useState<Cours[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1,
    hasNextPage: false, hasPreviousPage: false,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Cours create/edit modal ──
  const [isCoursModalOpen, setIsCoursModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [coursName, setCoursName] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Assign modal (class-centric) ──
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [options, setOptions] = useState<AcademicOption[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterFiliereId, setFilterFiliereId] = useState('');
  const [filterOptionId, setFilterOptionId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const [classAssignments, setClassAssignments] = useState<ClassCoursAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const [addCoursId, setAddCoursId] = useState('');
  const [addTeacherId, setAddTeacherId] = useState('');
  const [addingCours, setAddingCours] = useState(false);

  // ── Metrics ──
  const totalAssignments = useMemo(
    () => rows.reduce((sum, c) => sum + c._count.classes, 0),
    [rows],
  );

  // ── Load cours list ──
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get<PaginatedResponse<Cours>>('/cours', {
          params: { page, limit: PAGE_SIZE, search: query || undefined, sortBy: 'name', sortOrder: 'asc' },
        });
        setRows(res.data.data);
        setMeta(res.data.meta);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Impossible de charger les cours.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [page, query, refreshKey]);

  // ── Cascading filter helpers ──
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

  // Reset downstream when dept changes
  useEffect(() => {
    setFilterFiliereId('');
    setFilterOptionId('');
    setSelectedClassId('');
    setClassAssignments([]);
  }, [filterDeptId]);

  // Reset option + class when filiere changes
  useEffect(() => {
    setFilterOptionId('');
    setSelectedClassId('');
    setClassAssignments([]);
  }, [filterFiliereId]);

  // Reset class when option changes
  useEffect(() => {
    setSelectedClassId('');
    setClassAssignments([]);
  }, [filterOptionId]);

  // Load assignments when class is selected
  useEffect(() => {
    if (!selectedClassId) {
      setClassAssignments([]);
      return;
    }
    const load = async () => {
      setLoadingAssignments(true);
      try {
        const res = await api.get<ClassCoursAssignment[]>(`/classes/${selectedClassId}/cours`);
        setClassAssignments(res.data);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les cours de cette classe'));
      } finally {
        setLoadingAssignments(false);
      }
    };
    void load();
  }, [selectedClassId]);

  // Cours not yet assigned to selected class
  const unassignedCours = useMemo(() => {
    const assignedIds = new Set(classAssignments.map((a) => a.coursId));
    return allCours.filter((c) => !assignedIds.has(c.id));
  }, [allCours, classAssignments]);

  // ── Open assign modal ──
  const openAssignModal = async () => {
    try {
      const [deptRes, filiereRes, optRes, classRes, teacherRes, allCoursRes] = await Promise.all([
        api.get<PaginatedResponse<Department>>('/departments', { params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' } }),
        api.get<PaginatedResponse<Filiere>>('/filieres', { params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' } }),
        api.get<PaginatedResponse<AcademicOption>>('/options', { params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' } }),
        api.get<PaginatedResponse<AcademicClass>>('/classes', { params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' } }),
        api.get<PaginatedResponse<Teacher>>('/teachers', { params: { page: 1, limit: 200, sortBy: 'lastName', sortOrder: 'asc' } }),
        api.get<PaginatedResponse<Cours>>('/cours', { params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' } }),
      ]);
      setDepartments(deptRes.data.data);
      setFilieres(filiereRes.data.data);
      setOptions(optRes.data.data);
      setClasses(classRes.data.data);
      setTeachers(teacherRes.data.data);
      setAllCours(allCoursRes.data.data);
      setFilterDeptId('');
      setFilterFiliereId('');
      setFilterOptionId('');
      setSelectedClassId('');
      setClassAssignments([]);
      setAddCoursId('');
      setAddTeacherId('');
      setIsAssignModalOpen(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de charger les données'));
    }
  };

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setRefreshKey((k) => k + 1);
  };

  // ── Add a cours to the selected class ──
  const onAddCours = async () => {
    if (!selectedClassId || !addCoursId) return;
    setAddingCours(true);
    try {
      await api.post(`/cours/${addCoursId}/classes`, {
        classId: Number(selectedClassId),
        teacherId: addTeacherId ? Number(addTeacherId) : null,
      });
      toast.success('Cours ajouté à la classe');
      // Refresh assignments for this class
      const res = await api.get<ClassCoursAssignment[]>(`/classes/${selectedClassId}/cours`);
      setClassAssignments(res.data);
      setAddCoursId('');
      setAddTeacherId('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'ajout du cours"));
    } finally {
      setAddingCours(false);
    }
  };

  // ── Remove a cours from the selected class ──
  const onRemoveCours = async (coursId: number) => {
    if (!selectedClassId) return;
    if (!window.confirm('Retirer ce cours de la classe ?')) return;
    try {
      await api.delete(`/cours/${coursId}/classes/${selectedClassId}`);
      toast.success('Cours retiré');
      const res = await api.get<ClassCoursAssignment[]>(`/classes/${selectedClassId}/cours`);
      setClassAssignments(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la suppression'));
    }
  };

  // ── Cours CRUD ──
  const openCreateModal = () => { setEditingId(null); setCoursName(''); setIsCoursModalOpen(true); };
  const openEditModal = (c: Cours) => { setEditingId(c.id); setCoursName(c.name); setIsCoursModalOpen(true); };
  const closeCoursModal = () => { setIsCoursModalOpen(false); setEditingId(null); setCoursName(''); };

  const onSaveCours = async () => {
    if (!coursName.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/cours/${editingId}`, { name: coursName.trim() });
        toast.success('Cours mis à jour');
      } else {
        await api.post('/cours', { name: coursName.trim() });
        toast.success('Cours créé');
      }
      closeCoursModal();
      setPage(1);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'enregistrement du cours"));
    } finally {
      setSaving(false);
    }
  };

  const onDeleteCours = async (id: number) => {
    if (!window.confirm('Supprimer ce cours ? Toutes les affectations seront supprimées.')) return;
    try {
      await api.delete(`/cours/${id}`);
      toast.success('Cours supprimé');
      if (rows.length === 1 && page > 1) setPage(page - 1);
      else setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la suppression'));
    }
  };

  // ── Selected class label ──
  const selectedClass = useMemo(
    () => classes.find((c) => String(c.id) === selectedClassId),
    [classes, selectedClassId],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Emploi du temps"
        title="Gestion des cours"
        description="Créez des cours et affectez-les aux classes pour préparer les emplois du temps."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total des cours" value={meta.total} hint="Catalogue actuel" icon={BookOpen} />
        <MetricCard label="Affectations" value={totalAssignments} hint="Cours × classes (page)" icon={GraduationCap} />
        <MetricCard label="Cours utilisés" value={rows.filter((c) => c._count.classes > 0).length} hint="Avec au moins une classe" icon={Users} />
      </section>

      <section className="flex justify-end gap-2">
        <button className="btn-outline" type="button" onClick={openAssignModal}>
          Affecter des cours à une classe
        </button>
        <button className="btn-primary" type="button" onClick={openCreateModal}>
          Ajouter un cours
        </button>
      </section>

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Catalogue des cours</h2>
            <p className="panel-copy">Gérez le catalogue et les affectations aux classes.</p>
          </div>
        </div>

        <div className="toolbar-shell">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10"
                placeholder="Rechercher un cours..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button className="btn-outline" type="button" onClick={() => { setPage(1); setQuery(search.trim()); }}>Appliquer</button>
              <button className="btn-outline" type="button" onClick={() => { setSearch(''); setQuery(''); setPage(1); }}>Réinitialiser</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="empty-note">Chargement des cours...</div>
        ) : error ? (
          <div className="empty-note">{error}</div>
        ) : rows.length === 0 ? (
          <EmptyState title="Aucun cours trouvé" description="Créez un cours pour commencer à construire les emplois du temps." />
        ) : (
          <>
            <div className="data-table-wrap">
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Cours</th>
                      <th>Classes affectées</th>
                      <th>Mis à jour</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.id}>
                        <td><p className="font-medium text-slate-950">{item.name}</p></td>
                        <td>
                          <span className={`status-chip ${item._count.classes > 0 ? 'status-chip--ok' : 'status-chip--warn'}`}>
                            {item._count.classes} classe{item._count.classes !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td>{new Date(item.updatedAt).toLocaleString()}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn-outline" onClick={() => openEditModal(item)}>Modifier</button>
                            <button type="button" className="btn-outline" onClick={() => onDeleteCours(item.id)}>Supprimer</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <PaginationControls page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
          </>
        )}
      </section>

      {/* ── Create / Edit Cours modal ── */}
      <ModalShell
        open={isCoursModalOpen}
        title={editingId ? 'Modifier le cours' : 'Ajouter un cours'}
        description="Un cours peut être affecté à plusieurs classes avec des enseignants différents."
        onClose={closeCoursModal}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onSaveCours} disabled={saving}>
              {editingId ? 'Enregistrer' : 'Créer'}
            </button>
            <button className="btn-outline" type="button" onClick={closeCoursModal}>Annuler</button>
          </>
        }
      >
        <div className="form-grid md:grid-cols-1 xl:grid-cols-1">
          <div className="field-stack">
            <label className="field-label">Nom du cours</label>
            <input
              className="input"
              value={coursName}
              onChange={(e) => setCoursName(e.target.value)}
              placeholder="ex. Data Science, Mathématiques, Chimie"
            />
          </div>
        </div>
      </ModalShell>

      {/* ── Assign modal (class-centric) ── */}
      <ModalShell
        open={isAssignModalOpen}
        title="Affecter des cours à une classe"
        description="Sélectionnez un département, une filière puis une classe pour gérer ses cours."
        onClose={closeAssignModal}
        footer={
          <button className="btn-outline" type="button" onClick={closeAssignModal}>Fermer</button>
        }
      >
        <div className="space-y-5">
          {/* Step 1 — cascade selects */}
          <div className="space-y-3">
            <p className="field-label">1. Sélectionner la classe</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="field-stack">
                <label className="field-label">Département</label>
                <select className="input" value={filterDeptId} onChange={(e) => setFilterDeptId(e.target.value)}>
                  <option value="">Tous les départements</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Filière</label>
                <select
                  className="input"
                  value={filterFiliereId}
                  onChange={(e) => setFilterFiliereId(e.target.value)}
                  disabled={!filterDeptId || filteredFilieres.length === 0}
                >
                  <option value="">Toutes les filières</option>
                  {filteredFilieres.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Option / Spécialité</label>
                <select
                  className="input"
                  value={filterOptionId}
                  onChange={(e) => setFilterOptionId(e.target.value)}
                  disabled={!filterFiliereId}
                >
                  <option value="">Toutes les options</option>
                  {filteredOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Classe</label>
                <select
                  className="input"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  disabled={!filterFiliereId}
                >
                  <option value="">Sélectionner une classe</option>
                  {filteredClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Step 2 — once a class is selected */}
          {selectedClassId && (
            <>
              <div className="border-t border-slate-100" />

              {/* Existing cours for this class */}
              <div>
                <p className="field-label mb-2">
                  2. Cours affectés à{' '}
                  <span className="font-semibold text-slate-800">{selectedClass?.name}</span>
                </p>

                {loadingAssignments ? (
                  <p className="text-sm text-slate-500">Chargement...</p>
                ) : classAssignments.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Aucun cours affecté pour l'instant.</p>
                ) : (
                  <div className="space-y-2">
                    {classAssignments.map((a) => (
                      <div
                        key={a.coursId}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">{a.cours.name}</p>
                          {a.teacher && (
                            <p className="text-xs text-slate-500">
                              {a.teacher.firstName} {a.teacher.lastName}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn-outline text-xs"
                          onClick={() => onRemoveCours(a.coursId)}
                        >
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add more cours */}
              {unassignedCours.length > 0 ? (
                <div className="space-y-3 rounded-lg border border-slate-200 p-4">
                  <p className="field-label">Ajouter un cours</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="field-stack">
                      <label className="field-label">Cours</label>
                      <select className="input" value={addCoursId} onChange={(e) => setAddCoursId(e.target.value)}>
                        <option value="">Sélectionner un cours</option>
                        {unassignedCours.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field-stack">
                      <label className="field-label">Enseignant (optionnel)</label>
                      <select className="input" value={addTeacherId} onChange={(e) => setAddTeacherId(e.target.value)}>
                        <option value="">Aucun</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={onAddCours}
                    disabled={!addCoursId || addingCours}
                  >
                    {addingCours ? 'Ajout...' : 'Ajouter ce cours'}
                  </button>
                </div>
              ) : (
                !loadingAssignments && (
                  <p className="text-sm text-slate-500 italic">
                    Tous les cours du catalogue sont déjà affectés à cette classe.
                  </p>
                )
              )}
            </>
          )}
        </div>
      </ModalShell>
    </div>
  );
}
