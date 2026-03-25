'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getApiErrorMessage } from '@/services/api';
import { PageHeader } from '@/components/admin/page-header';

type StudentClassHistory = {
  id: number;
  academicYear: string;
  studyYear: number;
  academicClass: {
    id: number;
    name: string;
    year?: number;
  };
};

type StudentProfile = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  fullName: string;
  sex: 'male' | 'female';
  firstYearEntry: number;
  codeMassar: string;
  cin: string;
  dateNaissance?: string;
  email?: string;
  telephone?: string;
  anneeAcademique: string;
  dateInscription?: string;
  bacType?: string | null;
  filiere?: { id: number; name: string } | null;
  academicClass?: { id?: number; name: string; year: number } | null;
  classHistory?: StudentClassHistory[];
};

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const id = Number(params.id);
      if (!Number.isInteger(id) || id < 1) {
        setError('Identifiant étudiant invalide.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<StudentProfile>(`/students/${id}`);
        setStudent(response.data);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Échec du chargement du profil étudiant'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Étudiants"
        title="Profil étudiant"
        description="Détails complets et historique académique"
      />

      <section className="flex justify-end">
        <Link className="btn-outline" href="/students">
          Retour aux étudiants
        </Link>
      </section>

      {loading ? <div className="empty-note">Chargement du profil...</div> : null}
      {!loading && error ? <div className="empty-note">{error}</div> : null}

      {!loading && !error && student ? (
        <section className="surface-card space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="field-stack">
              <label className="field-label">Prénom</label>
              <p className="input bg-slate-50">{student.firstName ?? '-'}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">Nom</label>
              <p className="input bg-slate-50">{student.lastName ?? '-'}</p>
            </div>
            <div className="field-stack md:col-span-2">
              <label className="field-label">Nom complet</label>
              <p className="input bg-slate-50">{student.fullName}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">Sexe</label>
              <p className="input bg-slate-50">{student.sex === 'male' ? 'Homme' : 'Femme'}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">CIN</label>
              <p className="input bg-slate-50">{student.cin}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">Code Massar</label>
              <p className="input bg-slate-50">{student.codeMassar}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">Date de naissance</label>
              <p className="input bg-slate-50">
                {student.dateNaissance ? new Date(student.dateNaissance).toLocaleDateString('fr-FR') : '-'}
              </p>
            </div>
            <div className="field-stack">
              <label className="field-label">E-mail</label>
              <p className="input bg-slate-50">{student.email ?? '-'}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">Téléphone</label>
              <p className="input bg-slate-50">{student.telephone ?? '-'}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">Première année d'entrée</label>
              <p className="input bg-slate-50">{student.firstYearEntry}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">Année académique</label>
              <p className="input bg-slate-50">{student.anneeAcademique}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">Date d'inscription</label>
              <p className="input bg-slate-50">
                {student.dateInscription ? new Date(student.dateInscription).toLocaleDateString('fr-FR') : '-'}
              </p>
            </div>
            <div className="field-stack">
              <label className="field-label">Type de bac</label>
              <p className="input bg-slate-50">{student.bacType ?? '-'}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">Filière</label>
              <p className="input bg-slate-50">{student.filiere?.name ?? '-'}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">Classe actuelle</label>
              <p className="input bg-slate-50">
                {student.academicClass
                  ? `${student.academicClass.name} (Année ${student.academicClass.year})`
                  : '-'}
              </p>
            </div>
          </div>

          <div className="field-stack">
            <label className="field-label">Historique des classes</label>
            {student.classHistory && student.classHistory.length > 0 ? (
              <div className="relative pl-5">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-emerald-200" />
                <ol className="space-y-3">
                  {[...student.classHistory]
                    .sort((a, b) => a.academicYear.localeCompare(b.academicYear))
                    .map((entry, idx, arr) => {
                      const isLatest = idx === arr.length - 1;
                      return (
                        <li key={entry.id} className="relative flex items-start gap-3">
                          <span className={`absolute -left-5 mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${isLatest ? 'border-emerald-500 bg-emerald-500' : 'border-emerald-300 bg-white'}`} />
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm w-full">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900">{entry.academicClass.name}</span>
                              {isLatest && <span className="status-chip status-chip--ok text-xs">Actuelle</span>}
                            </div>
                            <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
                              <span>{entry.academicYear}</span>
                              <span>·</span>
                              <span>Année {entry.studyYear}</span>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ol>
              </div>
            ) : (
              <p className="input bg-slate-50">Aucun historique</p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
