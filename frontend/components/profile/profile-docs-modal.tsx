'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Download, Eye, FileText, Trash2, Upload, User } from 'lucide-react';
import { ModalShell } from '@/components/admin/modal-shell';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';

type ProfileDocumentType = { id: number; name: string; description?: string | null };
type Document = { id: number; name: string; mimeType: string; category?: string | null; createdAt: string };
type DocumentType = { id: number; name: string; description?: string | null };
type DocumentTemplate = { id: number; name: string; documentTypeId?: number | null; type: string };

interface ProfileDocsModalProps {
  open: boolean;
  onClose: () => void;
  entityType: 'student' | 'teacher';
  entityId: number;
  entityName: string;
  canEdit: boolean;
}

export function ProfileDocsModal({ open, onClose, entityType, entityId, entityName, canEdit }: ProfileDocsModalProps) {
  const [docTypes, setDocTypes] = useState<ProfileDocumentType[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [generatingTypeId, setGeneratingTypeId] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoObjectUrlRef = useRef<string | null>(null);

  const endpoint = entityType === 'student' ? `/students/${entityId}` : `/teachers/${entityId}`;
  const docsEndpoint = entityType === 'student'
    ? `/documents/student/${entityId}`
    : `/documents/teacher/${entityId}`;

  const setPhotoObjectUrl = useCallback((url: string | null) => {
    if (photoObjectUrlRef.current) {
      URL.revokeObjectURL(photoObjectUrlRef.current);
    }
    photoObjectUrlRef.current = url;
    setPhotoUrl(url);
  }, []);

  const loadPhoto = useCallback(async () => {
    try {
      const photoRes = await api.get(`${endpoint}/photo`, { responseType: 'blob' });
      setPhotoObjectUrl(URL.createObjectURL(photoRes.data as Blob));
    } catch {
      setPhotoObjectUrl(null);
    }
  }, [endpoint, setPhotoObjectUrl]);

  const loadData = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const [typesRes, docsRes, documentTypesRes, templatesRes] = await Promise.all([
        api.get<ProfileDocumentType[]>('/profile-document-types'),
        api.get<Document[]>(docsEndpoint),
        entityType === 'student' ? api.get<DocumentType[]>('/document-types') : Promise.resolve({ data: [] as DocumentType[] }),
        entityType === 'student' ? api.get<DocumentTemplate[]>('/documents/templates') : Promise.resolve({ data: [] as DocumentTemplate[] }),
      ]);
      setDocTypes(typesRes.data);
      setDocuments(docsRes.data);
      setDocumentTypes(documentTypesRes.data);
      setTemplates(templatesRes.data);
      setSelectedCategory((current) => current || typesRes.data[0]?.name || '');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Chargement impossible'));
    } finally {
      setLoading(false);
    }
  }, [open, docsEndpoint]);

  useEffect(() => {
    if (open) {
      void loadData();
      void loadPhoto();
    } else {
      setPhotoObjectUrl(null);
    }
  }, [open, loadData, loadPhoto, setPhotoObjectUrl]);

  useEffect(() => {
    return () => {
      if (photoObjectUrlRef.current) {
        URL.revokeObjectURL(photoObjectUrlRef.current);
        photoObjectUrlRef.current = null;
      }
    };
  }, []);

  const uploadPhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`${endpoint}/photo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Photo mise à jour');
      await loadPhoto();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Upload photo impossible'));
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const uploadDocument = async (file: File) => {
    if (!selectedCategory) { toast.error('Sélectionnez un type de document'); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('category', selectedCategory);
      if (entityType === 'student') form.append('studentId', String(entityId));
      else form.append('teacherId', String(entityId));
      await api.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document ajouté');
      const docsRes = await api.get<Document[]>(docsEndpoint);
      setDocuments(docsRes.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Upload impossible'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const generateDocument = async (type: DocumentType) => {
    const template = templates.find((item) => item.documentTypeId === type.id);
    if (!template) {
      toast.error(`Aucun modèle configuré pour ${type.name}`);
      return;
    }
    setGeneratingTypeId(type.id);
    try {
      await api.post(`/documents/generate/releve/${entityId}`, {
        templateId: template.id,
        documentTypeId: type.id,
      });
      toast.success(`${type.name} généré`);
      const docsRes = await api.get<Document[]>(docsEndpoint);
      setDocuments(docsRes.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Génération impossible'));
    } finally {
      setGeneratingTypeId(null);
    }
  };

  const openDoc = async (doc: Document, mode: 'inline' | 'download') => {
    try {
      const res = await api.get<Blob>(`/documents/${doc.id}/file`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: doc.mimeType });
      const url = URL.createObjectURL(blob);
      if (mode === 'inline') { window.open(url, '_blank'); return; }
      const a = document.createElement('a');
      a.href = url; a.download = doc.name; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Ouverture impossible'));
    }
  };

  const deleteDoc = async (doc: Document) => {
    if (!canEdit) return;
    if (!window.confirm(`Supprimer "${doc.name}" ?`)) return;
    try {
      await api.delete(`/documents/${doc.id}`);
      toast.success('Document supprimé');
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Suppression impossible'));
    }
  };

  return (
    <ModalShell
      open={open}
      title={`Dossier — ${entityName}`}
      description="Photo de profil et documents officiels."
      onClose={onClose}
      footer={
        <button className="btn-outline" type="button" onClick={onClose}>Fermer</button>
      }
    >
      <div className="space-y-5">
        {loading ? (
          <p className="text-sm text-slate-500 text-center py-4">Chargement...</p>
        ) : (
          <>
            {/* Photo section */}
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-white shadow-sm">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="Photo" className="h-full w-full object-cover" />
                ) : (
                  <User size={32} className="text-slate-300" />
                )}
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-slate-900">{entityName}</p>
                <p className="text-xs text-slate-500">Photo de profil — JPG, PNG, WEBP (max 5 Mo)</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-outline flex items-center gap-1.5 text-sm"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <span className="text-xs">Upload...</span>
                    ) : (
                      <>
                        <Camera size={13} />
                        {photoUrl ? 'Changer photo' : 'Ajouter photo'}
                      </>
                    )}
                  </button>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); }}
                  />
                </div>
              </div>
            </div>

            {/* Document upload */}
            {canEdit && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Ajouter un document</h3>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="field-stack">
                    <label className="field-label">Type de document</label>
                    {docTypes.length === 0 ? (
                      <p className="text-xs text-amber-600">Aucun type configuré — allez dans Paramètres → Types de docs profil.</p>
                    ) : (
                      <select
                        className="input"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="">-- Choisir --</option>
                        {docTypes.map((t) => (
                          <option key={t.id} value={t.name}>{t.name}{t.description ? ` — ${t.description}` : ''}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      className="btn-outline flex items-center gap-1.5"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || !selectedCategory || docTypes.length === 0}
                    >
                      <Upload size={14} />
                      {uploading ? 'Upload...' : 'Choisir fichier'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadDocument(f); }}
                    />
                  </div>
                </div>
              </div>
            )}

            {entityType === 'student' && documentTypes.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">Générer des documents</h3>
                <div className="flex flex-wrap gap-2">
                  {documentTypes.map((type) => {
                    const hasTemplate = templates.some((template) => template.documentTypeId === type.id);
                    return (
                      <button
                        key={type.id}
                        type="button"
                        className="btn-outline"
                        onClick={() => void generateDocument(type)}
                        disabled={!hasTemplate || generatingTypeId === type.id}
                        title={hasTemplate ? `Générer ${type.name}` : 'Aucun modèle lié à ce type'}
                      >
                        {generatingTypeId === type.id ? 'Génération...' : type.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Documents list */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Documents ({documents.length})
              </h3>
              {documents.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">Aucun document dans ce dossier.</p>
              ) : (
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 px-3 py-2.5">
                      <FileText size={15} className="shrink-0 text-emerald-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                        <div className="flex gap-2 mt-0.5">
                          {doc.category && (
                            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                              {doc.category}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button type="button" className="btn-outline p-1.5" onClick={() => openDoc(doc, 'inline')} title="Lire">
                          <Eye size={13} />
                        </button>
                        <button type="button" className="btn-outline p-1.5" onClick={() => openDoc(doc, 'download')} title="Télécharger">
                          <Download size={13} />
                        </button>
                        {canEdit && (
                          <button type="button" className="btn-outline p-1.5" onClick={() => void deleteDoc(doc)} title="Supprimer">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}
