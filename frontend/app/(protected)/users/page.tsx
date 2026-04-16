'use client';

import { useEffect, useState } from 'react';
import { Database, Download, Server, ShieldCheck, UserCog, Users2 } from 'lucide-react';
import { MetricCard } from '@/components/admin/metric-card';
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
type TeacherGrade = { id: number; name: string; _count?: { teachers: number } };
type AppStatus = { service: string; status: string; timestamp: string };
type DatabaseStatus = { dbConnected: boolean; message: string; timestamp: string };

type ExportEntity =
  | 'students'
  | 'teachers'
  | 'departments'
  | 'filieres'
  | 'laureates'
  | 'laureates_retrieved'
  | 'laureates_not_retrieved'
  | 'everything';

type FieldDef = { key: string; label: string; get: (r: Record<string, unknown>) => string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gPath = (obj: unknown, path: string): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = obj;
  for (const p of path.split('.')) cur = cur?.[p];
  return cur != null ? String(cur) : '';
};

const LAUREATE_FIELDS: FieldDef[] = [
  { key: 'fullName',       label: 'Nom complet',       get: r => gPath(r, 'student.fullName') },
  { key: 'codeMassar',     label: 'Code Massar',       get: r => gPath(r, 'student.codeMassar') },
  { key: 'cin',            label: 'CIN',               get: r => gPath(r, 'student.cin') },
  { key: 'email',          label: 'Email',             get: r => gPath(r, 'student.email') },
  { key: 'filiere',        label: 'Filière',           get: r => gPath(r, 'filiere.name') || gPath(r, 'student.filiere.name') },
  { key: 'graduationYear', label: 'Année de diplôme',  get: r => gPath(r, 'graduationYear') },
  { key: 'diplomaStatus',  label: 'Statut diplôme',    get: r => gPath(r, 'diplomaStatus') === 'retrieved' ? 'Récupéré' : 'En attente' },
];

const ENTITY_CONFIG: Record<Exclude<ExportEntity, 'everything'>, { label: string; fields: FieldDef[] }> = {
  students: {
    label: 'Étudiants',
    fields: [
      { key: 'fullName',       label: 'Nom complet',          get: r => gPath(r, 'fullName') },
      { key: 'codeMassar',     label: 'Code Massar',          get: r => gPath(r, 'codeMassar') },
      { key: 'cin',            label: 'CIN',                  get: r => gPath(r, 'cin') },
      { key: 'email',          label: 'Email',                get: r => gPath(r, 'email') },
      { key: 'phone',          label: 'Téléphone',            get: r => gPath(r, 'phone') },
      { key: 'birthDate',      label: 'Date de naissance',    get: r => { const d = gPath(r, 'birthDate'); return d ? new Date(d).toLocaleDateString('fr-FR') : ''; } },
      { key: 'enrollmentYear', label: "Année d'inscription",  get: r => gPath(r, 'enrollmentYear') },
      { key: 'filiere',        label: 'Filière',              get: r => gPath(r, 'filiere.name') },
      { key: 'class',          label: 'Classe',               get: r => gPath(r, 'class.name') },
    ],
  },
  teachers: {
    label: 'Enseignants',
    fields: [
      { key: 'lastName',       label: 'Nom',              get: r => gPath(r, 'lastName') },
      { key: 'firstName',      label: 'Prénom',           get: r => gPath(r, 'firstName') },
      { key: 'email',          label: 'Email',            get: r => gPath(r, 'email') },
      { key: 'phone',          label: 'Téléphone',        get: r => gPath(r, 'phone') },
      { key: 'cin',            label: 'CIN',              get: r => gPath(r, 'cin') },
      { key: 'specialization', label: 'Spécialisation',   get: r => gPath(r, 'specialization') },
      { key: 'role',           label: 'Rôle',             get: r => gPath(r, 'role.name') },
      { key: 'grade',          label: 'Grade',            get: r => gPath(r, 'grade.name') },
      { key: 'department',     label: 'Département',      get: r => gPath(r, 'department.name') },
    ],
  },
  departments: {
    label: 'Départements',
    fields: [
      { key: 'name', label: 'Nom',  get: r => gPath(r, 'name') },
      { key: 'code', label: 'Code', get: r => gPath(r, 'code') },
    ],
  },
  filieres: {
    label: 'Filières',
    fields: [
      { key: 'name',       label: 'Nom',         get: r => gPath(r, 'name') },
      { key: 'code',       label: 'Code',        get: r => gPath(r, 'code') },
      { key: 'department', label: 'Département', get: r => gPath(r, 'department.name') },
    ],
  },
  laureates:               { label: 'Lauréats (tous)',        fields: LAUREATE_FIELDS },
  laureates_retrieved:     { label: 'Lauréats avec diplôme',  fields: LAUREATE_FIELDS },
  laureates_not_retrieved: { label: 'Lauréats sans diplôme',  fields: LAUREATE_FIELDS },
};

