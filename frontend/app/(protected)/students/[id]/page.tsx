'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getApiErrorMessage } from '@/services/api';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { toast } from 'sonner';

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

type Observation = {
  id: number;
  text: string;
  createdAt: string;
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
  const [observations, setObservations] = useState<Observation[]>([]);
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [obsText, setObsText] = useState('');
  const [savingObs, setSavingObs] = useState(false);
  const [expandedObsId, setExpandedObsId] = useState<number | null>(null);

  const getSortedHistory = (history: StudentClassHistory[] = []) =>
    [...history].sort(
      (a, b) => a.academicYear.localeCompare(b.academicYear) || a.id - b.id,
    );

  const isHistoryEntryRedoublant = (
    history: StudentClassHistory[],
    entryId: number,
  ): boolean => {
    const seenClassIds = new Set<number>();

    for (const entry of history) {
      const classId = entry.academicClass.id;
      const repeated = seenClassIds.has(classId);

      if (entry.id === entryId) {
        return repeated;
      }

      seenClassIds.add(classId);
    }

    return false;
  };

  const isCurrentClassRedoublant = (profile: StudentProfile): boolean => {
    if (!profile.academicClass || !profile.classHistory?.length) {
      return false;
    }

    const sortedHistory = getSortedHistory(profile.classHistory);
    const latestEntry = sortedHistory[sortedHistory.length - 1];

    if (!latestEntry || latestEntry.academicClass.id !== profile.academicClass.id) {
      return false;
    }

    return isHistoryEntryRedoublant(sortedHistory, latestEntry.id);
  };

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
        const [profileRes, obsRes] = await Promise.all([
          api.get<StudentProfile>(`/students/${id}`),
          api.get<Observation[]>(`/students/${id}/observations`),
        ]);
        setStudent(profileRes.data);
        setObservations(Array.isArray(obsRes.data) ? obsRes.data : []);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Échec du chargement du profil étudiant'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params.id]);

  const handleAddObs = async () => {
    if (!obsText.trim() || !student) return;
    setSavingObs(true);
    try {
      const res = await api.post<Observation>(`/students/${student.id}/observations`, { text: obsText.trim() });
      setObservations((prev) => [res.data, ...prev]);
      setObsText('');
      setObsModalOpen(false);
      toast.success('Observation ajoutée');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de l\'ajout'));
    } finally {
      setSavingObs(false);
    }
  };

  const handleDeleteObs = async (obsId: number) => {
    if (!student || !window.confirm('Supprimer cette observation ?')) return;
    try {
      await api.delete(`/students/${student.id}/observations/${obsId}`);
      setObservations((prev) => prev.filter((o) => o.id !== obsId));
      toast.success('Observation supprimée');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la suppression'));
    }
  };

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
        <>
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
              <p className="input bg-slate-50 flex items-center justify-between gap-2">
                <span>
                  {student.academicClass
                    ? `${student.academicClass.name} (Année ${student.academicClass.year})`
                    : '-'}
                </span>
                {student.academicClass && isCurrentClassRedoublant(student) ? (
                  <span className="status-chip status-chip--warn text-xs">Redoublant</span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="field-stack">
            <label className="field-label">Historique des classes</label>
            {student.classHistory && student.classHistory.length > 0 ? (
              <div className="relative pl-5">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-emerald-200" />
                <ol className="space-y-3">
                  {getSortedHistory(student.classHistory).map((entry, idx, arr) => {
                      const isLatest = idx === arr.length - 1;
                      const isEntryRedoublant = isHistoryEntryRedoublant(arr, entry.id);

                      return (
                        <li key={entry.id} className="relative flex items-start gap-3">
                          <span className={`absolute -left-5 mt-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 ${isLatest ? 'border-emerald-500 bg-emerald-500' : 'border-emerald-300 bg-white'}`} />
                          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm w-full">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900">{entry.academicClass.name}</span>
                              <div className="flex items-center gap-2">
                                {isEntryRedoublant ? (
                                  <span className="status-chip status-chip--warn text-xs">Redoublant</span>
                                ) : null}
                                {isLatest ? <span className="status-chip status-chip--ok text-xs">Actuelle</span> : null}
                              </div>
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

        <section className="surface-card space-y-4">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Observations</h2>
              <p className="panel-copy">{observations.length} observation{observations.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => { setObsText(''); setObsModalOpen(true); }}
            >
              Ajouter une observation
            </button>
          </div>

          {observations.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune observation enregistrée.</p>
          ) : (
            <div className="data-table-wrap">
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Observation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {observations.map((obs) => (
                      <tr key={obs.id}>
                        <td className="whitespace-nowrap text-slate-500 text-xs">
                          {new Date(obs.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </td>
                        <td>
                          <div
                            className="cursor-pointer"
                            onClick={() => setExpandedObsId(expandedObsId === obs.id ? null : obs.id)}
                          >
                            {expandedObsId === obs.id ? (
                              <p className="text-sm text-slate-800 whitespace-pre-wrap">{obs.text}</p>
                            ) : (
                              <p className="text-sm text-slate-800 line-clamp-2">{obs.text}</p>
                            )}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-outline text-xs"
                            onClick={() => void handleDeleteObs(obs.id)}
                          >
                            Supprimer
                          </button>
                        </td>
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

      <ModalShell
        open={obsModalOpen}
        title="Ajouter une observation"
        description="Rédigez une observation concernant cet étudiant."
        onClose={() => setObsModalOpen(false)}
        footer={
          <>
            <button
              className="btn-primary"
              type="button"
              onClick={() => void handleAddObs()}
              disabled={savingObs || !obsText.trim()}
            >
              {savingObs ? 'Enregistrement...' : 'Ajouter'}
            </button>
            <button className="btn-outline" type="button" onClick={() => setObsModalOpen(false)}>
              Annuler
            </button>
          </>
        }
      >
        <div className="field-stack">
          <label className="field-label">Observation <span className="text-red-500">*</span></label>
          <textarea
            className="input min-h-[160px] resize-y"
            placeholder="Saisissez votre observation..."
            value={obsText}
            onChange={(e) => setObsText(e.target.value)}
          />
        </div>
      </ModalShell>
    </div>
  );
}
