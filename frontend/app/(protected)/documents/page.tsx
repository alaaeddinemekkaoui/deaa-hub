'use client';

import { useEffect, useState } from 'react';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { PageHeader } from '@/components/admin/page-header';
import { api } from '@/services/api';
import { toast } from 'sonner';

type DocumentItem = {
  id: number;
  name: string;
  mimeType: string;
  studentId?: number | null;
  teacherId?: number | null;
  student?: { fullName: string } | null;
  teacher?: { firstName: string; lastName: string } | null;
};

type Student = { id: number; fullName: string };
type Teacher = { id: number; firstName: string; lastName: string };

export default function DocumentsPage() {
  const [rows, setRows] = useState<DocumentItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [ownerType, setOwnerType] = useState<'student' | 'teacher'>('student');
  const [studentId, setStudentId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editOwnerType, setEditOwnerType] = useState<'student' | 'teacher'>('student');

  const load = async () => {
    const [docsRes, studentsRes, teachersRes] = await Promise.all([
      api.get('/documents'),
      api.get('/students', { params: { page: 1, limit: 200 } }),
      api.get('/teachers', { params: { page: 1, limit: 200 } }),
    ]);
    setRows(docsRes.data);
    setStudents(studentsRes.data.data);
    setTeachers(teachersRes.data.data);
    if (!studentId && studentsRes.data.data.length > 0) {
      setStudentId(String(studentsRes.data.data[0].id));
    }
    if (!teacherId && teachersRes.data.data.length > 0) {
      setTeacherId(String(teachersRes.data.data[0].id));
    }
  };

  useEffect(() => {
    queueMicrotask(() => { void load(); });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des documents"
        description="Téléversez et gérez les documents associés aux étudiants."
      />

      <div className="surface-card space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Téléverser un document</p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="field-stack">
            <label className="field-label">Type de propriétaire</label>
            <select className="input" value={ownerType} onChange={(e) => setOwnerType(e.target.value as 'student' | 'teacher')}>
              <option value="student">Étudiant</option>
              <option value="teacher">Enseignant</option>
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">{ownerType === 'student' ? 'Étudiant' : 'Enseignant'}</label>
            {ownerType === 'student' ? (
              <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">— sélectionner —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            ) : (
              <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">— sélectionner —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                ))}
              </select>
            )}
          </div>
          <div className="field-stack">
            <label className="field-label">Fichier</label>
            <input className="input" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportDataButton />
          <button
            className="btn-primary"
            type="button"
            onClick={async () => {
              if (!file) return;
              const formData = new FormData();
              if (ownerType === 'student') {
                if (!studentId) return;
                formData.append('studentId', studentId);
              } else {
                if (!teacherId) return;
                formData.append('teacherId', teacherId);
              }
              formData.append('file', file);
              try {
                await api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                setStatus('Téléversement réussi');
                toast.success('Document téléversé avec succès');
                setFile(null);
                load();
              } catch {
                toast.error('Échec du téléversement');
              }
            }}
          >
            Téléverser
          </button>
        </div>
        {status ? <p className="text-sm text-primary">{status}</p> : null}
      </div>

      <div className="data-table-wrap">
        <div className="table-scroll">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Propriétaire</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.name}</td>
                  <td>{doc.mimeType}</td>
                  <td>
                    {doc.student
                      ? `Étudiant · ${doc.student.fullName}`
                      : doc.teacher
                        ? `Enseignant · ${doc.teacher.firstName} ${doc.teacher.lastName}`
                        : '—'}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="btn-outline"
                        type="button"
                        onClick={() => {
                          setEditingId(doc.id);
                          setEditName(doc.name);
                          setEditOwnerType(doc.teacherId ? 'teacher' : 'student');
                        }}
                      >
                        Modifier
                      </button>
                      <button className="btn-outline" type="button" onClick={async () => {
                        if (!window.confirm('Supprimer ce document ?')) return;
                        try {
                          await api.delete(`/documents/${doc.id}`);
                          toast.success('Document supprimé');
                          load();
                        } catch { toast.error('Échec de la suppression'); }
                      }}>
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

      {editingId ? (
        <div className="surface-card space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Modifier le document</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="field-stack">
              <label className="field-label">Nom</label>
              <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="field-stack">
              <label className="field-label">Type</label>
              <select className="input" value={editOwnerType} onChange={(e) => setEditOwnerType(e.target.value as 'student' | 'teacher')}>
                <option value="student">Étudiant</option>
                <option value="teacher">Enseignant</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" type="button" onClick={async () => {
              try {
                await api.patch(`/documents/${editingId}`, { name: editName });
                toast.success('Document mis à jour');
                setEditingId(null); setEditName('');
                load();
              } catch { toast.error('Échec de la mise à jour'); }
            }}>
              Enregistrer
            </button>
            <button className="btn-outline" type="button" onClick={() => setEditingId(null)}>Annuler</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
