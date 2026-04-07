'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Building2,
  GraduationCap,
  Search,
  Users,
} from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type Department = { id: number; name: string };
type Filiere = { id: number; name: string; departmentId?: number };
type TeacherRole = { id: number; name: string; _count?: { teachers: number } };
type TeacherGrade = { id: number; name: string; _count?: { teachers: number } };
type TeacherAssignedClass = {
  id: number;
  name: string;
  year: number;
};
type Teacher = {
  id: number;
  firstName: string;
  lastName: string;
  cin?: string | null;
  dateInscription?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  departmentId: number;
  filiereId?: number | null;
  roleId: number;
  gradeId: number;
  createdAt: string;
  updatedAt: string;
  department: { id: number; name: string };
  filiere?: { id: number; name: string; departmentId?: number } | null;
  role: { id: number; name: string };
  grade: { id: number; name: string };
  taughtClasses: Array<{
    classId: number;
    class: TeacherAssignedClass;
  }>;
};

const PAGE_SIZE = 8;

export default function TeachersPage() {
  const [rows, setRows] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [roles, setRoles] = useState<TeacherRole[]>([]);
  const [grades, setGrades] = useState<TeacherGrade[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cin, setCin] = useState('');
  const [dateInscription, setDateInscription] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [filiereId, setFiliereId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterFiliereId, setFilterFiliereId] = useState('');
  const [filterRoleId, setFilterRoleId] = useState('');
  const [filterGradeId, setFilterGradeId] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'lastName' | 'createdAt' | 'updatedAt'>(
    'lastName',
  );
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

  const filieresByDepartment = useMemo(() => {
    if (!departmentId) {
      return filieres;
    }

    return filieres.filter(
      (item) => String(item.departmentId ?? '') === departmentId,
    );
  }, [departmentId, filieres]);

  const filterFilieresByDepartment = useMemo(() => {
    if (!filterDepartmentId) {
      return filieres;
    }

    return filieres.filter(
      (item) => String(item.departmentId ?? '') === filterDepartmentId,
    );
  }, [filterDepartmentId, filieres]);

  const assignedClassCount = useMemo(
    () => rows.reduce((sum, item) => sum + item.taughtClasses.length, 0),
    [rows],
  );
  const uniqueDepartments = useMemo(
    () => new Set(rows.map((item) => item.department.id)).size,
    [rows],
  );

  const permanentRoleId = useMemo(
    () => roles.find((r) => /permanent/i.test(r.name))?.id,
    [roles],
  );
  const vacataireRoleId = useMemo(
    () => roles.find((r) => /vacataire/i.test(r.name))?.id,
    [roles],
  );
  const activeTypeTab = useMemo<'all' | 'permanent' | 'vacataire'>(() => {
    if (!filterRoleId) return 'all';
    if (permanentRoleId && String(permanentRoleId) === filterRoleId) return 'permanent';
    if (vacataireRoleId && String(vacataireRoleId) === filterRoleId) return 'vacataire';
    return 'all';
  }, [filterRoleId, permanentRoleId, vacataireRoleId]);

  const onTypeTabChange = (tab: 'all' | 'permanent' | 'vacataire') => {
    if (tab === 'all') setFilterRoleId('');
    else if (tab === 'permanent') setFilterRoleId(permanentRoleId ? String(permanentRoleId) : '');
    else setFilterRoleId(vacataireRoleId ? String(vacataireRoleId) : '');
    setPage(1);
  };

  const fetchAllPaginatedRows = async <T,>(
    endpoint: string,
    params: Record<string, string | number | undefined> = {},
  ) => {
    const collected: T[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await api.get<PaginatedResponse<T>>(endpoint, {
        params: {
          ...params,
          page: currentPage,
        },
      });

      collected.push(...response.data.data);
      totalPages = response.data.meta?.totalPages ?? 1;
      currentPage += 1;
    } while (currentPage <= totalPages);

    return collected;
  };

  const resetForm = () => {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setCin('');
    setDateInscription('');
    setEmail('');
    setPhoneNumber('');
    setDepartmentId('');
    setFiliereId('');
    setRoleId('');
    setGradeId('');
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
        const [
          teachersResult,
          departmentsResult,
          filieresResult,
          rolesResult,
          gradesResult,
        ] = await Promise.allSettled([
          api.get<PaginatedResponse<Teacher>>('/teachers', {
            params: {
              page,
              limit: PAGE_SIZE,
              search: query || undefined,
              departmentId: filterDepartmentId || undefined,
              filiereId: filterFiliereId || undefined,
              roleId: filterRoleId || undefined,
              gradeId: filterGradeId || undefined,
              sortBy,
              sortOrder,
            },
          }),
          fetchAllPaginatedRows<Department>('/departments', {
            sortBy: 'name',
            sortOrder: 'asc',
          }),
          fetchAllPaginatedRows<Filiere>('/filieres', {
            sortBy: 'name',
            sortOrder: 'asc',
          }),
          api.get<TeacherRole[]>('/teachers/roles'),
          api.get<TeacherGrade[]>('/teachers/grades'),
        ]);

        if (teachersResult.status === 'fulfilled') {
          setRows(teachersResult.value.data.data);
          setMeta(teachersResult.value.data.meta);
        } else {
          setError(
            getApiErrorMessage(
              teachersResult.reason,
              'Unable to load teachers right now.',
            ),
          );
          setRows([]);
          setMeta({
            page: 1,
            limit: PAGE_SIZE,
            total: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          });
        }

        if (departmentsResult.status === 'fulfilled') {
          setDepartments(departmentsResult.value);
        } else {
          setDepartments([]);
        }

        if (filieresResult.status === 'fulfilled') {
          setFilieres(filieresResult.value);
        } else {
          setFilieres([]);
        }

        if (rolesResult.status === 'fulfilled') {
          setRoles(rolesResult.value.data);
        } else {
          setRoles([]);
        }

        if (gradesResult.status === 'fulfilled') {
          setGrades(gradesResult.value.data);
        } else {
          setGrades([]);
        }
      } catch (loadError) {
        setError(
          getApiErrorMessage(loadError, 'Unable to load teachers right now.'),
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [
    filterDepartmentId,
    filterFiliereId,
    filterGradeId,
    filterRoleId,
    page,
    query,
    refreshKey,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    if (!departmentId) {
      setFiliereId('');
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

  const onSubmit = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !departmentId ||
      !roleId ||
      !gradeId
    ) {
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        cin: cin.trim() || null,
        dateInscription: dateInscription || null,
        departmentId: Number(departmentId),
        roleId: Number(roleId),
        gradeId: Number(gradeId),
      };

      if (email.trim()) {
        payload.email = email.trim();
      } else if (editingId) {
        payload.email = null;
      }

      if (phoneNumber.trim()) {
        payload.phoneNumber = phoneNumber.trim();
      } else if (editingId) {
        payload.phoneNumber = null;
      }

      if (filiereId) {
        payload.filiereId = Number(filiereId);
      } else if (editingId) {
        payload.filiereId = null;
      }

      if (editingId) {
        await api.patch(`/teachers/${editingId}`, payload);
        toast.success('Enseignant mis à jour');
      } else {
        await api.post('/teachers', payload);
        toast.success('Enseignant créé avec succès');
      }

      closeModal();
      setPage(1);
      setRefreshKey((value) => value + 1);
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, "Échec de l'enregistrement de l'enseignant"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer cet enseignant ?')) {
      return;
    }

    try {
      await api.delete(`/teachers/${id}`);
      toast.success('Enseignant supprimé');
      if (editingId === id) {
        closeModal();
      }
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setRefreshKey((value) => value + 1);
      }
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError, "Échec de la suppression de l'enseignant"));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Faculté"
        title="Administration des enseignants"
        description="Gérez l'identité des facultés, le grade académique, la portée organisationnelle et l'affectation des classes avec un filtrage basé sur le département."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Total d'enseignants"
          value={meta.total}
          hint="Registre actuel du corps enseignant"
          icon={Users}
        />
        <MetricCard
          label="Classes assignées"
          value={assignedClassCount}
          hint="Sur la page actuelle"
          icon={BookOpen}
        />
        <MetricCard
          label="Départements visibles"
          value={uniqueDepartments}
          hint="Représenté dans cette vue"
          icon={Building2}
        />
        <MetricCard
          label="Grades disponibles"
          value={grades.length}
          hint="Échelle du corps enseignant gérée par l'admin"
          icon={GraduationCap}
        />
      </section>

      <section className="flex justify-end gap-2">
        <ImportDataButton onSuccess={() => setRefreshKey((k) => k + 1)} />
        <ExportDataButton />
        <button className="btn-primary" type="button" onClick={openCreateModal}>
          Ajouter un enseignant
        </button>
      </section>

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Registre des enseignants</h2>
            <p className="panel-copy">
              Recherchez les facultés par identité, structure, rôle et grade.
            </p>
          </div>
        </div>

        {/* ── Type tabs ── */}
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
          {(['all', 'permanent', 'vacataire'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTypeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => onTypeTabChange(tab)}
            >
              {tab === 'all' ? 'Tous' : tab === 'permanent' ? 'Permanents' : 'Vacataires'}
            </button>
          ))}
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
                  placeholder="Rechercher par nom, e-mail, téléphone, rôle ou grade..."
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
                    setFilterRoleId('');
                    setFilterGradeId('');
                    setSortBy('lastName');
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
                <option value="">Tous les départements ({departments.length})</option>
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
                <option value="">Toutes les filières ({filterFilieresByDepartment.length})</option>
                {filterFilieresByDepartment.map((filiere) => (
                  <option key={filiere.id} value={filiere.id}>
                    {filiere.name}
                  </option>
                ))}
              </select>
              <select
                className="input xl:max-w-56"
                value={filterRoleId}
                onChange={(event) => setFilterRoleId(event.target.value)}
              >
                <option value="">Tous les rôles ({roles.length})</option>
                {roles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                className="input xl:max-w-56"
                value={filterGradeId}
                onChange={(event) => setFilterGradeId(event.target.value)}
              >
                <option value="">Tous les grades ({grades.length})</option>
                {grades.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                className="input xl:max-w-52"
                value={sortBy}
                onChange={(event) =>
                  setSortBy(
                    event.target.value as 'lastName' | 'createdAt' | 'updatedAt',
                  )
                }
              >
                <option value="lastName">Trier par nom</option>
                <option value="updatedAt">Trier par date de mise à jour</option>
                <option value="createdAt">Trier par date de création</option>
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
          <div className="empty-note">Chargement des enseignants...</div>
        ) : error ? (
          <div className="empty-note">{error}</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Aucun enseignant ne correspond à la vue actuelle"
            description="Ajustez les filtres de recherche ou ajoutez un enseignant pour construire le registre du corps enseignant."
          />
        ) : (
          <>
            <div className="data-table-wrap">
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Enseignant</th>
                      <th>Statut</th>
                      <th>CIN</th>
                      <th>Grade</th>
                      <th>Inscription</th>
                      <th>Département</th>
                      <th>Filière</th>
                      <th>Contact</th>
                      <th>Mise à jour</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <p className="font-medium text-slate-950">
                              {item.firstName} {item.lastName}
                            </p>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              {item.grade.name}
                            </p>
                          </div>
                        </td>
                        <td>
                          {/vacataire/i.test(item.role.name) ? (
                            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                              Vacataire
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              Permanent
                            </span>
                          )}
                        </td>
                        <td>{item.cin ?? '-'}</td>
                        <td>{item.grade.name}</td>
                        <td>
                          {item.dateInscription
                            ? new Date(item.dateInscription).toLocaleDateString()
                            : '-'}
                        </td>
                        <td>{item.department.name}</td>
                        <td>{item.filiere?.name ?? 'Toutes les filières'}</td>
                        <td>
                          <div className="space-y-1 text-sm text-slate-600">
                            <p>{item.email ?? '-'}</p>
                            <p>{item.phoneNumber ?? '-'}</p>
                          </div>
                        </td>
                        <td>{new Date(item.updatedAt).toLocaleString()}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <Link className="btn-outline" href={`/teachers/${item.id}`}>
                              Profil
                            </Link>
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => {
                                setEditingId(item.id);
                                setFirstName(item.firstName);
                                setLastName(item.lastName);
                                setCin(item.cin ?? '');
                                setDateInscription(
                                  item.dateInscription
                                    ? item.dateInscription.slice(0, 10)
                                    : '',
                                );
                                setEmail(item.email ?? '');
                                setPhoneNumber(item.phoneNumber ?? '');
                                setDepartmentId(String(item.departmentId));
                                setFiliereId(String(item.filiereId ?? ''));
                                setRoleId(String(item.roleId));
                                setGradeId(String(item.gradeId));
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
        title={editingId ? 'Modifier l\'enseignant' : 'Ajouter un enseignant'}
        description="Définissez l’identité, le rôle, le grade et le rattachement département/filière de l’enseignant."
        onClose={closeModal}
        footer={
          <>
            <button
              className="btn-primary"
              type="button"
              onClick={onSubmit}
              disabled={saving}
            >
              {editingId ? 'Enregistrer les modifications' : 'Créer un enseignant'}
            </button>
            <button className="btn-outline" type="button" onClick={closeModal}>
              Annuler
            </button>
          </>
        }
      >
        <div className="form-grid md:grid-cols-1 xl:grid-cols-2">
          <div className="field-stack">
            <label className="field-label">Prénom</label>
            <input
              className="input"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Ex. Ahmed"
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Nom</label>
            <input
              className="input"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Ex. El Mansouri"
            />
          </div>
          <div className="field-stack">
            <label className="field-label">E-mail</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teacher@iav.ac.ma"
            />
          </div>
          <div className="field-stack">
            <label className="field-label">CIN</label>
            <input
              className="input"
              value={cin}
              onChange={(event) => setCin(event.target.value)}
              placeholder="AA123456"
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Date d’inscription</label>
            <input
              className="input"
              type="date"
              value={dateInscription}
              onChange={(event) => setDateInscription(event.target.value)}
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Numéro de téléphone</label>
            <input
              className="input"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+212 ..."
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Rôle</label>
            <select
              className="input"
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
            >
              <option value="">Sélectionner un rôle</option>
              {roles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Grade</label>
            <select
              className="input"
              value={gradeId}
              onChange={(event) => setGradeId(event.target.value)}
            >
              <option value="">Sélectionner un grade</option>
              {grades.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
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
              <option value="">Sélectionner un département</option>
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
              disabled={!departmentId}
            >
              <option value="">Toutes les filières</option>
              {filieresByDepartment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
