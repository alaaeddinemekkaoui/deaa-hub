'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarRange, GraduationCap, Search, Users } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type AcademicClass = {
  id: number;
  name: string;
  year: number;
  classType?: string | null;
  cycleId?: number | null;
  optionId?: number | null;
  filiereId?: number | null;
  createdAt: string;
  updatedAt: string;
  filiere?: {
    id?: number;
    name: string;
    department?: { id: number; name: string };
  } | null;
  academicOption?: { id: number; name: string } | null;
  cycle?: { id: number; name: string; code?: string | null } | null;
  _count: {
    students: number;
    teachers: number;
    cours: number;
  };
};

type Filiere = { id: number; name: string; departmentId?: number };
type Department = { id: number; name: string };
type AcademicOption = { id: number; name: string; filiereId: number };
type Cycle = { id: number; name: string; code?: string | null };

const PAGE_SIZE = 8;

export default function ClassesPage() {
  const [rows, setRows] = useState<AcademicClass[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [options, setOptions] = useState<AcademicOption[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [name, setName] = useState('');
  const [year, setYear] = useState('1');
  const [classType, setClassType] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [optionId, setOptionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [filiereId, setFiliereId] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterFiliereId, setFilterFiliereId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'year' | 'name' | 'updatedAt'>('year');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const totalStudents = useMemo(
    () => rows.reduce((sum, item) => sum + item._count.students, 0),
    [rows],
  );
  const totalTeachers = useMemo(
    () => rows.reduce((sum, item) => sum + item._count.teachers, 0),
    [rows],
  );

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setYear('1');
    setClassType('');
    setCycleId('');
    setOptionId('');
    setDepartmentId('');
    setFiliereId('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const filieresByDepartment = useMemo(() => {
    if (!departmentId) return filieres;
    return filieres.filter((item) => String(item.departmentId ?? '') === departmentId);
  }, [departmentId, filieres]);

  const optionsByFiliere = useMemo(() => {
    if (!filiereId) return [];
    return options.filter((item) => String(item.filiereId) === filiereId);
  }, [filiereId, options]);

  const filterFilieresByDepartment = useMemo(() => {
    if (!filterDepartmentId) {
      return filieres;
    }

    return filieres.filter(
      (item) => String(item.departmentId ?? '') === filterDepartmentId,
    );
  }, [filterDepartmentId, filieres]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [classesResponse, filieresResponse, departmentsResponse, optionsResponse, cyclesResponse] =
          await Promise.all([
          api.get<PaginatedResponse<AcademicClass>>('/classes', {
            params: {
              page,
              limit: PAGE_SIZE,
              search: query || undefined,
              departmentId: filterDepartmentId || undefined,
              filiereId: filterFiliereId || undefined,
              sortBy,
              sortOrder,
            },
          }),
          api.get<PaginatedResponse<Filiere>>('/filieres', {
            params: { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' },
          }),
          api.get<PaginatedResponse<Department>>('/departments', {
            params: { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' },
          }),
          api.get<PaginatedResponse<AcademicOption>>('/options', {
            params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' },
          }),
          api.get<Cycle[]>('/cycles'),
        ]);

        setRows(classesResponse.data.data);
        setMeta(classesResponse.data.meta);
        setFilieres(filieresResponse.data.data);
        setDepartments(departmentsResponse.data.data);
        setOptions(optionsResponse.data.data);
        setCycles(Array.isArray(cyclesResponse.data) ? cyclesResponse.data : []);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Impossible de charger les classes maintenant.'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [
    filterDepartmentId,
    filterFiliereId,
    page,
    query,
    refreshKey,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    if (!departmentId) {
      return;
    }

    const hasSelectedFiliere = filieres.some(
      (item) =>
        String(item.id) === filiereId &&
        String(item.departmentId ?? '') === departmentId,
    );

    if (!hasSelectedFiliere) {
      setFiliereId('');
    }
  }, [departmentId, filiereId, filieres]);

  useEffect(() => {
    if (!filterDepartmentId) {
      return;
    }

    const hasSelectedFiliere = filieres.some(
      (item) =>
        String(item.id) === filterFiliereId &&
        String(item.departmentId ?? '') === filterDepartmentId,
    );

    if (!hasSelectedFiliere) {
      setFilterFiliereId('');
    }
  }, [filterDepartmentId, filterFiliereId, filieres]);

  // Reset optionId when filiereId changes in the form
  useEffect(() => {
    setOptionId('');
  }, [filiereId]);

  const onSubmit = async () => {
    if (!name.trim() || !year.trim()) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        year: Number(year),
        classType: classType.trim() || null,
        cycleId: cycleId ? Number(cycleId) : null,
        optionId: optionId ? Number(optionId) : null,
        filiereId: filiereId ? Number(filiereId) : null,
      };

      if (editingId) {
        await api.patch(`/classes/${editingId}`, payload);
        toast.success('Classe mise à jour avec succès');
      } else {
        await api.post('/classes', payload);
        toast.success('Classe créée avec succès');
      }

      closeModal();
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, 'Échec de l\'enregistrement de la classe'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette classe ?')) return;

    try {
      await api.delete(`/classes/${id}`);
      toast.success('Classe supprimée avec succès');
      if (editingId === id) {
        closeModal();
      }
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError, 'Échec de la suppression de la classe'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cohorts"
        title="Administration des classes"
        description="Organisez les cohortes académiques avec des filtres plus clairs, des vérifications de relations fiables et une meilleure surface opérationnelle pour la planification annuelle."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Total des classes"
          value={meta.total}
          hint="Registre des classes actuel"
          icon={CalendarRange}
        />
        <MetricCard
          label="Étudiants visibles"
          value={totalStudents}
          hint="Sur la page actuelle"
          icon={GraduationCap}
        />
        <MetricCard
          label="Enseignants visibles"
          value={totalTeachers}
          hint="Sur la page actuelle"
          icon={Users}
        />
        <MetricCard
          label="Filières disponibles"
          value={filieres.length}
          hint="Programmes qui peuvent posséder des classes"
          icon={BookOpen}
        />
      </section>

      <section className="flex justify-end gap-2">
        <ImportDataButton onSuccess={() => setRefreshKey((k) => k + 1)} />
        <ExportDataButton />
        <button className="btn-primary" type="button" onClick={openCreateModal}>
          Ajouter une classe
        </button>
      </section>

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Registre des classes</h2>
            <p className="panel-copy">
              Vérifiez la structure de la cohorte, la propriété du programme et la charge actuelle des étudiants et du personnel en un seul endroit.
            </p>
          </div>
        </div>

        <div className="toolbar-shell">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="input pl-10"
                  placeholder="Search by class name, type, or academic year..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="btn-outline"
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setQuery(search.trim());
                  }}
                >
                  Appliquer les filtres
                </button>
                <button
                  className="btn-outline"
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setQuery('');
                    setFilterDepartmentId('');
                    setFilterFiliereId('');
                    setSortBy('year');
                    setSortOrder('asc');
                    setPage(1);
                  }}
                >
                  Réinitialiser
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <select
                className="input xl:max-w-56"
                value={filterDepartmentId}
                onChange={(event) => setFilterDepartmentId(event.target.value)}
              >
                <option value="">Tous les départements</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <select
                className="input xl:max-w-56"
                value={filterFiliereId}
                onChange={(event) => setFilterFiliereId(event.target.value)}
              >
                <option value="">Toutes les filières</option>
                {filterFilieresByDepartment.map((filiere) => (
                  <option key={filiere.id} value={filiere.id}>
                    {filiere.name}
                  </option>
                ))}
              </select>
              <select
                className="input xl:max-w-52"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value as
                      | 'year'
                      | 'name'
                      | 'updatedAt',
                  )
                }
              >
                <option value="year">Trier par année</option>
                <option value="name">Trier par nom</option>
                <option value="updatedAt">Trier par date de mise à jour</option>
              </select>
              <select
                className="input xl:max-w-44"
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value as 'asc' | 'desc')
                }
              >
                <option value="asc">Croissant</option>
                <option value="desc">Décroissant</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="empty-note">Chargement des classes...</div>
        ) : error ? (
          <div className="empty-note">{error}</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Aucune classe ne correspond à la vue actuelle"
            description="Ajustez vos filtres ou créez une classe pour initialiser le registre des cohortes."
          />
        ) : (
          <>
            <div className="data-table-wrap">
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Classe</th>
                      <th>Filière</th>
                      <th>Département</th>
                      <th>Étudiants</th>
                      <th>Enseignants</th>
                      <th>Cours</th>
                      <th>État</th>
                      <th>Mis à jour</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <p className="font-medium text-slate-950">
                              {item.name}
                            </p>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              Année {item.year}
                              {item.classType ? ` • ${item.classType}` : ''}
                              {item.cycle ? ` • ${item.cycle.name}` : ''}
                              {item.academicOption ? ` • ${item.academicOption.name}` : ''}
                            </p>
                          </div>
                        </td>
                        <td>{item.filiere?.name ?? 'Non assignée'}</td>
                        <td>{item.filiere?.department?.name ?? '-'}</td>
                        <td>{item._count.students}</td>
                        <td>{item._count.teachers}</td>
                        <td>
                          <span className={`status-chip ${item._count.cours > 0 ? 'status-chip--ok' : 'status-chip--warn'}`}>
                            {item._count.cours}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-chip ${
                              item.filiere ? 'status-chip--ok' : 'status-chip--warn'
                            }`}
                          >
                            {item.filiere ? 'Assignée' : 'Nécessite une filière'}
                          </span>
                        </td>
                        <td>{new Date(item.updatedAt).toLocaleString()}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => {
                                setEditingId(item.id);
                                setName(item.name);
                                setYear(String(item.year));
                                setClassType(item.classType ?? '');
                                setCycleId(String(item.cycleId ?? ''));
                                setOptionId(String(item.optionId ?? ''));
                                setDepartmentId(
                                  String(item.filiere?.department?.id ?? ''),
                                );
                                setFiliereId(String(item.filiereId ?? ''));
                                setIsModalOpen(true);
                              }}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => onDelete(item.id)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <PaginationControls
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              onPageChange={setPage}
            />
          </>
        )}
      </section>

      <ModalShell
        open={isModalOpen}
        title={editingId ? 'Modifier la classe' : 'Ajouter une classe'}
        description="Maintenez des cohortes basées sur l'année avec assignation de filière optionnelle et une meilleure protection autour des étudiants et des enseignants liés."
        onClose={closeModal}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onSubmit} disabled={saving}>
              {editingId ? 'Enregistrer les modifications' : 'Créer une classe'}
            </button>
            <button className="btn-outline" type="button" onClick={closeModal}>
              Annuler
            </button>
          </>
        }
      >
        <div className="form-grid md:grid-cols-1 xl:grid-cols-1">
          <div className="field-stack">
            <label className="field-label">Nom de la classe</label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ex. APESA 1"
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Niveau d'année académique</label>
            <input
              className="input"
              type="number"
              min={1}
              max={2100}
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Type de classe</label>
            <input
              className="input"
              value={classType}
              onChange={(event) => setClassType(event.target.value)}
              placeholder="prépa / ingénieur"
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Cycle</label>
            <select
              className="input"
              value={cycleId}
              onChange={(event) => setCycleId(event.target.value)}
            >
              <option value="">— Aucun cycle —</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.code ? ` (${c.code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Option</label>
            <select
              className="input"
              value={optionId}
              onChange={(event) => setOptionId(event.target.value)}
              disabled={!filiereId}
            >
              <option value="">
                {filiereId ? 'Aucune option' : 'Sélectionner une filière d\'abord'}
              </option>
              {optionsByFiliere.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Département</label>
            <select
              className="input"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="">Tous les départements</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Filière</label>
            <select
              className="input"
              value={filiereId}
              onChange={(event) => setFiliereId(event.target.value)}
            >
              <option value="">Non assignée</option>
              {filieresByDepartment.map((filiere) => (
                <option key={filiere.id} value={filiere.id}>
                  {filiere.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
