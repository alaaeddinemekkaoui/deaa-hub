'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Download, NotebookPen, RefreshCw, Search, X } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

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
type Teacher = { id: number; firstName: string; lastName: string };
type ElementModule = { id: number; name: string; type: string; volumeHoraire?: number | null };
type CoursAssignment = {
  cours: { id: number; name: string; type: string; elementModuleId?: number | null };
  teacher?: { id: number; firstName: string; lastName: string } | null;
  groupLabel?: string | null;
};
type Cours = {
  id: number;
  name: string;
  elementModuleId?: number | null;
  elementModule?: { id: number; name: string; type: string; volumeHoraire?: number | null } | null;
  _count: { classes: number };
};

const PAGE_SIZE = 10;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClassesCoursPage() {
  // Reference data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [options, setOptions] = useState<AcademicOption[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [elements, setElements] = useState<ElementModule[]>([]);

  // Selected class (filter)
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterFiliereId, setFilterFiliereId] = useState('');
  const [filterOptionId, setFilterOptionId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  // Cours list for selected class
  const [assignments, setAssignments] = useState<CoursAssignment[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // All cours (for manual add)
  const [allCours, setAllCours] = useState<Cours[]>([]);
  const [coursPage, setCoursPage] = useState(1);
  const [coursMeta, setCoursMeta] = useState({ total: 0, totalPages: 1, hasNextPage: false, hasPreviousPage: false });
  const [coursSearch, setCoursSearch] = useState('');
  const [coursQuery, setCoursQuery] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Create cours form
  const [newCoursName, setNewCoursName] = useState('');
  const [newCoursType, setNewCoursType] = useState<'CM' | 'TD' | 'TP'>('CM');
  const [newCoursGroupLabel, setNewCoursGroupLabel] = useState('');
  const [newCoursElementId, setNewCoursElementId] = useState('');
  const [newCoursClassId, setNewCoursClassId] = useState('');
  const [newCoursTeacherId, setNewCoursTeacherId] = useState('');
  const [savingCours, setSavingCours] = useState(false);

  // Assign cours form
  const [assignCoursId, setAssignCoursId] = useState('');
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assignGroupLabel, setAssignGroupLabel] = useState('');
  const [savingAssign, setSavingAssign] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);

  // Reference data load
  const [refLoading, setRefLoading] = useState(true);
  const [coursRefreshKey, setCoursRefreshKey] = useState(0);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const filteredFilieres = useMemo(() => {
    if (!filterDeptId) return filieres;
    return filieres.filter((f) => String(f.departmentId) === filterDeptId);
  }, [filterDeptId, filieres]);

  const filteredOptions = useMemo(() => {
    if (!filterFiliereId) return [];
    return options.filter((o) => String(o.filiereId) === filterFiliereId);
  }, [filterFiliereId, options]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      if (filterFiliereId && String(c.filiereId) !== filterFiliereId) return false;
      if (filterOptionId && String(c.optionId) !== filterOptionId) return false;
      return true;
    });
  }, [filterFiliereId, filterOptionId, classes]);

  const selectedClass = useMemo(
    () => classes.find((c) => String(c.id) === selectedClassId) ?? null,
    [classes, selectedClassId],
  );

  // ─── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        setRefLoading(true);
        const [dRes, fRes, oRes, cRes, tRes] = await Promise.all([
          api.get<PaginatedResponse<Department>>('/departments', { params: { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<Filiere>>('/filieres', { params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<AcademicOption>>('/options', { params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<AcademicClass>>('/classes', { params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<Teacher>>('/teachers', { params: { page: 1, limit: 500, sortBy: 'lastName', sortOrder: 'asc' } }),
        ]);
        setDepartments(dRes.data.data);
        setFilieres(fRes.data.data);
        setOptions(oRes.data.data);
        setClasses(cRes.data.data);
        setTeachers(tRes.data.data);
      } catch {
        toast.error('Impossible de charger les données de référence');
      } finally {
        setRefLoading(false);
      }
    };
    void load();
  }, []);

  // Load cours assignments when selected class changes
  useEffect(() => {
    if (!selectedClassId) {
      setAssignments([]);
      return;
    }
    const load = async () => {
      try {
        setAssignLoading(true);
        const res = await api.get<CoursAssignment[]>(`/classes/${selectedClassId}/cours`);
        setAssignments(Array.isArray(res.data) ? res.data : []);
      } catch {
        toast.error('Impossible de charger les cours de cette classe');
      } finally {
        setAssignLoading(false);
      }
    };
    void load();
  }, [selectedClassId, coursRefreshKey]);

  // Load all cours (paginated)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<PaginatedResponse<Cours>>('/cours', {
          params: { page: coursPage, limit: PAGE_SIZE, search: coursQuery || undefined },
        });
        setAllCours(res.data.data);
        setCoursMeta(res.data.meta);
      } catch {
        toast.error('Impossible de charger le catalogue de cours');
      }
    };
    void load();
  }, [coursPage, coursQuery, coursRefreshKey]);

  // Load elements for the selected class's filière (for the create form)
  useEffect(() => {
    if (!newCoursClassId) {
      setElements([]);
      return;
    }
    const cls = classes.find((c) => String(c.id) === newCoursClassId);
    if (!cls?.filiereId) {
      setElements([]);
      return;
    }
    const load = async () => {
      try {
        const res = await api.get<PaginatedResponse<ElementModule>>('/element-modules', {
          params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' },
        });
        setElements(res.data.data ?? []);
      } catch {
        setElements([]);
      }
    };
    void load();
  }, [newCoursClassId, classes]);

  // Cascade resets
  useEffect(() => { setFilterFiliereId(''); }, [filterDeptId]);
  useEffect(() => { setFilterOptionId(''); }, [filterFiliereId]);
  useEffect(() => { setSelectedClassId(''); }, [filterOptionId]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!selectedClassId) return;
    if (!window.confirm('Importer et créer les cours manquants depuis les éléments de module de cette classe ?')) return;
    try {
      setImporting(true);
      const res = await api.post<{ created: number; existing: number; total: number }>(
        `/cours/import-from-class/${selectedClassId}`,
      );
      const { created, existing, total } = res.data;
      toast.success(`Import terminé : ${created} créé(s), ${existing} déjà existant(s) sur ${total} éléments`);
      setCoursRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de l\'import'));
    } finally {
      setImporting(false);
    }
  };

  const handleCreateCours = async () => {
    if (!newCoursName.trim()) return;
    try {
      setSavingCours(true);
      await api.post('/cours', {
        name: newCoursName.trim(),
        type: newCoursType,
        elementModuleId: newCoursElementId ? Number(newCoursElementId) : null,
        classId: newCoursClassId ? Number(newCoursClassId) : null,
        teacherId: newCoursTeacherId ? Number(newCoursTeacherId) : null,
        groupLabel: (newCoursType === 'TD' || newCoursType === 'TP') && newCoursGroupLabel.trim() ? newCoursGroupLabel.trim() : null,
      });
      toast.success('Cours créé avec succès');
      setCreateModalOpen(false);
      setNewCoursName('');
      setNewCoursType('CM');
      setNewCoursGroupLabel('');
      setNewCoursElementId('');
      setNewCoursClassId(selectedClassId);
      setNewCoursTeacherId('');
      setCoursRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la création du cours'));
    } finally {
      setSavingCours(false);
    }
  };

  const handleAssignCours = async () => {
    if (!assignCoursId || !selectedClassId) return;
    try {
      setSavingAssign(true);
      await api.post(`/cours/${assignCoursId}/classes`, {
        classId: Number(selectedClassId),
        teacherId: assignTeacherId ? Number(assignTeacherId) : null,
        groupLabel: assignGroupLabel.trim() || null,
      });
      toast.success('Cours affecté avec succès');
      setAssignModalOpen(false);
      setAssignCoursId('');
      setAssignTeacherId('');
      setAssignGroupLabel('');
      setCoursRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de l\'affectation'));
    } finally {
      setSavingAssign(false);
    }
  };

  const handleUnassign = async (coursId: number) => {
    if (!selectedClassId) return;
    if (!window.confirm('Retirer ce cours de la classe ?')) return;
    try {
      await api.delete(`/cours/${coursId}/classes/${selectedClassId}`);
      toast.success('Cours retiré');
      setCoursRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec du retrait'));
    }
  };

  const openCreateModal = () => {
    setNewCoursName('');
    setNewCoursType('CM');
    setNewCoursGroupLabel('');
    setNewCoursElementId('');
    setNewCoursClassId(selectedClassId);
    setNewCoursTeacherId('');
    setCreateModalOpen(true);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Classes"
        title="Gestion des cours"
        description="Consultez et gérez les cours affectés à chaque classe. Importez automatiquement les éléments de module ou créez des cours manuellement."
      />

      {/* Class selector */}
      <section className="surface-card space-y-4">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Sélectionner une classe</h2>
            <p className="panel-copy">Filtrez par département → filière → option pour trouver la classe.</p>
          </div>
        </div>

        {refLoading ? (
          <div className="empty-note">Chargement...</div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <select
              className="input max-w-56"
              value={filterDeptId}
              onChange={(e) => setFilterDeptId(e.target.value)}
            >
              <option value="">Tous les départements ({departments.length})</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select
              className="input max-w-56"
              value={filterFiliereId}
              onChange={(e) => setFilterFiliereId(e.target.value)}
            >
              <option value="">Toutes les filières ({filteredFilieres.length})</option>
              {filteredFilieres.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <select
              className="input max-w-56"
              value={filterOptionId}
              onChange={(e) => setFilterOptionId(e.target.value)}
              disabled={filteredOptions.length === 0}
            >
              <option value="">Toutes les options ({filteredOptions.length})</option>
              {filteredOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <select
              className="input max-w-64"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">— Choisir une classe ({filteredClasses.length}) —</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (A{c.year})
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Cours assigned to selected class */}
      {selectedClassId && (
        <section className="surface-card space-y-4">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">
                Cours de {selectedClass?.name ?? '...'}
              </h2>
              <p className="panel-copy">
                {assignments.length} cours affecté{assignments.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-outline flex items-center gap-2"
                onClick={handleImport}
                disabled={importing}
              >
                <Download size={14} />
                {importing ? 'Import...' : 'Importer depuis éléments'}
              </button>
              <button
                type="button"
                className="btn-outline flex items-center gap-2"
                onClick={() => {
                  setAssignCoursId('');
                  setAssignTeacherId('');
                  setAssignModalOpen(true);
                }}
              >
                <BookOpen size={14} />
                Affecter un cours existant
              </button>
              <button
                type="button"
                className="btn-primary flex items-center gap-2"
                onClick={openCreateModal}
              >
                <NotebookPen size={14} />
                Créer un cours
              </button>
            </div>
          </div>

          {assignLoading ? (
            <div className="empty-note">Chargement des cours...</div>
          ) : assignments.length === 0 ? (
            <EmptyState
              title="Aucun cours affecté"
              description="Importez les éléments de module ou créez un cours manuellement pour commencer."
            />
          ) : (
            <div className="data-table-wrap">
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Cours</th>
                      <th>Type</th>
                      <th>Groupe</th>
                      <th>Professeur</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((a) => (
                      <tr key={a.cours.id}>
                        <td>
                          <p className="font-medium text-slate-950">{a.cours.name}</p>
                          {a.cours.elementModuleId && (
                            <p className="text-xs text-slate-400">Lié à un élément</p>
                          )}
                        </td>
                        <td>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                            a.cours.type === 'CM' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            a.cours.type === 'TD' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>{a.cours.type}</span>
                        </td>
                        <td>{a.groupLabel ?? <span className="text-slate-400">—</span>}</td>
                        <td>
                          {a.teacher
                            ? `${a.teacher.firstName} ${a.teacher.lastName}`
                            : <span className="status-chip status-chip--warn">Non assigné</span>}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => handleUnassign(a.cours.id)}
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
      )}

      {/* All cours catalogue */}
      <section className="surface-card space-y-4">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Catalogue des cours</h2>
            <p className="panel-copy">Tous les cours disponibles dans le système.</p>
          </div>
        </div>

        <div className="toolbar-shell">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10"
                placeholder="Rechercher un cours..."
                value={coursSearch}
                onChange={(e) => setCoursSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { setCoursPage(1); setCoursQuery(coursSearch.trim()); } }}
              />
            </div>
            <button
              className="btn-outline"
              type="button"
              onClick={() => { setCoursPage(1); setCoursQuery(coursSearch.trim()); }}
            >
              Rechercher
            </button>
            {coursQuery && (
              <button
                className="btn-outline"
                type="button"
                onClick={() => { setCoursSearch(''); setCoursQuery(''); setCoursPage(1); }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {allCours.length === 0 ? (
          <EmptyState title="Aucun cours trouvé" description="Créez votre premier cours." />
        ) : (
          <>
            <div className="data-table-wrap">
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Élément lié</th>
                      <th>Nb classes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCours.map((c) => (
                      <tr key={c.id}>
                        <td className="font-medium text-slate-950">{c.name}</td>
                        <td>
                          {c.elementModule ? (
                            <span className="status-chip status-chip--ok">
                              {c.elementModule.name} ({c.elementModule.type})
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td>{c._count.classes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <PaginationControls
              page={coursMeta.hasNextPage || coursMeta.hasPreviousPage ? coursPage : 1}
              totalPages={coursMeta.totalPages}
              total={coursMeta.total}
              onPageChange={setCoursPage}
            />
          </>
        )}
      </section>

      {/* Create Cours Modal */}
      <ModalShell
        open={createModalOpen}
        title="Créer un cours"
        description="Créez un cours manuellement. Vous pouvez le lier à un élément de module et l'affecter directement à une classe."
        onClose={() => setCreateModalOpen(false)}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={handleCreateCours} disabled={savingCours || !newCoursName.trim()}>
              {savingCours ? 'Création...' : 'Créer le cours'}
            </button>
            <button className="btn-outline" type="button" onClick={() => setCreateModalOpen(false)}>
              Annuler
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="field-stack">
            <label className="field-label">Nom du cours <span className="text-red-500">*</span></label>
            <input
              className="input"
              value={newCoursName}
              onChange={(e) => setNewCoursName(e.target.value)}
              placeholder="ex. Algèbre linéaire"
            />
          </div>

          <div className="field-stack">
            <label className="field-label">Type</label>
            <div className="flex gap-2">
              {(['CM', 'TD', 'TP'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setNewCoursType(t); if (t === 'CM') setNewCoursGroupLabel(''); }}
                  className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    newCoursType === t
                      ? t === 'CM' ? 'bg-blue-600 border-blue-600 text-white'
                        : t === 'TD' ? 'bg-violet-600 border-violet-600 text-white'
                        : 'bg-amber-500 border-amber-500 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>

          {(newCoursType === 'TD' || newCoursType === 'TP') && (
            <div className="field-stack">
              <label className="field-label">Libellé du groupe</label>
              <input
                className="input"
                value={newCoursGroupLabel}
                onChange={(e) => setNewCoursGroupLabel(e.target.value)}
                placeholder={`ex. Groupe ${newCoursType} 1`}
                maxLength={80}
              />
            </div>
          )}

          <div className="field-stack">
            <label className="field-label">Classe (affectation directe)</label>
            <select
              className="input"
              value={newCoursClassId}
              onChange={(e) => setNewCoursClassId(e.target.value)}
            >
              <option value="">— Aucune —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (A{c.year})
                </option>
              ))}
            </select>
          </div>

          <div className="field-stack">
            <label className="field-label">Élément de module lié</label>
            <select
              className="input"
              value={newCoursElementId}
              onChange={(e) => {
                setNewCoursElementId(e.target.value);
                if (e.target.value) {
                  const el = elements.find((x) => String(x.id) === e.target.value);
                  if (el && !newCoursName.trim()) setNewCoursName(el.name);
                }
              }}
              disabled={!newCoursClassId || elements.length === 0}
            >
              <option value="">
                {!newCoursClassId ? 'Sélectionner une classe d\'abord' : elements.length === 0 ? 'Aucun élément disponible' : '— Aucun —'}
              </option>
              {elements.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.name} ({el.type}{el.volumeHoraire ? ` · ${el.volumeHoraire}h` : ''})
                </option>
              ))}
            </select>
          </div>

          <div className="field-stack">
            <label className="field-label">Professeur</label>
            <select
              className="input"
              value={newCoursTeacherId}
              onChange={(e) => setNewCoursTeacherId(e.target.value)}
              disabled={!newCoursClassId}
            >
              <option value="">— Aucun —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ModalShell>

      {/* Assign existing Cours Modal */}
      <ModalShell
        open={assignModalOpen}
        title="Affecter un cours existant"
        description={`Affecter un cours du catalogue à ${selectedClass?.name ?? 'cette classe'}.`}
        onClose={() => setAssignModalOpen(false)}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={handleAssignCours} disabled={savingAssign || !assignCoursId}>
              {savingAssign ? 'Affectation...' : 'Affecter'}
            </button>
            <button className="btn-outline" type="button" onClick={() => setAssignModalOpen(false)}>
              Annuler
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="field-stack">
            <label className="field-label">Cours <span className="text-red-500">*</span></label>
            <select
              className="input"
              value={assignCoursId}
              onChange={(e) => setAssignCoursId(e.target.value)}
            >
              <option value="">— Sélectionner un cours —</option>
              {allCours.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Professeur</label>
            <select
              className="input"
              value={assignTeacherId}
              onChange={(e) => setAssignTeacherId(e.target.value)}
            >
              <option value="">— Aucun —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Libellé du groupe</label>
            <input
              className="input"
              value={assignGroupLabel}
              onChange={(e) => setAssignGroupLabel(e.target.value)}
              placeholder="ex. Groupe TD 1 (optionnel)"
              maxLength={80}
            />
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
