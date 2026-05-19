'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Database, MessageSquare, RefreshCw, Search, Server, ShieldCheck, UserCheck, UserCog, Users2 } from 'lucide-react';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { useAuth } from '@/features/auth/auth-context';
import { api, getApiErrorMessage, type PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type Department = { id: number; name: string };
type User = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  departments: Department[];
};
type TeacherRole = { id: number; name: string; _count?: { teachers: number } };
type AppStatus = { service: string; status: string; timestamp: string };
type DatabaseStatus = { dbConnected: boolean; message: string; timestamp: string };
type UnlinkedProfiles = {
  students: { id: number; fullName: string; identifier: string }[];
  teachers: { id: number; fullName: string; identifier: string | null }[];
};
type MessageGroupSummary = {
  id: number;
  name: string;
  type: string;
  _count?: { members: number; messages: number };
};
type PageSizeValue = number | 'all';

const PAGE_SIZE_OPTIONS: PageSizeValue[] = [5, 10, 25, 50, 100, 'all'];
const pageLimit = (pageSize: PageSizeValue, total: number) =>
  pageSize === 'all' ? Math.max(total, 1) : pageSize;

const ROLE_LABELS: Record<string, string> = {
  admin:     'Administrateur',
  staff:     'Personnel',
  viewer:    'Spectateur',
  user:      'Utilisateur',
  teacher:   'Enseignant',
  student:   'Étudiant',
  inspector: 'Inspecteur',
  restauration: 'Restauration',
  internat: 'Internat',
};

const DEPT_SCOPED_ROLES = new Set(['user', 'teacher', 'student', 'inspector']);

