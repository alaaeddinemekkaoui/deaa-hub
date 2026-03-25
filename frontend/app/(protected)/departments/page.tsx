'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, FolderTree, Search, ShieldCheck, Users } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type Department = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    filieres: number;
    teachers: number;
  };
};

const PAGE_SIZE = 8;

export default function DepartmentsPage() {
  const [rows, setRows] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'updatedAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [meta, setMeta] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const totalFilieres = useMemo(
    () => rows.reduce((sum, item) => sum + item._count.filieres, 0),
    [rows],
  );
  const totalTeachers = useMemo(
    () => rows.reduce((sum, item) => sum + item._count.teachers, 0),
    [rows],
  );

  const resetForm = () => {
    setEditingId(null);
    setName('');
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
        const response = await api.get<PaginatedResponse<Department>>('/departments', {
          params: {
            page,
            limit: PAGE_SIZE,
            search: query || undefined,
            sortBy,
            sortOrder,
          },
        });
        setRows(response.data.data);
        setMeta(response.data.meta);
      } catch (loadError) {
        setError(
          getApiErrorMessage(loadError, 'Impossible de charger les départements maintenant.'),
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [page, query, refreshKey, sortBy, sortOrder]);

  const onSubmit = async () => {
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/departments/${editingId}`, { name: name.trim() });
        toast.success('Département mis à jour avec succès');
      } else {
        await api.post('/departments', { name: name.trim() });
        toast.success('Département créé avec succès');
      }

      closeModal();
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, 'Échec de l\'enregistrement du département'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer ce département?')) return;

    try {
      await api.delete(`/departments/${id}`);
      toast.success('Département supprimé avec succès');
      if (editingId === id) {
        closeModal();
      }
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError, 'Échec de la suppression du département'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Structures"
        title="Administration des départements"
        description="Gérez les structures académiques avec une meilleure gouvernance, une propriété plus claire et une gestion relationnelle plus sûre."
        actions={
          <>
            <div className="stat-inline">
              <ShieldCheck size={14} />
              Protection de suppression relationnelle
            </div>
            <div className="stat-inline">
              <FolderTree size={14} />
              Recherche, tri et pagination activés
            </div>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Total des départements"
          value={meta.total}
          hint="Sur tout l'espace de travail actuel"
          icon={Building2}
        />
        <MetricCard
          label="Filières liées"
          value={totalFilieres}
          hint="Visible sur cette page"
          icon={FolderTree}
        />
        <MetricCard
          label="Enseignants assignés"
          value={totalTeachers}
          hint="Visible sur cette page"
          icon={Users}
        />
      </section>

      <section className="flex justify-end gap-2">
        <ImportDataButton onSuccess={() => setRefreshKey((k) => k + 1)} />
        <ExportDataButton />
        <button className="btn-primary" type="button" onClick={openCreateModal}>
          Ajouter un département
        </button>
      </section>

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Registre des départements</h2>
            <p className="panel-copy">
              Vérifiez la charge de la structure, modifiez la dénomination et surveillez les dépendances académiques depuis un seul tableau.
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
                placeholder="Chercher les départements..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              className="input sm:max-w-52"
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as 'name' | 'updatedAt')
              }
            >
              <option value="name">Trier par nom</option>
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
          <div className="empty-note">Chargement des départements...</div>
        ) : error ? (
          <div className="empty-note">{error}</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Aucun département ne correspond à la vue actuelle"
            description="Essayez de modifier votre recherche ou créez un nouveau département pour initialiser le registre de structures."
          />
        ) : (
          <>
            <div className="data-table-wrap">
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Département</th>
                      <th>Filières</th>
                      <th>Enseignants</th>
                      <th>Dernière mise à jour</th>
                      <th>Bilan</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <p className="font-medium text-slate-950">{item.name}</p>
                            <p className="text-xs text-slate-500">
                              Créé le {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </td>
                        <td>{item._count.filieres}</td>
                        <td>{item._count.teachers}</td>
                        <td>{new Date(item.updatedAt).toLocaleString()}</td>
                        <td>
                          <span
                            className={`status-chip ${
                              item._count.filieres > 0
                                ? 'status-chip--ok'
                                : 'status-chip--muted'
                            }`}
                          >
                            {item._count.filieres > 0 ? 'Structuré' : 'Autonome'}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => {
                                setEditingId(item.id);
                                setName(item.name);
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
        title={editingId ? 'Modifier le département' : 'Ajouter un département'}
        description="Maintenez une structure institutionnelle propre. Les départements avec des filières ou des enseignants associés ne peuvent pas être supprimés."
        onClose={closeModal}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onSubmit} disabled={saving}>
              {editingId ? 'Enregistrer les modifications' : 'Créer un département'}
            </button>
            <button className="btn-outline" type="button" onClick={closeModal}>
              Annuler
            </button>
          </>
        }
      >
        <div className="field-stack">
          <label className="field-label">Nom du département</label>
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ex. APESA"
          />
        </div>
      </ModalShell>
    </div>
  );
}
