'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, fetchRef, getApiErrorMessage } from '@/services/api';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [coursHistory, setCoursHistory] = useState<CoursAssignment[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [profileDocumentTypes, setProfileDocumentTypes] = useState<ProfileDocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const teacherId = Number(params.id);
  const isTeacherOwner = user?.role === 'teacher' && user.teacherProfile?.id === teacherId;
  const canUploadDocuments = Boolean(user && user.role !== 'student' && (user.role !== 'teacher' || isTeacherOwner));
  const canDeleteDocuments = user?.role === 'admin' || user?.role === 'staff';

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
        const [teacherRes, coursRes, docsRes, profileDocTypesRes] = await Promise.all([
          api.get<TeacherProfile>(`/teachers/${id}`),
          api.get<CoursAssignment[]>(`/teachers/${id}/cours`),
          api.get<DocumentItem[]>(`/documents/teacher/${id}`),
          fetchRef<ProfileDocumentType[]>('/profile-document-types'),
        ]);
        setTeacher(teacherRes.data);
        setCoursHistory(Array.isArray(coursRes.data) ? coursRes.data : []);
        setDocuments(Array.isArray(docsRes.data) ? docsRes.data : []);
        setProfileDocumentTypes(Array.isArray(profileDocTypesRes) ? profileDocTypesRes : []);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Impossible de charger le profil'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params.id]);

  const isVacataire = /vacataire/i.test(teacher?.role?.name ?? '');

  const handleUploadDocument = async () => {
    if (!teacher || !uploadFile) return;
    if (!uploadCategory) {
      toast.error('Choisissez le type de document.');
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('teacherId', String(teacher.id));
      formData.append('category', uploadCategory);
      formData.append('file', uploadFile);
      const response = await api.post<DocumentItem>('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocuments((prev) => [response.data, ...prev]);
      setUploadFile(null);
      setUploadCategory('');
      toast.success('Document enseignant téléversé');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec du téléversement'));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!window.confirm('Supprimer ce document ?')) return;

    try {
      await api.delete(`/documents/${documentId}`);
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      toast.success('Document supprimé');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la suppression'));
    }
  };

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

          <section className="surface-card space-y-4">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Documents</h2>
                <p className="panel-copy">{documents.length} document{documents.length !== 1 ? 's' : ''} lié{documents.length !== 1 ? 's' : ''} à cet enseignant</p>
              </div>
            </div>

            {canUploadDocuments ? (
            <div className="grid gap-3 md:grid-cols-[minmax(180px,260px)_1fr_auto]">
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
                  {uploadingFile ? 'Téléversement...' : 'Téléverser'}
                </button>
              </div>
            </div>
            ) : null}

            {documents.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun document enregistré pour cet enseignant.</p>
            ) : (
              <div className="data-table-wrap">
                <div className="table-scroll">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Type</th>
                        <th>Catégorie</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td className="font-medium text-slate-900">{doc.name}</td>
                          <td>{doc.mimeType}</td>
                          <td>{doc.category ? <span className="status-chip status-chip--muted">{doc.category}</span> : '—'}</td>
                          <td>{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</td>
                          <td>
                            {canDeleteDocuments ? (
                            <button
                              type="button"
                              className="btn-outline text-xs"
                              onClick={() => void handleDeleteDocument(doc.id)}
                            >
                              Supprimer
                            </button>
                            ) : (
                              <a className="btn-outline text-xs" href={`/api/documents/${doc.id}/file`} target="_blank" rel="noreferrer">
                                Ouvrir
                              </a>
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
        </>
      ) : null}
    </div>
  );
}
