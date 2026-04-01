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
  createdAt: string;
  updatedAt: string;
};

type CoursAssignment = {
  id: number;
  createdAt: string;
  groupLabel?: string | null;
  cours: { id: number; name: string; type: string };
  class: { id: number; name: string; year: number; filiere?: { id: number; name: string } | null };
};

const TYPE_CHIP: Record<string, string> = {
  CM: 'bg-blue-50 text-blue-700 border-blue-200',
  TD: 'bg-violet-50 text-violet-700 border-violet-200',
  TP: 'bg-amber-50 text-amber-700 border-amber-200',
};

function formatAffectationDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function TeacherProfilePage() {
  const params = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [coursHistory, setCoursHistory] = useState<CoursAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const id = Number(params.id);
      if (!Number.isInteger(id) || id < 1) {
        setError('Identifiant enseignant invalide.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const [teacherRes, coursRes] = await Promise.all([
          api.get<TeacherProfile>(`/teachers/${id}`),
          api.get<CoursAssignment[]>(`/teachers/${id}/cours`),
        ]);
        setTeacher(teacherRes.data);
        setCoursHistory(Array.isArray(coursRes.data) ? coursRes.data : []);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Impossible de charger le profil'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params.id]);

  const isVacataire = /vacataire/i.test(teacher?.role?.name ?? '');

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Corps enseignant"
        title="Profil enseignant"
        description="Informations détaillées et historique des cours affectés"
      />

      <section className="flex justify-end">
        <Link className="btn-outline" href="/teachers">Retour aux enseignants</Link>
      </section>

      {loading ? <div className="empty-note">Chargement du profil...</div> : null}
      {!loading && error ? <div className="empty-note">{error}</div> : null}

      {!loading && !error && teacher ? (
        <>
          <section className="surface-card space-y-4">
            {/* Status badge */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${isVacataire ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {isVacataire ? 'Vacataire' : 'Permanent'}
              </span>
              {teacher.role && (
                <span className="text-sm text-slate-500">{teacher.role.name}</span>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="field-stack">
                <label className="field-label">Prénom</label>
                <p className="input bg-slate-50">{teacher.firstName}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Nom</label>
                <p className="input bg-slate-50">{teacher.lastName}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">CIN</label>
                <p className="input bg-slate-50">{teacher.cin ?? '—'}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Date d&apos;inscription</label>
                <p className="input bg-slate-50">
                  {teacher.dateInscription ? new Date(teacher.dateInscription).toLocaleDateString('fr-FR') : '—'}
                </p>
              </div>
              <div className="field-stack">
                <label className="field-label">Email</label>
                <p className="input bg-slate-50">{teacher.email ?? '—'}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Téléphone</label>
                <p className="input bg-slate-50">{teacher.phoneNumber ?? '—'}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Département</label>
                <p className="input bg-slate-50">{teacher.department?.name ?? '—'}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Filière</label>
                <p className="input bg-slate-50">{teacher.filiere?.name ?? '—'}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Grade académique</label>
                <p className="input bg-slate-50">{teacher.grade?.name ?? '—'}</p>
              </div>
              <div className="field-stack">
                <label className="field-label">Mis à jour le</label>
                <p className="input bg-slate-50">{new Date(teacher.updatedAt).toLocaleString('fr-FR')}</p>
              </div>
            </div>
          </section>

          {/* Cours affectés avec historique */}
          <section className="surface-card space-y-3">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Cours affectés</h2>
                <p className="panel-copy">{coursHistory.length} cours affecté{coursHistory.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {coursHistory.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun cours affecté à cet enseignant.</p>
            ) : (
              <div className="data-table-wrap">
                <div className="table-scroll">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Cours</th>
                        <th>Type</th>
                        <th>Classe</th>
                        <th>Filière</th>
                        <th>Groupe</th>
                        <th>Date d&apos;affectation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coursHistory.map((a) => (
                        <tr key={a.id}>
                          <td className="font-medium text-slate-950">{a.cours.name}</td>
                          <td>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_CHIP[a.cours.type] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                              {a.cours.type}
                            </span>
                          </td>
                          <td>{a.class.name} <span className="text-slate-400 text-xs">A{a.class.year}</span></td>
                          <td>{a.class.filiere?.name ?? '—'}</td>
                          <td>{a.groupLabel ?? '—'}</td>
                          <td className="text-slate-600">{formatAffectationDate(a.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
