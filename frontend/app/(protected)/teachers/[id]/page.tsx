'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getApiErrorMessage } from '@/services/api';
import { PageHeader } from '@/components/admin/page-header';

type TeacherProfile = {
  id: number;
  firstName: string;
  lastName: string;
  cin?: string | null;
  dateInscription?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  department?: { id: number; name: string };
  filiere?: { id: number; name: string } | null;
  role?: { id: number; name: string };
  grade?: { id: number; name: string };
  taughtClasses?: Array<{
    classId: number;
    class: { id: number; name: string; year: number };
  }>;
  createdAt: string;
  updatedAt: string;
};

type ClassLogEntry = {
  id: number;
  action: string;
  metadata: {
    teacherId: number;
    previousClassIds: number[];
    newClassIds: number[];
  };
  timestamp: string;
  user: { email: string };
};

export default function TeacherProfilePage() {
  const params = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [classLogs, setClassLogs] = useState<ClassLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const id = Number(params.id);
      if (!Number.isInteger(id) || id < 1) {
        setError('Invalid teacher id.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const [teacherRes, logsRes] = await Promise.all([
          api.get<TeacherProfile>(`/teachers/${id}`),
          api.get<ClassLogEntry[]>(`/teachers/${id}/class-logs`),
        ]);
        setTeacher(teacherRes.data);
        setClassLogs(logsRes.data);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Failed to load teacher profile'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [params.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Corps enseignant"
        title="Profil enseignant"
        description="Détails complets et historique d'affectation des classes"
      />

      <section className="flex justify-end">
        <Link className="btn-outline" href="/teachers">
          Retour aux enseignants
        </Link>
      </section>

      {loading ? <div className="empty-note">Chargement du profil...</div> : null}
      {!loading && error ? <div className="empty-note">{error}</div> : null}

      {!loading && !error && teacher ? (
        <>
          <section className="surface-card space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="field-stack">
                <label className="field-label">Prénom</label>
                <p className="input bg-slate-50 dark:bg-slate-900">{teacher.firstName}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Nom</label>
                <p className="input bg-slate-50 dark:bg-slate-900">{teacher.lastName}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">CIN</label>
                <p className="input bg-slate-50 dark:bg-slate-900">{teacher.cin ?? '-'}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Date d'inscription</label>
                <p className="input bg-slate-50 dark:bg-slate-900">
                  {teacher.dateInscription
                    ? new Date(teacher.dateInscription).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              <div className="field-stack">
                <label className="field-label">Email</label>
                <p className="input bg-slate-50 dark:bg-slate-900">{teacher.email ?? '-'}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Téléphone</label>
                <p className="input bg-slate-50 dark:bg-slate-900">{teacher.phoneNumber ?? '-'}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Département</label>
                <p className="input bg-slate-50 dark:bg-slate-900">{teacher.department?.name ?? '-'}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Filière</label>
                <p className="input bg-slate-50 dark:bg-slate-900">{teacher.filiere?.name ?? '-'}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Rôle</label>
                <p className="input bg-slate-50 dark:bg-slate-900">{teacher.role?.name ?? '-'}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Grade académique</label>
                <p className="input bg-slate-50 dark:bg-slate-900">{teacher.grade?.name ?? '-'}</p>
              </div>
            </div>

            <div className="field-stack">
              <label className="field-label">Classes assignées</label>
              {teacher.taughtClasses && teacher.taughtClasses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {teacher.taughtClasses.map(({ class: classItem, classId }) => (
                    <span key={classId} className="status-chip status-chip--muted">
                      {classItem.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="input bg-slate-50 dark:bg-slate-900">-</p>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="field-stack">
                <label className="field-label">Créé le</label>
                <p className="input bg-slate-50 dark:bg-slate-900">
                  {new Date(teacher.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="field-stack">
                <label className="field-label">Mis à jour le</label>
                <p className="input bg-slate-50 dark:bg-slate-900">
                  {new Date(teacher.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </section>

          {/* Class assignment history */}
          <section className="surface-card space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Historique des affectations de classes</h2>
            {classLogs.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun changement d'affectation enregistré.</p>
            ) : (
              <div className="relative pl-5">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-emerald-200" />
                <ol className="space-y-3">
                  {classLogs.map((log, idx) => {
                    const meta = log.metadata;
                    return (
                      <li key={log.id} className="relative flex items-start gap-3">
                        <span
                          className={`absolute -left-5 mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${
                            idx === 0
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-emerald-300 bg-white'
                          }`}
                        />
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm w-full">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs text-slate-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                            {idx === 0 && (
                              <span className="status-chip status-chip--ok text-xs">Dernier</span>
                            )}
                          </div>
                          <div className="mt-1 grid gap-1 text-xs text-slate-600">
                            <div>
                              <span className="font-medium text-slate-400">Avant :</span>{' '}
                              {meta.previousClassIds.length > 0
                                ? meta.previousClassIds.join(', ')
                                : 'aucune'}
                            </div>
                            <div>
                              <span className="font-medium text-emerald-600">Après :</span>{' '}
                              {meta.newClassIds.length > 0
                                ? meta.newClassIds.join(', ')
                                : 'aucune'}
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">by {log.user.email}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
