'use client';

import { useEffect, useState } from 'react';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { PageHeader } from '@/components/admin/page-header';
import { api } from '@/services/api';
import { toast } from 'sonner';

type Workflow = {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedToId: number;
  studentId?: number | null;
};

type User = { id: number; fullName: string };
type Student = { id: number; fullName: string };

const statusLabel: Record<Workflow['status'], string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminé',
};

export default function WorkflowsPage() {
  const [rows, setRows] = useState<Workflow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Workflow['status']>('pending');
  const [assignedToId, setAssignedToId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = async () => {
    const [workflowsRes, usersRes, studentsRes] = await Promise.all([
      api.get('/workflows'),
      api.get('/users'),
      api.get('/students', { params: { page: 1, limit: 200 } }),
    ]);
    setRows(workflowsRes.data);
    setUsers(usersRes.data);
    setStudents(studentsRes.data.data);
    if (!assignedToId && usersRes.data.length > 0) {
      setAssignedToId(String(usersRes.data[0].id));
    }
  };

  useEffect(() => { queueMicrotask(() => { void load(); }); }, []);

  const badge = (s: Workflow['status']) => {
    if (s === 'completed') return 'status-chip status-chip--ok';
    if (s === 'in_progress') return 'status-chip status-chip--warn';
    return 'status-chip status-chip--muted';
  };

  const onSubmit = async () => {
    if (!title.trim() || !assignedToId) return;
    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      assignedToId: Number(assignedToId),
      studentId: studentId ? Number(studentId) : undefined,
    };
    try {
      if (editingId) {
        await api.patch(`/workflows/${editingId}`, payload);
        toast.success('Workflow mis à jour');
      } else {
        await api.post('/workflows', payload);
        toast.success('Workflow créé');
      }
      setTitle(''); setDescription(''); setStatus('pending'); setStudentId(''); setEditingId(null);
      load();
    } catch { toast.error("Échec de l'enregistrement du workflow"); }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer ce workflow ?')) return;
    try {
      await api.delete(`/workflows/${id}`);
      toast.success('Workflow supprimé');
      load();
    } catch { toast.error('Échec de la suppression'); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suivi des workflows"
        description="Créez et gérez les tâches de suivi de dossiers affectées aux utilisateurs."
      />

      <div className="surface-card space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {editingId ? 'Modifier le workflow' : 'Nouveau workflow'}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="field-stack">
            <label className="field-label">Titre</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field-stack">
            <label className="field-label">Description</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field-stack">
            <label className="field-label">Statut</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Workflow['status'])}>
              <option value="pending">En attente</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminé</option>
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Assigné à</label>
            <select className="input" value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)}>
              <option value="">— sélectionner —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
          <div className="field-stack md:col-span-2">
            <label className="field-label">Étudiant (optionnel)</label>
            <select className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Aucun</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportDataButton />
          <button className="btn-primary" type="button" onClick={onSubmit}>
            {editingId ? 'Enregistrer' : 'Créer'}
          </button>
          {editingId ? (
            <button className="btn-outline" type="button" onClick={() => { setEditingId(null); setTitle(''); setDescription(''); setStatus('pending'); setStudentId(''); }}>
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
                <th>Tâche</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td><span className={badge(item.status)}>{statusLabel[item.status]}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn-outline" type="button" onClick={() => { setEditingId(item.id); setTitle(item.title); setDescription(item.description ?? ''); setStatus(item.status); setAssignedToId(String(item.assignedToId)); setStudentId(item.studentId ? String(item.studentId) : ''); }}>
                        Modifier
                      </button>
                      <button className="btn-outline" type="button" onClick={() => onDelete(item.id)}>
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
    </div>
  );
}
