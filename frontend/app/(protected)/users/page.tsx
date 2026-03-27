'use client';

import { useEffect, useState } from 'react';
import { Server, ShieldCheck, UserCog, Users2 } from 'lucide-react';
import { MetricCard } from '@/components/admin/metric-card';
import { PageHeader } from '@/components/admin/page-header';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { useAuth } from '@/features/auth/auth-context';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';

type User = { id: number; fullName: string; email: string; role: string };
type TeacherRole = { id: number; name: string; _count?: { teachers: number } };
type TeacherGrade = { id: number; name: string; _count?: { teachers: number } };
type AppStatus = {
  service: string;
  status: string;
  timestamp: string;
};
type DatabaseStatus = {
  dbConnected: boolean;
  message: string;
  timestamp: string;
};

export default function UsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [rows, setRows] = useState<User[]>([]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [userRole, setUserRole] = useState('staff');
  const [password, setPassword] = useState('');
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

  const loadUsers = async () => {
    const response = await api.get<User[]>('/users');
    setRows(response.data);
  };

  const loadAdminSettings = async () => {
    if (!isAdmin) {
      return;
    }

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
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const loadInitialAdminSettings = async () => {
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

    void loadInitialAdminSettings();
  }, [isAdmin]);

  const resetUserForm = () => {
    setEditingId(null);
    setFullName('');
    setEmail('');
    setUserRole('staff');
    setPassword('');
  };

  const onSubmit = async () => {
    if (!fullName.trim() || !email.trim()) {
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const payload: Record<string, unknown> = {
          fullName: fullName.trim(),
          email: email.trim(),
          role: userRole,
        };

        if (password.trim()) {
          payload.password = password;
        }

        await api.patch(`/users/${editingId}`, payload);
        toast.success('Utilisateur mis à jour avec succès');
      } else {
        if (!password.trim()) {
          return;
        }

        await api.post('/users', {
          fullName: fullName.trim(),
          email: email.trim(),
          role: userRole,
          password,
        });
        toast.success('Utilisateur créé avec succès');
      }

      resetUserForm();
      await loadUsers();
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, 'Échec de l\'enregistrement de l\'utilisateur'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer cet utilisateur?')) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      toast.success('Utilisateur supprimé avec succès');
      if (editingId === id) {
        resetUserForm();
      }
      await loadUsers();
    } catch (deleteError) {
      toast.error(getApiErrorMessage(deleteError, 'Échec de la suppression de l\'utilisateur'));
    }
  };

  const resetRoleForm = () => {
    setEditingRoleId(null);
    setRoleName('');
  };

  const resetGradeForm = () => {
    setEditingGradeId(null);
    setGradeName('');
  };

  const onSubmitRole = async () => {
    if (!roleName.trim()) {
      return;
    }

    setSettingsSaving(true);
    try {
      if (editingRoleId) {
        await api.patch(`/teachers/roles/${editingRoleId}`, {
          name: roleName.trim(),
        });
        toast.success('Rôle d\'enseignant mis à jour avec succès');
      } else {
        await api.post('/teachers/roles', {
          name: roleName.trim(),
        });
        toast.success('Rôle d\'enseignant créé avec succès');
      }

      resetRoleForm();
      await loadAdminSettings();
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, 'Échec de l\'enregistrement du rôle d\'enseignant'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const onSubmitGrade = async () => {
    if (!gradeName.trim()) {
      return;
    }

    setSettingsSaving(true);
    try {
      if (editingGradeId) {
        await api.patch(`/teachers/grades/${editingGradeId}`, {
          name: gradeName.trim(),
        });
        toast.success('Grade d\'enseignant mis à jour avec succès');
      } else {
        await api.post('/teachers/grades', {
          name: gradeName.trim(),
        });
        toast.success('Grade d\'enseignant créé avec succès');
      }

      resetGradeForm();
      await loadAdminSettings();
    } catch (saveError) {
      toast.error(getApiErrorMessage(saveError, 'Échec de l\'enregistrement du grade d\'enseignant'));
    } finally {
      setSettingsSaving(false);
    }
  };

  const onDeleteRole = async (id: number) => {
    if (!window.confirm('Supprimer ce rôle d\'enseignant?')) {
      return;
    }

    try {
      await api.delete(`/teachers/roles/${id}`);
      toast.success('Rôle d\'enseignant supprimé avec succès');
      if (editingRoleId === id) {
        resetRoleForm();
      }
      await loadAdminSettings();
    } catch (deleteError) {
      toast.error(
        getApiErrorMessage(deleteError, 'Échec de la suppression du rôle d\'enseignant'),
      );
    }
  };

  const onDeleteGrade = async (id: number) => {
    if (!window.confirm('Supprimer ce grade d\'enseignant?')) {
      return;
    }

    try {
      await api.delete(`/teachers/grades/${id}`);
      toast.success('Grade d\'enseignant supprimé avec succès');
      if (editingGradeId === id) {
        resetGradeForm();
      }
      await loadAdminSettings();
    } catch (deleteError) {
      toast.error(
        getApiErrorMessage(deleteError, 'Échec de la suppression du grade d\'enseignant'),
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Utilisateurs et paramètres de développement"
        description="Gérez l'accès, maintenez les catalogues de facultés éditables pour les admins et surveillez la santé de l'application à partir d'une seule section d'administration inférieure."
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
              Créez et maintenez des comptes internes avec une séparation claire des rôles pour accès admin, personnel et spectateur.
            </p>
          </div>
        </div>

        <div className="form-grid md:grid-cols-1 xl:grid-cols-5">
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
              onChange={(event) => setUserRole(event.target.value)}
            >
              <option value="admin">administrateur</option>
              <option value="staff">personnel</option>
              <option value="viewer">spectateur</option>
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
          <div className="flex items-end gap-2">
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
              <button
                className="btn-outline"
                type="button"
                onClick={resetUserForm}
              >
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.fullName}</td>
                    <td>{item.email}</td>
                    <td>{item.role}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={() => {
                            setEditingId(item.id);
                            setFullName(item.fullName);
                            setEmail(item.email);
                            setUserRole(item.role);
                            setPassword('');
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
      </section>

      {isAdmin ? (
        <section className="surface-card space-y-6">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Paramètres d'administration</h2>
              <p className="panel-copy">
                Vue simplifiée des paramètres système: statut global en premier, puis gestion des rôles et des grades d'enseignants.
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base font-semibold text-slate-950">Statut du système</h3>
                <p className="text-sm text-slate-500">
                  Vérifications en temps réel pour le serveur et la base de données.
                </p>
              </div>
              <button
                type="button"
                className="btn-outline"
                onClick={() => void loadAdminSettings()}
              >
                Actualiser le statut
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">API Serveur</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {appStatus?.service ?? 'Indisponible'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Statut: {appStatus?.status ?? 'inconnu'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Vérifiée: {appStatus ? new Date(appStatus.timestamp).toLocaleString() : '-'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Base de données</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {dbStatus?.dbConnected ? 'Connectée' : 'Indisponible'}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {dbStatus?.message ?? 'Aucun statut de base de données disponible'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Vérifiée: {dbStatus ? new Date(dbStatus.timestamp).toLocaleString() : '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Rôles d'enseignants</h3>
              <p className="text-sm text-slate-500">
                Gérez les rôles administrables comme enseignant, chef de filière et chef de département.
              </p>
            </div>

            <div className="space-y-3">
              <input
                className="input"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                placeholder="Ajouter un rôle d'enseignant"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={onSubmitRole}
                  disabled={settingsSaving}
                >
                  {editingRoleId ? 'Enregistrer le rôle' : 'Ajouter un rôle'}
                </button>
                {editingRoleId ? (
                  <button className="btn-outline" type="button" onClick={resetRoleForm}>
                    Annuler
                  </button>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              {teacherRoles.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{item.name}</p>
                      <p className="text-sm text-slate-500">
                        {item._count?.teachers ?? 0} enseignants assignés
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => {
                          setEditingRoleId(item.id);
                          setRoleName(item.name);
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => onDeleteRole(item.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Grades d'enseignants</h3>
              <p className="text-sm text-slate-500">
                Ce catalogue est affiché sous les rôles pour garder une hiérarchie claire de configuration.
              </p>
            </div>

            <div className="space-y-3">
              <input
                className="input"
                value={gradeName}
                onChange={(event) => setGradeName(event.target.value)}
                placeholder="Ajouter un grade d'enseignant"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={onSubmitGrade}
                  disabled={settingsSaving}
                >
                  {editingGradeId ? 'Enregistrer le grade' : 'Ajouter un grade'}
                </button>
                {editingGradeId ? (
                  <button className="btn-outline" type="button" onClick={resetGradeForm}>
                    Annuler
                  </button>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              {teacherGrades.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-950">{item.name}</p>
                      <p className="text-sm text-slate-500">
                        {item._count?.teachers ?? 0} enseignants assignés
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => {
                          setEditingGradeId(item.id);
                          setGradeName(item.name);
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => onDeleteGrade(item.id)}
                      >
                        Supprimer
                      </button>
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
