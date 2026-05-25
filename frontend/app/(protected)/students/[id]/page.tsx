'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Camera, Download, FilePlus2 } from 'lucide-react';
import { api, fetchRef, getApiErrorMessage } from '@/services/api';
import {
  AcademicYearSelect,
  AcademicYearOption,
  getDefaultAcademicYear,
  sortAcademicYearsCurrentFirst,
} from '@/components/academic/academic-year-select';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { toast } from 'sonner';
import { useAuth } from '@/features/auth/auth-context';
import { StudentReleve } from '@/components/grades/student-releve';

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

type DocumentItem = {
  id: number;
  name: string;
  mimeType: string;
  category?: string | null;
  createdAt: string;
};

type ProfileDocumentType = {
  id: number;
  name: string;
  description?: string | null;
};

type DocumentType = {
  id: number;
  name: string;
  description?: string | null;
};

type DocumentTemplate = {
  id: number;
  name: string;
  documentTypeId?: number | null;
  type: string;
};

type GenerationOption = {
  id: string;
  label: string;
  template?: DocumentTemplate;
  documentTypeId?: number | null;
};

type GradeItem = {
  id: number;
  subject: string;
  semester?: string | null;
  assessmentType?: string | null;
  score: number;
  maxScore: number;
  academicYear: string;
  comment?: string | null;
  publicationStatus?: 'draft' | 'published' | 'modified_after_publication';
  module?: { id: number; name: string; semestre?: string | null } | null;
  elementModule?: { id: number; name: string; type?: string | null; ponderation?: number | null } | null;
  teacher?: { id: number; firstName: string; lastName: string } | null;
  academicClass?: { id: number; name: string; year: number } | null;
};

type StudentGradesMeResponse = {
  currentGrades?: GradeItem[];
  historyByYear?: { year: string; grades: GradeItem[] }[];
};