function buildCsv(rows: Record<string, unknown>[], fields: FieldDef[]): string {
  const header = fields.map(f => `"${f.label.replace(/"/g, '""')}"`).join(',');
  const lines = rows.map(r =>
    fields.map(f => `"${f.get(r).replace(/"/g, '""')}"`).join(','),
  );
  return '\uFEFF' + [header, ...lines].join('\r\n');
}

function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function fetchEntityRows(entity: Exclude<ExportEntity, 'everything'>): Promise<Record<string, unknown>[]> {
  const fetchPages = async (endpoint: string): Promise<Record<string, unknown>[]> => {
    const rows: Record<string, unknown>[] = [];
    let page = 1;
    let hasNext = true;
    while (hasNext) {
      const resp = await api.get<PaginatedResponse<Record<string, unknown>>>(endpoint, { params: { page, limit: 200 } });
      rows.push(...resp.data.data);
      hasNext = resp.data.meta.hasNextPage;
      page++;
      if (page > 100) break;
    }
    return rows;
  };
  switch (entity) {
    case 'students':              return fetchPages('/students');
    case 'teachers':              return fetchPages('/teachers');
    case 'departments':           return fetchPages('/departments');
    case 'filieres':              return fetchPages('/filieres');
    case 'laureates': {
      const r = await api.get<Record<string, unknown>[]>('/laureates');
      return r.data;
    }
    case 'laureates_retrieved': {
      const r = await api.get<Record<string, unknown>[]>('/laureates');
      return (r.data as Record<string, unknown>[]).filter(x => x.diplomaStatus === 'retrieved');
    }
    case 'laureates_not_retrieved': {
      const r = await api.get<Record<string, unknown>[]>('/laureates');
      return (r.data as Record<string, unknown>[]).filter(x => x.diplomaStatus === 'not_retrieved');
    }
    default: return [];
  }
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  user: 'Utilisateur',
  staff: 'Personnel',
  viewer: 'Spectateur',
};