export default function UsersPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const isAdmin = user?.role === 'admin';

  const [rows, setRows] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState<PageSizeValue>(10);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [password, setPassword] = useState('');
  const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [teacherRoles, setTeacherRoles] = useState<TeacherRole[]>([]);
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [syncingMessagingGroups, setSyncingMessagingGroups] = useState(false);
  const [messagingGroups, setMessagingGroups] = useState<MessageGroupSummary[]>([]);
  const [groupsPageSize, setGroupsPageSize] = useState<PageSizeValue>(10);
  const [groupsPage, setGroupsPage] = useState(1);

  const [unlinked, setUnlinked] = useState<UnlinkedProfiles | null>(null);
  const [unlinkedLoading, setUnlinkedLoading] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPassword, setImportPassword] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const initialSearch = searchParams.get('search') ?? '';
    setSearch(initialSearch);
    setUsersPage(1);
  }, [searchParams]);

  const filteredRows = rows.filter((item) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      item.fullName,
      item.email,
      ROLE_LABELS[item.role] ?? item.role,
      ...item.departments.map((department) => department.name),
    ]
      .join(' ')
      .toLowerCase()
      .includes(query);
  });
  const usersLimit = pageLimit(usersPageSize, filteredRows.length);
  const usersTotalPages = Math.max(1, Math.ceil(filteredRows.length / usersLimit));
  const pagedUsers = usersPageSize === 'all'
    ? filteredRows
    : filteredRows.slice((usersPage - 1) * usersLimit, usersPage * usersLimit);
  const groupsLimit = pageLimit(groupsPageSize, messagingGroups.length);
  const groupsTotalPages = Math.max(1, Math.ceil(messagingGroups.length / groupsLimit));
  const pagedMessagingGroups = groupsPageSize === 'all'
    ? messagingGroups
    : messagingGroups.slice((groupsPage - 1) * groupsLimit, groupsPage * groupsLimit);

  const loadUsers = async () => {
    const response = await api.get<User[]>('/users');
    setRows(response.data);
    setUsersPage(1);
  };

  const loadDepartments = async () => {
    const response = await api.get<PaginatedResponse<Department>>('/departments');
    setDepartments(response.data.data);
  };

  const loadAdminSettings = async () => {
    if (!isAdmin) return;
    const [rolesResponse, appResponse, dbResponse, groupsResponse] = await Promise.all([
      api.get<TeacherRole[]>('/teachers/roles'),
      api.get<AppStatus>('/'),
      api.get<DatabaseStatus>('/db-status'),
      api.get<MessageGroupSummary[]>('/messaging/groups'),
    ]);
    setTeacherRoles(rolesResponse.data);
    setAppStatus(appResponse.data);
    setDbStatus(dbResponse.data);
    setMessagingGroups(groupsResponse.data ?? []);
  };

  const loadUnlinkedProfiles = async () => {
    setUnlinkedLoading(true);
    try {
      const res = await api.get<UnlinkedProfiles>('/users/unlinked-profiles');
      setUnlinked(res.data);
    } catch {
      // non-fatal
    } finally {
      setUnlinkedLoading(false);
    }
  };

  const onBulkImport = async () => {
    if (importPassword.length < 6) return;
    setImporting(true);
    try {
      const res = await api.post<{
        students: { created: number; skipped: number };
        teachers: { created: number; skipped: number };
        errors: string[];
      }>('/users/bulk-import-accounts', { defaultPassword: importPassword });
      const { students, teachers } = res.data;
      toast.success(
        `${students.created + teachers.created} compte(s) créé(s) — ` +
        `${students.skipped + teachers.skipped} ignoré(s)`,
      );
      setImportModalOpen(false);
      setImportPassword('');
      await loadUnlinkedProfiles();
      await loadUsers();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de l\'import des comptes'));
    } finally {
      setImporting(false);
    }
  };

  const syncMessagingGroups = async () => {
    setSyncingMessagingGroups(true);
    try {
      const res = await api.post<{ processedUsers: number }>('/users/sync-messaging-groups');
      toast.success(`${res.data.processedUsers} utilisateur(s) synchronisé(s)`);
      if (isAdmin) await loadAdminSettings();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la synchronisation des groupes messagerie'));
    } finally {
      setSyncingMessagingGroups(false);
    }
  };

  const downloadSqlBackup = async () => {
    setDownloadingBackup(true);
    try {
      const response = await api.get('/users/backup/sql', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `deaa-hub-backup-${date}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Sauvegarde SQL téléchargée avec succès');
    } catch (backupError) {
      toast.error(getApiErrorMessage(backupError, 'Échec du téléchargement de la sauvegarde'));
    } finally {
      setDownloadingBackup(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    void loadDepartments();
    void loadUnlinkedProfiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadAdminSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (groupsPage > groupsTotalPages) setGroupsPage(groupsTotalPages);
  }, [groupsPage, groupsTotalPages]);

  const resetUserForm = () => {
    setEditingId(null);
    setFullName('');
    setEmail('');
    setUserRole('user');
    setPassword('');
    setSelectedDeptIds([]);
  };

  const onSubmit = async () => {
    if (!fullName.trim() || !email.trim()) return;
    setSaving(true);
    try {
      const deptIds = DEPT_SCOPED_ROLES.has(userRole) ? selectedDeptIds : [];
      if (editingId) {
        const payload: Record<string, unknown> = {
          fullName: fullName.trim(),
          email: email.trim(),
          role: userRole,
          departmentIds: deptIds,
        };
        if (password.trim()) payload.password = password;
        await api.patch(`/users/${editingId}`, payload);
        toast.success('Utilisateur mis à jour avec succès');
      } else {
        if (!password.trim()) return;
        await api.post('/users', {
          fullName: fullName.trim(),
          email: email.trim(),
          role: userRole,
          password,
          departmentIds: deptIds,
        });
        toast.success('Utilisateur créé avec succès');
      }
      resetUserForm();
      await loadUsers();
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, "Échec de l'enregistrement de l'utilisateur"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer cet utilisateur?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Utilisateur supprimé avec succès');
      if (editingId === id) resetUserForm();
      await loadUsers();
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError, "Échec de la suppression de l'utilisateur"));
    }
  };

  const startEdit = (item: User) => {
    setEditingId(item.id);
    setFullName(item.fullName);
    setEmail(item.email);
    setUserRole(item.role);
    setPassword('');
    setSelectedDeptIds(DEPT_SCOPED_ROLES.has(item.role) ? item.departments.map((d) => d.id) : []);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs et paramètres"
        description="Gérez les comptes, les rôles et les affectations de départements. Les utilisateurs normaux voient uniquement les données de leurs départements."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Utilisateurs totaux"
          value={rows.length}
          hint="Comptes internes enregistrés"
          icon={Users2}
        />
        <MetricCard
          label="Dept. utilisateurs"
          value={rows.filter((item) => DEPT_SCOPED_ROLES.has(item.role)).length}
          hint="Enseignants, étudiants, inspecteurs"
          icon={ShieldCheck}
        />
        <MetricCard
          label="Rôles d'enseignants"
          value={teacherRoles.length}
          hint="Catalogue géré par les administrateurs"
          icon={UserCog}
        />
        <MetricCard
          label="Statut du serveur"
          value={appStatus?.status === 'ok' ? 'En ligne' : 'Inconnu'}
          hint={dbStatus?.dbConnected ? 'Base de données connectée' : 'Base de données en attente'}
          icon={Server}
        />
      </section>

      {/* ── User registry ── */}
      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Registre des utilisateurs</h2>
            <p className="panel-copy">
              Créez des comptes avec les rôles <strong>Administrateur</strong> (accès complet) ou <strong>Utilisateur</strong> (limité à ses départements).
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="form-grid md:grid-cols-2 xl:grid-cols-4">
            <div className="field-stack">
              <label className="field-label">Nom complet</label>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="field-stack">
              <label className="field-label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field-stack">
              <label className="field-label">Rôle</label>
              <select
                className="input"
                value={userRole}
                onChange={(e) => {
                  const next = e.target.value;
                  setUserRole(next);
                  if (!DEPT_SCOPED_ROLES.has(next)) setSelectedDeptIds([]);
                }}
              >
                <optgroup label="Administratifs">
                  <option value="admin">Administrateur</option>
                  <option value="staff">Personnel</option>
                  <option value="viewer">Spectateur</option>
                  <option value="restauration">Restauration</option>
                  <option value="internat">Internat</option>
                </optgroup>
                <optgroup label="Utilisateurs département">
                  <option value="teacher">Enseignant</option>
                  <option value="student">Étudiant</option>
                  <option value="inspector">Inspecteur</option>
                  <option value="user">Utilisateur</option>
                </optgroup>
              </select>
            </div>
            <div className="field-stack">
              <label className="field-label">Mot de passe {editingId ? '(optionnel)' : ''}</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>

          {DEPT_SCOPED_ROLES.has(userRole) && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
              <div>
                <label className="field-label text-blue-900">Départements affectés</label>
                <p className="text-xs text-blue-600 mt-0.5">
                  L&apos;utilisateur ne verra que les données des départements sélectionnés.
                </p>
              </div>
              <select
                className="input"
                value=""
                onChange={(e) => {
                  const id = Number(e.target.value);
                  if (id && !selectedDeptIds.includes(id)) setSelectedDeptIds((prev) => [...prev, id]);
                }}
              >
                <option value="">Ajouter un département…</option>
                {departments.filter((d) => !selectedDeptIds.includes(d.id)).map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              {selectedDeptIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedDeptIds.map((id) => {
                    const dept = departments.find((d) => d.id === id);
                    if (!dept) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                        {dept.name}
                        <button
                          type="button"
                          className="ml-0.5 rounded-full text-blue-500 hover:text-blue-900"
                          onClick={() => setSelectedDeptIds((prev) => prev.filter((x) => x !== id))}
                          aria-label={`Retirer ${dept.name}`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-amber-700 font-medium">
                  Aucun département sélectionné — l&apos;utilisateur ne verra aucune donnée.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <ExportDataButton />
            <button className="btn-primary" type="button" onClick={onSubmit} disabled={saving}>
              {editingId ? 'Enregistrer' : 'Créer'}
            </button>
            {editingId ? (
              <button className="btn-outline" type="button" onClick={resetUserForm}>Annuler</button>
            ) : null}
          </div>
        </div>

        {/* User list with pagination */}
        <div className="space-y-3">
          <div className="toolbar-shell">
            <div className="toolbar-group">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pl-9"
                  placeholder="Rechercher par nom, email, rôle ou département"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setUsersPage(1);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">{filteredRows.length} utilisateur{filteredRows.length !== 1 ? 's' : ''}</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Par page</span>
              <select
                className="input h-9 py-0 pr-8"
                value={String(usersPageSize)}
                onChange={(e) => {
                  const value = e.target.value;
                  setUsersPageSize(value === 'all' ? 'all' : Number(value));
                  setUsersPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={String(size)} value={String(size)}>{size === 'all' ? 'Tout' : size}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="data-table-wrap">
            <div className="table-scroll">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Nom complet</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Départements</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((item) => (
                    <tr key={item.id}>
                      <td>{item.fullName}</td>
                      <td>{item.email}</td>
                      <td>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.role === 'admin'       ? 'bg-purple-100 text-purple-800' :
                          item.role === 'staff'       ? 'bg-blue-100 text-blue-800' :
                          item.role === 'viewer'      ? 'bg-slate-100 text-slate-600' :
                          item.role === 'teacher'     ? 'bg-emerald-100 text-emerald-800' :
                          item.role === 'student'     ? 'bg-amber-100 text-amber-800' :
                          item.role === 'inspector'   ? 'bg-orange-100 text-orange-800' :
                          item.role === 'restauration'? 'bg-lime-100 text-lime-800' :
                          item.role === 'internat'    ? 'bg-cyan-100 text-cyan-800' :
                                                        'bg-slate-100 text-slate-700'
                        }`}>
                          {ROLE_LABELS[item.role] ?? item.role}
                        </span>
                      </td>
                      <td>
                        {item.departments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.departments.map((d) => (
                              <span key={d.id} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                                {d.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn-outline" onClick={() => startEdit(item)}>Modifier</button>
                          <button type="button" className="btn-outline" onClick={() => onDelete(item.id)}>Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-sm">
            <button
              type="button"
              className="btn-outline"
              disabled={usersPage <= 1}
              onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </button>
            <span className="text-slate-500">Page {usersPage} / {usersTotalPages}</span>
            <button
              type="button"
              className="btn-outline"
              disabled={usersPage >= usersTotalPages}
              onClick={() => setUsersPage((p) => Math.min(usersTotalPages, p + 1))}
            >
              Suivant
            </button>
          </div>
        </div>
      </section>

      {/* ── Messaging groups (admin only) ── */}
      {isAdmin ? (
        <section className="surface-card space-y-6">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Gestion des groupes messagerie</h2>
                <p className="panel-copy">Groupes visibles avec pagination 5 / 10 / 25 / 50 / 100 / tout.</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Groupes messagerie</h3>
                <p className="text-sm text-slate-500">Vue d&apos;ensemble et synchronisation des groupes.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => void syncMessagingGroups()}
                  disabled={syncingMessagingGroups}
                >
                  {syncingMessagingGroups ? 'Synchronisation...' : 'Auto affecter utilisateurs'}
                </button>
                <Link href="/messages" className="btn-primary">Ouvrir messagerie</Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">{messagingGroups.length} groupe(s)</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Par page</span>
                <select
                  className="input h-9 py-0 pr-8"
                  value={String(groupsPageSize)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setGroupsPageSize(value === 'all' ? 'all' : Number(value));
                    setGroupsPage(1);
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={String(size)} value={String(size)}>{size === 'all' ? 'Tout' : size}</option>
                  ))}
                </select>
              </div>
            </div>

            {messagingGroups.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun groupe de messagerie disponible.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {pagedMessagingGroups.map((group) => (
                      <div key={group.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-950">{group.name}</p>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Type: {group.type}</p>
                          </div>
                          <div className="text-right text-sm text-slate-600">
                            <p>{group._count?.members ?? 0} membres</p>
                            <p>{group._count?.messages ?? 0} messages</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="flex items-center justify-between pt-1 text-sm">
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={groupsPage <= 1}
                    onClick={() => setGroupsPage((p) => Math.max(1, p - 1))}
                  >
                    Précédent
                  </button>
                  <span className="text-slate-500">
                    Page {groupsPage} / {groupsTotalPages}
                  </span>
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={groupsPage >= groupsTotalPages}
                    onClick={() => setGroupsPage((p) => Math.min(groupsTotalPages, p + 1))}
                  >
                    Suivant
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      ) : null}

      {/* ── Système & Maintenance ── */}
      <section className="surface-card space-y-6">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Système &amp; Maintenance</h2>
            <p className="panel-copy">Statut du serveur, sauvegarde et vérification des comptes.</p>
          </div>
        </div>

        {isAdmin && (
          <>
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">Statut du système</h3>
                  <p className="text-sm text-slate-500">Vérifications en temps réel pour le serveur et la base de données.</p>
                </div>
                <button type="button" className="btn-outline" onClick={() => void loadAdminSettings()}>
                  Actualiser le statut
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">API Serveur</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{appStatus?.service ?? 'Indisponible'}</p>
                  <p className="mt-1 text-sm text-slate-600">Statut: {appStatus?.status ?? 'inconnu'}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Vérifiée: {appStatus ? new Date(appStatus.timestamp).toLocaleString() : '-'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Base de données</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">
                    {dbStatus?.dbConnected ? 'Connectée' : 'Indisponible'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{dbStatus?.message ?? 'Aucun statut disponible'}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Vérifiée: {dbStatus ? new Date(dbStatus.timestamp).toLocaleString() : '-'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Sauvegarde SQL</h3>
                <p className="text-sm text-slate-500">
                  Téléchargez une sauvegarde complète de la base de données PostgreSQL au format{' '}
                  <code className="rounded bg-slate-100 px-1 text-xs">.sql</code>.
                  Nécessite que <code className="rounded bg-slate-100 px-1 text-xs">pg_dump</code> soit disponible sur le serveur.
                </p>
              </div>
              <button
                type="button"
                className="btn-primary gap-2"
                onClick={() => void downloadSqlBackup()}
                disabled={downloadingBackup}
              >
                <Database size={16} />
                {downloadingBackup ? 'Téléchargement…' : 'Télécharger la sauvegarde SQL'}
              </button>
            </div>
          </>
        )}

        {/* Account reconciliation */}
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Vérification des comptes</h3>
              <p className="text-sm text-slate-500">
                Étudiants et enseignants sans compte utilisateur. Utilisez le bouton d&apos;import pour créer tous les comptes manquants en une seule opération.
              </p>
            </div>
            <button
              type="button"
              className="btn-outline flex items-center gap-1.5"
              onClick={() => void loadUnlinkedProfiles()}
              disabled={unlinkedLoading}
            >
              <RefreshCw size={14} className={unlinkedLoading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>

          {unlinkedLoading && <p className="empty-note">Chargement...</p>}

          {!unlinkedLoading && unlinked && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {unlinked.students.length > 0
                      ? <AlertTriangle size={16} className="text-amber-500" />
                      : <UserCheck size={16} className="text-emerald-500" />
                    }
                    <span className="font-semibold text-slate-900">Étudiants</span>
                  </div>
                  <span className={`status-chip ${unlinked.students.length > 0 ? 'status-chip--warn' : 'status-chip--ok'}`}>
                    {unlinked.students.length} sans compte
                  </span>
                </div>
                {unlinked.students.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {unlinked.students.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 truncate">{s.fullName}</span>
                        <span className="text-slate-400 text-xs ml-2 shrink-0">{s.identifier}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-emerald-600">Tous les étudiants ont un compte.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {unlinked.teachers.length > 0
                      ? <AlertTriangle size={16} className="text-amber-500" />
                      : <UserCheck size={16} className="text-emerald-500" />
                    }
                    <span className="font-semibold text-slate-900">Enseignants</span>
                  </div>
                  <span className={`status-chip ${unlinked.teachers.length > 0 ? 'status-chip--warn' : 'status-chip--ok'}`}>
                    {unlinked.teachers.length} sans compte
                  </span>
                </div>
                {unlinked.teachers.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {unlinked.teachers.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 truncate">{t.fullName}</span>
                        <span className="text-slate-400 text-xs ml-2 shrink-0">{t.identifier ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-emerald-600">Tous les enseignants ont un compte.</p>
                )}
              </div>
            </div>
          )}

          {!unlinkedLoading && unlinked && (
            <div className="flex flex-wrap gap-2">
              {(unlinked.students.length > 0 || unlinked.teachers.length > 0) && (
                <button
                  type="button"
                  className="btn-primary flex items-center gap-2"
                  onClick={() => setImportModalOpen(true)}
                >
                  <UserCheck size={15} />
                  Importer tous les comptes manquants ({unlinked.students.length + unlinked.teachers.length})
                </button>
              )}
              <button
                type="button"
                className="btn-outline flex items-center gap-2"
                onClick={() => void syncMessagingGroups()}
                disabled={syncingMessagingGroups}
              >
                <MessageSquare size={15} />
                {syncingMessagingGroups ? 'Synchronisation...' : 'Auto affecter groupes messagerie'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Bulk import modal */}
      <ModalShell
        open={importModalOpen}
        title="Créer tous les comptes manquants"
        description={`Créer des comptes pour ${(unlinked?.students.length ?? 0) + (unlinked?.teachers.length ?? 0)} profil(s) sans compte. Un mot de passe commun sera appliqué à tous.`}
        onClose={() => { setImportModalOpen(false); setImportPassword(''); }}
        footer={
          <>
            <button
              className="btn-primary flex items-center gap-1.5"
              type="button"
              onClick={() => void onBulkImport()}
              disabled={importing || importPassword.length < 6}
            >
              <UserCheck size={14} />
              {importing ? 'Import en cours...' : 'Importer'}
            </button>
            <button
              className="btn-outline"
              type="button"
              onClick={() => { setImportModalOpen(false); setImportPassword(''); }}
            >
              Annuler
            </button>
          </>
        }
      >
        <div className="field-stack">
          <label className="field-label">Mot de passe par défaut</label>
          <input
            className="input"
            type="password"
            value={importPassword}
            onChange={(e) => setImportPassword(e.target.value)}
            placeholder="Minimum 6 caractères"
            autoComplete="new-password"
          />
          {importPassword.length > 0 && importPassword.length < 6 && (
            <p className="text-xs text-red-500">Le mot de passe doit comporter au moins 6 caractères.</p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            Les étudiants utilisent leur Code Massar comme identifiant de connexion. Les enseignants utilisent leur CIN ou email.
          </p>
        </div>
      </ModalShell>
    </div>
  );
}