type StudentProfile = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  fullName: string;
  sex: 'male' | 'female';
  firstYearEntry: number;
  codeMassar: string;
  codeEtudiant?: string | null;
  cin: string;
  dateNaissance?: string;
  email?: string;
  telephone?: string;
  linkedInUrl?: string | null;
  anneeAcademique: string;
  dateInscription?: string;
  bacType?: string | null;
  filiere?: { id: number; name: string } | null;
  academicClass?: { id?: number; name: string; year: number } | null;
  classHistory?: StudentClassHistory[];
};

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [, setDocuments] = useState<DocumentItem[]>([]);
  const [profileDocumentTypes, setProfileDocumentTypes] = useState<ProfileDocumentType[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [obsModalOpen, setObsModalOpen] = useState(false);
  const [obsText, setObsText] = useState('');
  const [savingObs, setSavingObs] = useState(false);
  const [expandedObsId, setExpandedObsId] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [profileSection, setProfileSection] = useState<'overview' | 'notes'>('overview');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generatingDocumentTypeId, setGeneratingDocumentTypeId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoObjectUrlRef = useRef<string | null>(null);
  const profileId = Number(params.id);
  const isStudentOwner = user?.role === 'student' && user.studentProfile?.id === profileId;
  const canUseDirectAdminActions = Boolean(user && user.role !== 'student');
  const canUploadDocuments = canUseDirectAdminActions || isStudentOwner;
  const generationOptions = useMemo(
    () => {
      const options: GenerationOption[] = documentTypes.map((type) => ({
        id: `type-${type.id}`,
        label: type.name,
        documentTypeId: type.id,
        template: documentTemplates.find((template) => template.documentTypeId === type.id),
      }));
      const releveTemplate = documentTemplates.find((template) => template.type === 'releve_note');
      const alreadyLinked =
        releveTemplate?.documentTypeId &&
        options.some((option) => option.documentTypeId === releveTemplate.documentTypeId);
      if (releveTemplate && !alreadyLinked) {
        options.unshift({
          id: `releve-${releveTemplate.id}`,
          label: 'Relevé de notes',
          documentTypeId: releveTemplate.documentTypeId ?? null,
          template: releveTemplate,
        });
      }
      return options;
    },
    [documentTemplates, documentTypes],
  );
  const hasGenerationTemplate = generationOptions.some((item) => Boolean(item.template));
  const visibleGrades = selectedAcademicYear
    ? grades.filter((grade) => grade.academicYear === selectedAcademicYear)
    : grades;

  const setPhotoObjectUrl = useCallback((url: string | null) => {
    if (photoObjectUrlRef.current) {
      URL.revokeObjectURL(photoObjectUrlRef.current);
    }
    photoObjectUrlRef.current = url;
    setPhotoUrl(url);
  }, []);

  const loadPhoto = useCallback(async (id: number) => {
    try {
      const photoRes = await api.get(`/students/${id}/photo`, { responseType: 'blob' });
      setPhotoObjectUrl(URL.createObjectURL(photoRes.data as Blob));
    } catch {
      setPhotoObjectUrl(null);
    }
  }, [setPhotoObjectUrl]);

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
    let isCancelled = false;

    const load = async () => {
      if (!user) return;

      const id = Number(params.id);
      if (!Number.isInteger(id) || id < 1) {
        setError('Identifiant étudiant invalide.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const [
          profileRes,
          obsRes,
          docsRes,
          gradesRes,
          yearsRes,
          profileDocTypesRes,
          documentTypesRes,
          templatesRes,
        ] = await Promise.all([
          api.get<StudentProfile>(`/students/${id}`),
          api.get<Observation[]>(`/students/${id}/observations`),
          api.get<DocumentItem[]>(`/documents/student/${id}`),
          isStudentOwner || user.role === 'student'
            ? api.get<StudentGradesMeResponse>('/grades/me')
            : api.get<GradeItem[]>(`/grades/student/${id}`),
          fetchRef<AcademicYearOption[]>('/academic-years'),
          fetchRef<ProfileDocumentType[]>('/profile-document-types'),
          api.get<DocumentType[]>('/document-types'),
          api.get<DocumentTemplate[]>('/documents/templates'),
        ]);
        if (isCancelled) return;
        const sortedYears = sortAcademicYearsCurrentFirst(yearsRes);
        const defaultYear = getDefaultAcademicYear(sortedYears);
        setAcademicYears(sortedYears);
        setSelectedAcademicYear((value) => value || defaultYear || profileRes.data.anneeAcademique);
        setStudent(profileRes.data);
        setObservations(Array.isArray(obsRes.data) ? obsRes.data : []);
        setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
        setProfileDocumentTypes(Array.isArray(profileDocTypesRes) ? profileDocTypesRes : []);
        setDocumentTypes(Array.isArray(documentTypesRes.data) ? documentTypesRes.data : []);
        setDocumentTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
        if (isStudentOwner || user.role === 'student') {
          const data = gradesRes.data as StudentGradesMeResponse;
          setGrades([
            ...(data.currentGrades ?? []),
            ...(data.historyByYear ?? []).flatMap((entry) => entry.grades),
          ]);
        } else {
          setGrades(Array.isArray(gradesRes.data) ? gradesRes.data : []);
        }
        if (!isCancelled) await loadPhoto(id);
      } catch (loadError) {
        if (!isCancelled) {
          setError(getApiErrorMessage(loadError, 'Échec du chargement du profil étudiant'));
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };
    void load();

    return () => {
      isCancelled = true;
    };
  }, [isStudentOwner, loadPhoto, params.id, user]);

  useEffect(() => {
    return () => {
      if (photoObjectUrlRef.current) URL.revokeObjectURL(photoObjectUrlRef.current);
    };
  }, []);

  const handleUploadPhoto = async (file: File) => {
    if (!student) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/students/${student.id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await loadPhoto(student.id);
      toast.success('Photo de profil mise à jour');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la mise à jour de la photo'));
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

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

  const handleUploadDocument = async () => {
    if (!student || !uploadFile) return;
    if (!uploadCategory) {
      toast.error('Choisissez le type de document.');
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('studentId', String(student.id));
      formData.append('category', uploadCategory);
      formData.append('file', uploadFile);
      const response = await api.post<DocumentItem>('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocuments((prev) => [response.data, ...prev]);
      setUploadFile(null);
      setUploadCategory('');
      toast.success('Document étudiant téléversé');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec du téléversement'));
    } finally {
      setUploadingFile(false);
    }
  };

  const openDocument = async (doc: DocumentItem, mode: 'inline' | 'download' = 'inline') => {
    try {
      const response = await api.get<Blob>(`/documents/${doc.id}/file`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: doc.mimeType });
      const url = URL.createObjectURL(blob);

      if (mode === 'download') {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        return;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Ouverture impossible'));
    }
  };

  const generateAndDownloadDocument = async (option: GenerationOption) => {
    const template = option.template;
    if (!template) {
      toast.error(`Aucun modèle configuré pour ${option.label}`);
      return;
    }
    setGeneratingDocumentTypeId(option.id);
    try {
      const generated = await api.post<DocumentItem>(`/documents/generate/student/${profileId}`, {
        templateId: template.id,
        documentTypeId: option.documentTypeId || undefined,
      });
      setGenerateModalOpen(false);
      setDocuments((prev) => [generated.data, ...prev]);
      await openDocument(generated.data, 'download');
      toast.success(`${option.label} téléchargé`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Génération impossible'));
    } finally {
      setGeneratingDocumentTypeId(null);
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
        <Link className="btn-outline" href={isStudentOwner ? '/dashboard' : '/students'}>
          {isStudentOwner ? 'Retour tableau de bord' : 'Retour aux étudiants'}
        </Link>
      </section>

      {loading ? <div className="empty-note">Chargement du profil...</div> : null}
      {!loading && error ? <div className="empty-note">{error}</div> : null}

      {!loading && !error && student ? (
        <>
        <section className="surface-card space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={profileSection === 'overview' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setProfileSection('overview')}
            >
              Profil
            </button>
            <button
              type="button"
              className={profileSection === 'notes' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setProfileSection('notes')}
            >
              Notes
            </button>
          </div>
        </section>

        {profileSection === 'overview' && (
          <>
        <section className="surface-card space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white text-xl font-semibold text-slate-400 shadow-sm">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt={`Photo de ${student.fullName}`} className="h-full w-full object-cover" />
              ) : (
                student.fullName
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <label className="field-label">Nom complet</label>
              <h2 className="truncate text-2xl font-semibold text-slate-950">
                {student.fullName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Code Étudiant : {student.codeEtudiant ?? '-'} · Code Massar : {student.codeMassar}
              </p>
              {canUseDirectAdminActions ? (
                <>
                  <button
                    type="button"
                    className="btn-outline mt-3 flex items-center gap-1.5"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    <Camera size={14} />
                    {uploadingPhoto ? 'Upload...' : photoUrl ? 'Changer photo' : 'Ajouter photo'}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleUploadPhoto(file);
                    }}
                  />
                </>
              ) : null}
            </div>
          </div>

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
              <label className="field-label">Code Étudiant</label>
              <p className="input bg-slate-50">{student.codeEtudiant ?? '-'}</p>
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
              <label className="field-label">LinkedIn</label>
              {student.linkedInUrl ? (
                <a
                  className="input bg-slate-50 text-blue-700 underline"
                  href={student.linkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {student.linkedInUrl}
                </a>
              ) : (
                <p className="input bg-slate-50">-</p>
              )}
            </div>
            <div className="field-stack">
              <label className="field-label">Première année d’entrée</label>
              <p className="input bg-slate-50">{student.firstYearEntry}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">Année académique</label>
              <p className="input bg-slate-50">{student.anneeAcademique}</p>
            </div>
            <div className="field-stack">
              <label className="field-label">Date d’inscription</label>
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
          </>
        )}

        {profileSection === 'overview' && (
        <section className="surface-card space-y-4">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Observations</h2>
              <p className="panel-copy">{observations.length} observation{observations.length !== 1 ? 's' : ''}</p>
            </div>
            {canUseDirectAdminActions ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => { setObsText(''); setObsModalOpen(true); }}
              >
                Ajouter une observation
              </button>
            ) : null}
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
                          {canUseDirectAdminActions ? (
                            <button
                              type="button"
                              className="btn-outline text-xs"
                              onClick={() => void handleDeleteObs(obs.id)}
                            >
                              Supprimer
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Lecture seule</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
        )}

        {profileSection === 'notes' && (
        <section className="surface-card space-y-4">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Notes</h2>
              <p className="panel-copy">{grades.length} note{grades.length !== 1 ? 's' : ''} enregistrée{grades.length !== 1 ? 's' : ''}</p>
            </div>
            <AcademicYearSelect
              className="min-w-64"
              value={selectedAcademicYear}
              years={academicYears}
              onChange={setSelectedAcademicYear}
              label="Année académique"
            />
            <Link className="btn-outline" href="/grades">
              Ouvrir les épreuves
            </Link>
          </div>

          {visibleGrades.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune note enregistrée pour cette année académique.</p>
          ) : (
            <StudentReleve student={student} grades={visibleGrades} />
          )}
        </section>
        )}

        {profileSection === 'overview' && (
        <section className="surface-card space-y-4">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Documents</h2>
              <p className="panel-copy">Générez et téléchargez directement les documents configurés pour cet étudiant.</p>
            </div>
            <button
              type="button"
              className="btn-primary flex items-center gap-2"
              onClick={() => setGenerateModalOpen(true)}
              disabled={!hasGenerationTemplate}
            >
              <FilePlus2 size={14} />
              Générer document
            </button>
          </div>

          {canUploadDocuments ? (
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(180px,260px)_1fr_auto]">
              <div className="field-stack">
                <label className="field-label">Type de document</label>
                <select
                  className="input"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                >
                  <option value="">Sélectionner un type</option>
                  {profileDocumentTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Téléverser un document</label>
                <input
                  className="input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="flex items-end">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={() => void handleUploadDocument()}
                  disabled={!uploadFile || !uploadCategory || uploadingFile}
                >
                  {uploadingFile ? 'Téléversement...' : 'Téléverser fichier'}
                </button>
              </div>
            </div>
          ) : null}

          {!hasGenerationTemplate ? (
            <p className="text-sm text-slate-400">
              Aucun modèle de document n&apos;est configuré. Ajoutez un modèle dans Paramètres → Types de documents.
            </p>
          ) : null}
        </section>
        )}
        </>
      ) : null}

      <ModalShell
        open={generateModalOpen}
        title="Générer un document"
        description="Sélectionnez le document à télécharger. Le fichier est généré et téléchargé immédiatement."
        onClose={() => setGenerateModalOpen(false)}
        size="sm"
      >
        <div className="space-y-2">
          {generationOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void generateAndDownloadDocument(option)}
              disabled={!option.template || generatingDocumentTypeId !== null}
            >
              <span>
                <span className="block text-sm font-semibold text-slate-900">{option.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {option.template ? option.template.name : 'Aucun modèle configuré'}
                </span>
              </span>
              <Download size={15} className="text-slate-400" />
            </button>
          ))}
          {generationOptions.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun type de document configuré.</p>
          ) : null}
        </div>
      </ModalShell>

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
