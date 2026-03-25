'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Building2, GraduationCap, Search, Users } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type Filiere = {
  id: number;
  name: string;
  code: string;
  departmentId: number;
  createdAt: string;
  updatedAt: string;
  department?: { id: number; name: string };
  _count: {
    classes: number;
    students: number;
    teachers: number;
  };
};

type Department = { id: number; name: string };

const PAGE_SIZE = 8;

export default function FilieresPage() {
  const [rows, setRows] = useState<Filiere[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'updatedAt'>('name');
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

  const totalClasses = useMemo(
    () => rows.reduce((sum, item) => sum + item._count.classes, 0),
    [rows],
  );
  const totalStudents = useMemo(
    () => rows.reduce((sum, item) => sum + item._count.students, 0),
    [rows],
  );

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setDepartmentId(departments[0] ? String(departments[0].id) : '');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [filieresResponse, departmentsResponse] = await Promise.all([
          api.get<PaginatedResponse<Filiere>>('/filieres', {
            params: {
              page,
              limit: PAGE_SIZE,
              search: query || undefined,
              departmentId: filterDepartmentId || undefined,
              sortBy,
              sortOrder,
            },
          }),
          api.get<PaginatedResponse<Department>>('/departments', {
            params: {
              page: 1,
              limit: 100,
              sortBy: 'name',
              sortOrder: 'asc',
            },
          }),
        ]);

        setRows(filieresResponse.data.data);
        setMeta(filieresResponse.data.meta);
        setDepartments(departmentsResponse.data.data);
        if (!departmentId && departmentsResponse.data.data.length > 0) {
          setDepartmentId(String(departmentsResponse.data.data[0].id));
        }
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Impossible de charger les filières maintenant.'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [departmentId, filterDepartmentId, page, query, refreshKey, sortBy, sortOrder]);

  const onSubmit = async () => {
    if (!name.trim() || !code.trim() || !departmentId) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim(),
        departmentId: Number(departmentId),
      };

      if (editingId) {
        await api.patch(`/filieres/${editingId}`, payload);
        toast.success('Filière mise à jour avec succès');
      } else {
        await api.post('/filieres', payload);
        toast.success('Filière créée avec succès');
      }

      closeModal();
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, 'Échec de l\'enregistrement de la filière'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette filière?')) return;

    try {
      await api.delete(`/filieres/${id}`);
      toast.success('Filière supprimée avec succès');
      if (editingId === id) {
        closeModal();
      }
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError, 'Échec de la suppression de la filière'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Programmes"
        title="Filières administration"
        description="Gérez les programmes académiques avec une structure plus forte, une dénomination plus propre et des vérifications de relations fiables dans les départements, les classes, les étudiants et les enseignants."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Total des filières"
          value={meta.total}
          hint="Programmes actuellement indexés"
          icon={BookOpen}
        />
        <MetricCard
          label="Classes visibles"
          value={totalClasses}
          hint="Sur la page actuelle"
          icon={GraduationCap}
        />
        <MetricCard
          label="Étudiants visibles"
          value={totalStudents}
          hint="Sur la page actuelle"
          icon={Users}
        />
        <MetricCard
          label="Départements"
          value={departments.length}
          hint="Propriétaires de programmes disponibles"
          icon={Building2}
        />
      </section>

      <section className="flex justify-end gap-2">
        <ImportDataButton onSuccess={() => setRefreshKey((k) => k + 1)} />
        <ExportDataButton />
        <button className="btn-primary" type="button" onClick={openCreateModal}>
          Ajouter une filière
        </button>
      </section>

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Registre des programmes</h2>
            <p className="panel-copy">
              Vérifiez la propriété de la filière, la charge et l'activité opérationnelle avec un meilleur contrôle et une meilleure visibilité.
            </p>
          </div>
        </div>

        <div className="toolbar-shell">
          <div className="toolbar-group">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="input pl-10"
                placeholder="Chercher par nom de filière ou code..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              className="input sm:max-w-56"
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
              className="input sm:max-w-52"
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as 'name' | 'code' | 'updatedAt')
              }
            >
              <option value="name">Trier par nom</option>
              <option value="code">Trier par code</option>
              <option value="updatedAt">Trier par date de mise à jour</option>
            </select>
            <select
              className="input sm:max-w-44"
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value as 'asc' | 'desc')
              }
            >
              <option value="asc">Croissant</option>
              <option value="desc">Décroissant</option>
            </select>
          </div>

          <div className="toolbar-actions">
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
                setSortBy('name');
                setSortOrder('asc');
                setPage(1);
              }}
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-note">Chargement des filières...</div>
        ) : error ? (
          <div className="empty-note">{error}</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Aucune filière ne correspond à la vue actuelle"
            description="Ajustez vos filtres ou créez une nouvelle filière pour remplir le registre des programmes académiques."
          />
        ) : (
          <>
            <div className="data-table-wrap">
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Programme</th>
                      <th>Département</th>
                      <th>Classes</th>
                      <th>Étudiants</th>
                      <th>Enseignants</th>
                      <th>Mise à jour</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <p className="font-medium text-slate-950">{item.name}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              {item.code}
                            </p>
                          </div>
                        </td>
                        <td>{item.department?.name ?? '-'}</td>
                        <td>{item._count.classes}</td>
                        <td>{item._count.students}</td>
                        <td>{item._count.teachers}</td>
                        <td>{new Date(item.updatedAt).toLocaleString()}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => {
                                setEditingId(item.id);
                                setName(item.name);
                                setCode(item.code);
                                setDepartmentId(String(item.departmentId));
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
        title={editingId ? 'Modifier la filière' : 'Ajouter une filière'}
        description="Chaque filière appartient à un département et supporte la charge académique pour les classes, les étudiants et les enseignants."
        onClose={closeModal}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onSubmit} disabled={saving}>
              {editingId ? 'Enregistrer les modifications' : 'Créer une filière'}
            </button>
            <button className="btn-outline" type="button" onClick={closeModal}>
              Annuler
            </button>
          </>
        }
      >
        <div className="form-grid md:grid-cols-1 xl:grid-cols-1">
          <div className="field-stack">
            <label className="field-label">Nom du programme</label>
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="ex. Ingénierie Informatique"
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Code</label>
            <input
              className="input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="ex. IT-ENG"
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Département</label>
            <select
              className="input"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="">Sélectionner un département</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
