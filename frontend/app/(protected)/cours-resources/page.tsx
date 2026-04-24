'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eye, FileText, Pencil, Trash2, Upload, X } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { api, getApiErrorMessage, type PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type Department = { id: number; name: string };
type Filiere = { id: number; name: string; code: string; departmentId: number };
type AcademicClass = { id: number; name: string; year: number; filiereId?: number | null };
type CoursAssignment = {
  cours: { id: number; name: string; type: string };
  teacher?: { id: number; firstName: string; lastName: string } | null;
};
type Resource = {
  id: number;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  cours: { id: number; name: string; type: string };
  class: { id: number; name: string; year: number };
  teacher?: { id: number; firstName: string; lastName: string } | null;
  uploadedBy: { fullName: string; role: string };
};

type PendingFile = {
  key: string;
  file: File;
  title: string;
  status: 'pending' | 'uploading' | 'done' | 'skipped' | 'error';
  error?: string;
};

const ACCEPTED = '.pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg';

const formatSize = (size: number) => {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / 1024 / 1024).toFixed(1)} Mo`;
};

export default function CoursResourcesPage() {
  const { user } = useAuth();
  const canUpload = ['admin', 'staff', 'teacher'].includes(user?.role ?? '');
  const isStudent = user?.role === 'student' || user?.role === 'viewer';
  const isAdmin = ['admin', 'staff'].includes(user?.role ?? '');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [assignments, setAssignments] = useState<CoursAssignment[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedFiliereId, setSelectedFiliereId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedCoursId, setSelectedCoursId] = useState('');

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filteredFilieres = useMemo(
    () => (selectedDeptId ? filieres.filter((f) => String(f.departmentId) === selectedDeptId) : filieres),
    [filieres, selectedDeptId],
  );

  const selectedAssignment = useMemo(
    () => assignments.find((item) => String(item.cours.id) === selectedCoursId),
    [assignments, selectedCoursId],
  );

  const loadResources = useCallback(async (classId?: string, coursId?: string) => {
    const res = await api.get<Resource[]>('/cours-resources', {
      params: { classId: classId || undefined, coursId: coursId || undefined },
    });
    setResources(res.data);
  }, []);

  const loadAssignments = useCallback(async (classId: string) => {
    if (!classId) { setAssignments([]); setSelectedCoursId(''); return; }
    const res = await api.get<CoursAssignment[]>(`/classes/${classId}/cours`);
    setAssignments(res.data);
    setSelectedCoursId((cur) => cur || (res.data[0] ? String(res.data[0].cours.id) : ''));
  }, []);

  const loadClasses = useCallback(async (deptId?: string, filiereId?: string) => {
    const params: Record<string, unknown> = { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' };
    if (filiereId) params.filiereId = filiereId;
    else if (deptId) params.departmentId = deptId;
    const res = await api.get<PaginatedResponse<AcademicClass>>('/classes', { params });
    setClasses(res.data.data);
    setSelectedClassId('');
    setSelectedCoursId('');
    setAssignments([]);
    setResources([]);
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      if (isStudent) {
        await loadResources();
        return;
      }
      const [deptsRes, filieresRes] = await Promise.all([
        api.get<PaginatedResponse<Department>>('/departments', { params: { page: 1, limit: 200 } }),
        api.get<PaginatedResponse<Filiere>>('/filieres', { params: { page: 1, limit: 500 } }),
      ]);
      setDepartments(deptsRes.data.data);
      setFilieres(filieresRes.data.data);
      await loadClasses();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de charger les ressources'));
    } finally {
      setLoading(false);
    }
  }, [isStudent, loadClasses, loadResources]);

  useEffect(() => { void loadInitial(); }, [loadInitial]);

  useEffect(() => {
    if (isStudent || !selectedClassId) return;
    const run = async () => {
      try {
        await loadAssignments(selectedClassId);
        await loadResources(selectedClassId, selectedCoursId || undefined);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les cours'));
      }
    };
    void run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

  useEffect(() => {
    if (isStudent || !selectedClassId) return;
    void loadResources(selectedClassId, selectedCoursId || undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoursId]);

  const onDeptChange = async (deptId: string) => {
    setSelectedDeptId(deptId);
    setSelectedFiliereId('');
    await loadClasses(deptId || undefined, undefined);
  };

  const onFiliereChange = async (filiereId: string) => {
    setSelectedFiliereId(filiereId);
    await loadClasses(selectedDeptId || undefined, filiereId || undefined);
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newEntries: PendingFile[] = [];
    for (const f of Array.from(fileList)) {
      const key = `${f.name}-${f.size}-${f.lastModified}`;
      if (pendingFiles.some((p) => p.key === key)) continue;
      newEntries.push({ key, file: f, title: f.name.replace(/\.[^.]+$/, ''), status: 'pending' });
    }
    setPendingFiles((prev) => [...prev, ...newEntries]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (key: string) => setPendingFiles((prev) => prev.filter((p) => p.key !== key));

  const uploadAll = async () => {
    if (!selectedClassId || !selectedCoursId) { toast.error('Sélectionnez classe et cours'); return; }
    const toUpload = pendingFiles.filter((f) => f.status === 'pending');
    if (!toUpload.length) { toast.error('Aucun fichier à uploader'); return; }

    setUploading(true);
    let doneCount = 0;
    let skipCount = 0;

    for (const item of toUpload) {
      setPendingFiles((prev) => prev.map((p) => p.key === item.key ? { ...p, status: 'uploading' } : p));

      // Check duplicate: same fileName in same class+cours
      const duplicate = resources.find(
        (r) => r.fileName === item.file.name && String(r.class.id) === selectedClassId && String(r.cours.id) === selectedCoursId,
      );

      if (duplicate) {
        setPendingFiles((prev) =>
          prev.map((p) => p.key === item.key ? { ...p, status: 'skipped', error: `Déjà uploadé: "${duplicate.title}"` } : p),
        );
        skipCount++;
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('classId', selectedClassId);
        formData.append('coursId', selectedCoursId);
        formData.append('title', item.title.trim() || item.file.name);
        if (selectedAssignment?.teacher?.id) formData.append('teacherId', String(selectedAssignment.teacher.id));
        formData.append('file', item.file);

        await api.post('/cours-resources/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setPendingFiles((prev) => prev.map((p) => p.key === item.key ? { ...p, status: 'done' } : p));
        doneCount++;
      } catch (err) {
        const msg = getApiErrorMessage(err, 'Erreur upload');
        setPendingFiles((prev) => prev.map((p) => p.key === item.key ? { ...p, status: 'error', error: msg } : p));
      }
    }

    setUploading(false);
    if (doneCount) {
      toast.success(`${doneCount} fichier${doneCount > 1 ? 's' : ''} uploadé${doneCount > 1 ? 's' : ''}`);
      await loadResources(selectedClassId, selectedCoursId || undefined);
    }
    if (skipCount) toast.info(`${skipCount} fichier${skipCount > 1 ? 's' : ''} déjà présent${skipCount > 1 ? 's' : ''}, ignoré${skipCount > 1 ? 's' : ''}`);
    // Remove done/skipped files from queue
    setPendingFiles((prev) => prev.filter((p) => p.status === 'pending' || p.status === 'error'));
  };

  const openFile = async (resource: Resource, mode: 'inline' | 'download') => {
    try {
      const res = await api.get<Blob>(`/cours-resources/${resource.id}/${mode === 'inline' ? 'inline' : 'download'}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: resource.mimeType });
      const url = URL.createObjectURL(blob);
      if (mode === 'inline') { window.open(url, '_blank'); return; }
      const a = document.createElement('a');
      a.href = url; a.download = resource.fileName; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Ouverture impossible'));
    }
  };

  const startEdit = (resource: Resource) => { setEditingResource(resource); setEditingTitle(resource.title); };

  const saveResource = async () => {
    if (!editingResource) return;
    try {
      await api.patch(`/cours-resources/${editingResource.id}`, { title: editingTitle.trim() || editingResource.fileName });
      toast.success('Ressource modifiee');
      setEditingResource(null);
      await loadResources(selectedClassId, selectedCoursId || undefined);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Modification impossible'));
    }
  };

  const deleteResource = async (resource: Resource) => {
    if (!window.confirm(`Supprimer ${resource.title} ?`)) return;
    try {
      await api.delete(`/cours-resources/${resource.id}`);
      toast.success('Ressource supprimee');
      await loadResources(selectedClassId, selectedCoursId || undefined);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Suppression impossible'));
    }
  };

  const statusBadge = (s: PendingFile['status']) => {
    if (s === 'uploading') return <span className="text-xs text-blue-600">Upload...</span>;
    if (s === 'done') return <span className="text-xs text-emerald-600">✓ Done</span>;
    if (s === 'skipped') return <span className="text-xs text-amber-600">Ignoré</span>;
    if (s === 'error') return <span className="text-xs text-red-600">Erreur</span>;
    return null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cours"
        title="Ressources de cours"
        description="Professeurs uploadent PDF, DOCX, PPTX et images par cours/classe. Etudiants lisent ou telechargent."
      />

      {loading ? (
        <div className="surface-card empty-note">Chargement...</div>
      ) : (
        <>
          {!isStudent && (
            <section className="surface-card space-y-4">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Filtrer par classe et cours</h2>
                  <p className="panel-copy">Dept → Filière → Classe → Cours</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="field-stack">
                  <label className="field-label">Département</label>
                  <select className="input" value={selectedDeptId} onChange={(e) => void onDeptChange(e.target.value)}>
                    <option value="">Tous</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field-stack">
                  <label className="field-label">Filière</label>
                  <select className="input" value={selectedFiliereId} onChange={(e) => void onFiliereChange(e.target.value)}>
                    <option value="">Toutes</option>
                    {filteredFilieres.map((f) => (
                      <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                    ))}
                  </select>
                </div>
                <div className="field-stack">
                  <label className="field-label">Classe</label>
                  <select
                    className="input"
                    value={selectedClassId}
                    onChange={(e) => { setSelectedClassId(e.target.value); setSelectedCoursId(''); }}
                  >
                    <option value="">-- choisir --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} (A{c.year})</option>
                    ))}
                  </select>
                </div>
                <div className="field-stack">
                  <label className="field-label">Cours</label>
                  <select className="input" value={selectedCoursId} onChange={(e) => setSelectedCoursId(e.target.value)} disabled={!selectedClassId}>
                    <option value="">Tous les cours</option>
                    {assignments.map((item) => (
                      <option key={`${item.cours.id}-${item.teacher?.id ?? 'none'}`} value={item.cours.id}>
                        {item.cours.name}{item.teacher ? ` — ${item.teacher.firstName} ${item.teacher.lastName}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          )}

          {canUpload && selectedClassId && selectedCoursId && (
            <section className="surface-card space-y-4">
              <div>
                <h2 className="panel-title">Ajouter fichiers cours</h2>
                <p className="panel-copy">PDF, DOCX, PPTX, PNG, JPG. Sélectionnez un ou plusieurs fichiers.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload size={14} className="mr-1 inline" />
                  Choisir fichiers
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
                {pendingFiles.some((f) => f.status === 'pending') && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={uploadAll}
                    disabled={uploading}
                  >
                    {uploading ? 'Upload...' : `Uploader ${pendingFiles.filter((f) => f.status === 'pending').length} fichier(s)`}
                  </button>
                )}
              </div>

              {pendingFiles.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-100">
                  {pendingFiles.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 px-3 py-2">
                      <FileText size={15} className="shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <input
                          className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none focus:underline"
                          value={item.title}
                          onChange={(e) =>
                            setPendingFiles((prev) =>
                              prev.map((p) => p.key === item.key ? { ...p, title: e.target.value } : p)
                            )
                          }
                          disabled={item.status !== 'pending'}
                          placeholder="Titre..."
                        />
                        <p className="text-xs text-slate-400">{item.file.name} · {formatSize(item.file.size)}</p>
                        {item.error && <p className="text-xs text-amber-600">{item.error}</p>}
                      </div>
                      <div className="shrink-0">{statusBadge(item.status)}</div>
                      {(item.status === 'pending' || item.status === 'error') && (
                        <button type="button" onClick={() => removeFile(item.key)} className="shrink-0 text-slate-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {canUpload && (!selectedClassId || !selectedCoursId) && (
            <section className="surface-card">
              <p className="text-sm text-slate-500">Sélectionnez une classe et un cours pour uploader des fichiers.</p>
            </section>
          )}

          <section className="surface-card space-y-4">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Fichiers disponibles</h2>
                <p className="panel-copy">{resources.length} ressource{resources.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {resources.length === 0 ? (
              <EmptyState title="Aucune ressource" description="Les fichiers de cours apparaitront ici." />
            ) : (
              <div className="data-table-wrap">
                <div className="table-scroll">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Fichier</th>
                        <th>Cours</th>
                        <th>Classe</th>
                        <th>Ajoute par</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map((resource) => (
                        <tr key={resource.id}>
                          <td>
                            <div className="flex items-center gap-2">
                              <FileText size={16} className="text-emerald-700" />
                              <div>
                                <p className="font-medium text-slate-950">{resource.title}</p>
                                <p className="text-xs text-slate-400">{resource.fileName} · {formatSize(resource.size)}</p>
                              </div>
                            </div>
                          </td>
                          <td>{resource.cours.name}</td>
                          <td>{resource.class.name}</td>
                          <td>
                            {resource.uploadedBy.fullName}
                            <p className="text-xs text-slate-400">{new Date(resource.createdAt).toLocaleString('fr-FR')}</p>
                          </td>
                          <td>
                            <div className="flex flex-wrap gap-2">
                              <button className="btn-outline" type="button" onClick={() => openFile(resource, 'inline')}>
                                <Eye size={14} className="mr-1 inline" />Lire
                              </button>
                              <button className="btn-outline" type="button" onClick={() => openFile(resource, 'download')}>
                                <Download size={14} className="mr-1 inline" />Telecharger
                              </button>
                              {canUpload && (
                                <>
                                  <button className="btn-outline" type="button" onClick={() => startEdit(resource)}>
                                    <Pencil size={14} className="mr-1 inline" />Modifier
                                  </button>
                                  <button className="btn-outline" type="button" onClick={() => deleteResource(resource)}>
                                    <Trash2 size={14} className="mr-1 inline" />Supprimer
                                  </button>
                                </>
                              )}
                            </div>
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
      )}

      <ModalShell
        open={Boolean(editingResource)}
        title="Modifier ressource"
        description="Changer le titre affiche dans la liste."
        onClose={() => setEditingResource(null)}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={saveResource}>Enregistrer</button>
            <button className="btn-outline" type="button" onClick={() => setEditingResource(null)}>Annuler</button>
          </>
        }
      >
        <div className="field-stack">
          <label className="field-label">Titre</label>
          <input className="input" value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} />
        </div>
      </ModalShell>
    </div>
  );
}