export default function UsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [rows, setRows] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [password, setPassword] = useState('');
  const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [teacherRoles, setTeacherRoles] = useState<TeacherRole[]>([]);
  const [teacherGrades, setTeacherGrades] = useState<TeacherGrade[]>([]);
  const [roleName, setRoleName] = useState('');
  const [gradeName, setGradeName] = useState('');
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [editingGradeId, setEditingGradeId] = useState<number | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [exportEntity, setExportEntity] = useState<ExportEntity>('students');
  const [selectedFields, setSelectedFields] = useState<string[]>(ENTITY_CONFIG.students.fields.map(f => f.key));
  const [exporting, setExporting] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  const loadUsers = async () => {
    const response = await api.get<User[]>('/users');
    setRows(response.data);
  };

  const loadDepartments = async () => {
    const response = await api.get<PaginatedResponse<Department>>('/departments');
    setDepartments(response.data.data);
  };

  const loadAdminSettings = async () => {
    if (!isAdmin) return;
    const [rolesResponse, gradesResponse, appResponse, dbResponse] =
      await Promise.all([
        api.get<TeacherRole[]>('/teachers/roles'),
        api.get<TeacherGrade[]>('/teachers/grades'),
        api.get<AppStatus>('/'),
        api.get<DatabaseStatus>('/db-status'),
      ]);
    setTeacherRoles(rolesResponse.data);
    setTeacherGrades(gradesResponse.data);
    setAppStatus(appResponse.data);
    setDbStatus(dbResponse.data);
  };

  useEffect(() => {
    void loadUsers();
    void loadDepartments();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadAdminSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (exportEntity !== 'everything') {
      setSelectedFields(ENTITY_CONFIG[exportEntity].fields.map(f => f.key));
    }
  }, [exportEntity]);

  const doExport = async () => {
    setExporting(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      if (exportEntity === 'everything') {
        const entities = (['students', 'teachers', 'departments', 'filieres', 'laureates'] as const);
        for (const ent of entities) {
          const rows = await fetchEntityRows(ent);
          const csv = buildCsv(rows, ENTITY_CONFIG[ent].fields);
          triggerCsvDownload(csv, `${ent}-${date}.csv`);
          await new Promise<void>(resolve => setTimeout(resolve, 600));
        }
      } else {
        const rows = await fetchEntityRows(exportEntity);
        const activeFields = ENTITY_CONFIG[exportEntity].fields.filter(f => selectedFields.includes(f.key));
        const csv = buildCsv(rows, activeFields);
        triggerCsvDownload(csv, `${exportEntity}-${date}.csv`);
      }
      toast.success('Export téléchargé avec succès');
    } catch (exportError) {
      toast.error(getApiErrorMessage(exportError, "Échec de l'export"));
    } finally {
      setExporting(false);
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
      // Admins don't have department assignments
      const deptIds = userRole === 'user' ? selectedDeptIds : [];

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
    // Only load departments for 'user' role; admins don't use them
    setSelectedDeptIds(item.role === 'user' ? item.departments.map((d) => d.id) : []);
  };

  const resetRoleForm = () => { setEditingRoleId(null); setRoleName(''); };
  const resetGradeForm = () => { setEditingGradeId(null); setGradeName(''); };

  const onSubmitRole = async () => {
    if (!roleName.trim()) return;
    setSettingsSaving(true);
    try {
      if (editingRoleId) {
        await api.patch(`/teachers/roles/${editingRoleId}`, { name: roleName.trim() });
        toast.success("Rôle d'enseignant mis à jour avec succès");
      } else {
        await api.post('/teachers/roles', { name: roleName.trim() });
        toast.success("Rôle d'enseignant créé avec succès");
      }
      resetRoleForm();
      await loadAdminSettings();
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, "Échec de l'enregistrement du rôle d'enseignant"));
    } finally {
      setSettingsSaving(false);
    }
  };

  const onSubmitGrade = async () => {
    if (!gradeName.trim()) return;
    setSettingsSaving(true);
    try {
      if (editingGradeId) {
        await api.patch(`/teachers/grades/${editingGradeId}`, { name: gradeName.trim() });
        toast.success("Grade d'enseignant mis à jour avec succès");
      } else {
        await api.post('/teachers/grades', { name: gradeName.trim() });
        toast.success("Grade d'enseignant créé avec succès");
      }
      resetGradeForm();
      await loadAdminSettings();
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, "Échec de l'enregistrement du grade d'enseignant"));
    } finally {
      setSettingsSaving(false);
    }
  };

  const onDeleteRole = async (id: number) => {
    if (!window.confirm("Supprimer ce rôle d'enseignant?")) return;
    try {
      await api.delete(`/teachers/roles/${id}`);
      toast.success("Rôle d'enseignant supprimé avec succès");
      if (editingRoleId === id) resetRoleForm();
      await loadAdminSettings();
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError, "Échec de la suppression du rôle d'enseignant"));
    }
  };

  const onDeleteGrade = async (id: number) => {
    if (!window.confirm("Supprimer ce grade d'enseignant?")) return;
    try {
      await api.delete(`/teachers/grades/${id}`);
      toast.success("Grade d'enseignant supprimé avec succès");
      if (editingGradeId === id) resetGradeForm();
      await loadAdminSettings();
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError, "Échec de la suppression du grade d'enseignant"));
    }
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
          label="Administrateurs"
          value={rows.filter((item) => item.role === 'admin').length}
          hint="Niveau d'accès le plus élevé"
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
              <input
                className="input"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </div>
            <div className="field-stack">
              <label className="field-label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="field-stack">
              <label className="field-label">Rôle</label>
              <select
                className="input"
                value={userRole}
                onChange={(event) => {
                  const next = event.target.value;
                  setUserRole(next);
                  // Admins don't need department assignments
                  if (next === 'admin') setSelectedDeptIds([]);
                }}
              >
                <option value="admin">Administrateur</option>
                <option value="user">Utilisateur</option>
              </select>
            </div>
            <div className="field-stack">
              <label className="field-label">
                Mot de passe {editingId ? '(optionnel)' : ''}
              </label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>

          {/* Department assignment — always shown for 'user' role */}
          {userRole === 'user' && (
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
                  if (id && !selectedDeptIds.includes(id)) {
                    setSelectedDeptIds((prev) => [...prev, id]);
                  }
                }}
              >
                <option value="">Ajouter un département…</option>
                {departments
                  .filter((d) => !selectedDeptIds.includes(d.id))
                  .map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
              </select>

              {selectedDeptIds.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedDeptIds.map((id) => {
                    const dept = departments.find((d) => d.id === id);
                    if (!dept) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
                      >
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
            <button
              className="btn-primary"
              type="button"
              onClick={onSubmit}
              disabled={saving}
            >
              {editingId ? 'Enregistrer' : 'Créer'}
            </button>
            {editingId ? (
              <button className="btn-outline" type="button" onClick={resetUserForm}>
                Annuler
              </button>
            ) : null}
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
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.fullName}</td>
                    <td>{item.email}</td>
                    <td>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          item.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ROLE_LABELS[item.role] ?? item.role}
                      </span>
                    </td>
                    <td>
                      {item.departments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.departments.map((d) => (
                            <span
                              key={d.id}
                              className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                            >
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
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => startEdit(item)}
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
      </section>

      {isAdmin ? (
        <section className="surface-card space-y-6">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Paramètres d&apos;administration</h2>
              <p className="panel-copy">
                Statut système et gestion des catalogues d&apos;enseignants.
              </p>
            </div>
          </div>

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
              <h3 className="text-base font-semibold text-slate-950">Rôles d&apos;enseignants</h3>
              <p className="text-sm text-slate-500">Gérez les rôles comme enseignant, chef de filière et chef de département.</p>
            </div>
            <div className="space-y-3">
              <input
                className="input"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                placeholder="Ajouter un rôle d'enseignant"
              />
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" type="button" onClick={onSubmitRole} disabled={settingsSaving}>
                  {editingRoleId ? 'Enregistrer le rôle' : 'Ajouter un rôle'}
                </button>
                {editingRoleId ? (
                  <button className="btn-outline" type="button" onClick={resetRoleForm}>Annuler</button>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              {teacherRoles.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{item.name}</p>
                      <p className="text-sm text-slate-500">{item._count?.teachers ?? 0} enseignants assignés</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn-outline" onClick={() => { setEditingRoleId(item.id); setRoleName(item.name); }}>Modifier</button>
                      <button type="button" className="btn-outline" onClick={() => onDeleteRole(item.id)}>Supprimer</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Export des données</h3>
              <p className="text-sm text-slate-500">Exportez les données en CSV. Sélectionnez l&apos;entité et les champs à inclure.</p>
            </div>

            <div className="field-stack">
              <label className="field-label">Entité à exporter</label>
              <select
                className="input"
                value={exportEntity}
                onChange={e => setExportEntity(e.target.value as ExportEntity)}
              >
                <option value="students">Étudiants</option>
                <option value="teachers">Enseignants</option>
                <option value="departments">Départements</option>
                <option value="filieres">Filières</option>
                <option value="laureates">Lauréats (tous)</option>
                <option value="laureates_retrieved">Lauréats avec diplôme</option>
                <option value="laureates_not_retrieved">Lauréats sans diplôme</option>
                <option value="everything">Tout exporter (tous les fichiers)</option>
              </select>
            </div>

            {exportEntity !== 'everything' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="field-label">Champs à inclure</span>
                  <div className="ml-auto flex gap-3">
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => setSelectedFields(ENTITY_CONFIG[exportEntity].fields.map(f => f.key))}
                    >
                      Tout sélectionner
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:underline"
                      onClick={() => setSelectedFields([])}
                    >
                      Effacer
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ENTITY_CONFIG[exportEntity].fields.map(f => (
                    <label key={f.key} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={selectedFields.includes(f.key)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedFields(prev => [...prev, f.key]);
                          } else {
                            setSelectedFields(prev => prev.filter(k => k !== f.key));
                          }
                        }}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn-primary gap-2"
              onClick={() => void doExport()}
              disabled={exporting || (exportEntity !== 'everything' && selectedFields.length === 0)}
            >
              <Download size={16} />
              {exporting ? 'Export en cours…' : 'Exporter en CSV'}
            </button>
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

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Grades d&apos;enseignants</h3>
              <p className="text-sm text-slate-500">Ce catalogue est affiché sous les rôles pour une hiérarchie de configuration claire.</p>
            </div>
            <div className="space-y-3">
              <input
                className="input"
                value={gradeName}
                onChange={(event) => setGradeName(event.target.value)}
                placeholder="Ajouter un grade d'enseignant"
              />
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" type="button" onClick={onSubmitGrade} disabled={settingsSaving}>
                  {editingGradeId ? 'Enregistrer le grade' : 'Ajouter un grade'}
                </button>
                {editingGradeId ? (
                  <button className="btn-outline" type="button" onClick={resetGradeForm}>Annuler</button>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              {teacherGrades.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{item.name}</p>
                      <p className="text-sm text-slate-500">{item._count?.teachers ?? 0} enseignants assignés</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn-outline" onClick={() => { setEditingGradeId(item.id); setGradeName(item.name); }}>Modifier</button>
                      <button type="button" className="btn-outline" onClick={() => onDeleteGrade(item.id)}>Supprimer</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
