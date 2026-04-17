'use client';

import { useCallback, useEffect, useState } from 'react';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { PageHeader } from '@/components/admin/page-header';
import { api, fetchCollectionRef } from '@/services/api';
import { toast } from 'sonner';

type Log = { id: number; userId: number; action: string; timestamp: string; user: { fullName: string } };
type User = { id: number; fullName: string };

export default function ActivityLogsPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [logsRes, usersData] = await Promise.all([
      api.get<Log[]>('/activity-logs'),
      fetchCollectionRef<User>('/users'),
    ]);
    setRows(logsRes.data);
    setUsers(usersData);
    setUserId((current) =>
      current || (usersData.length > 0 ? String(usersData[0].id) : ''),
    );
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const onSubmit = async () => {
    if (!userId || !action.trim()) return;
    const payload = {
      userId: Number(userId),
      action: action.trim(),
      metadata: {},
    };

    try {
      if (editingId) {
        await api.patch(`/activity-logs/${editingId}`, payload);
        toast.success("Journal d'activité mis à jour avec succès");
      } else {
        await api.post('/activity-logs', payload);
        toast.success("Journal d'activité créé avec succès");
      }
      setEditingId(null);
      setAction('');
      void load();
    } catch {
      toast.error("Échec de l'enregistrement du journal d'activité");
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm("Supprimer ce journal d'activité ?")) return;
    try {
      await api.delete(`/activity-logs/${id}`);
      toast.success("Journal d'activité supprimé avec succès");
      void load();
    } catch {
      toast.error("Échec de la suppression du journal d'activité");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Journaux d'activité"
        description="Consultez et gérez l'historique des actions effectuées sur la plateforme."
      />

      <div className="surface-card space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {editingId ? "Modifier le journal" : "Nouveau journal"}
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="field-stack">
            <label className="field-label">Utilisateur</label>
            <select className="input" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Sélectionner un utilisateur</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.fullName}</option>
              ))}
            </select>
          </div>
          <div className="field-stack md:col-span-2">
            <label className="field-label">Action</label>
            <input className="input" value={action} onChange={(e) => setAction(e.target.value)} placeholder="ex. Modification du profil étudiant" />
          </div>
          <div className="flex items-end gap-2">
            <ExportDataButton />
            <button className="btn-primary" type="button" onClick={onSubmit}>{editingId ? 'Enregistrer' : 'Créer'}</button>
            {editingId ? (
              <button className="btn-outline" type="button" onClick={() => { setEditingId(null); setAction(''); }}>
                Annuler
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="data-table-wrap">
        <div className="table-scroll">
          <table className="table-base">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Date/Heure</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.user?.fullName ?? 'Système'}</td>
                  <td>{item.action}</td>
                  <td>{new Date(item.timestamp).toLocaleString()}</td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="btn-outline"
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setUserId(String(item.userId));
                          setAction(item.action);
                        }}
                      >
                        Modifier
                      </button>
                      <button className="btn-outline" type="button" onClick={() => onDelete(item.id)}>Supprimer</button>
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
