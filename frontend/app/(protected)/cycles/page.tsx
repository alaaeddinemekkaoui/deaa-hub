'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';

type Cycle = {
  id: number;
  name: string;
  code?: string | null;
  createdAt: string;
  _count: { classes: number };
};

export default function CyclesPage() {
  const [rows, setRows] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const filtered = rows.filter(
    (r) =>
      !search.trim() ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.code ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const resetForm = () => { setEditingId(null); setName(''); setCode(''); };
  const closeModal = () => { setIsModalOpen(false); resetForm(); };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<Cycle[]>('/cycles');
        setRows(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les cycles'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [refreshKey]);

  const onSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/cycles/${editingId}`, { name: name.trim(), code: code.trim() || null });
        toast.success('Cycle mis à jour');
      } else {
        await api.post('/cycles', { name: name.trim(), code: code.trim() || null });
        toast.success('Cycle créé');
      }
      closeModal();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de l\'enregistrement'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer ce cycle ?')) return;
    try {
      await api.delete(`/cycles/${id}`);
      toast.success('Cycle supprimé');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la suppression'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Structure Organisationnelle"
        title="Cycles académiques"
        description="Gérez les cycles d'enseignement (Ingénieur, Master, DUT, etc.) disponibles pour l'affectation aux classes."
      />

      <section className="flex justify-end gap-2">
        <button className="btn-primary flex items-center gap-2" type="button" onClick={() => { resetForm(); setIsModalOpen(true); }}>
          <RefreshCw size={14} />
          Ajouter un cycle
        </button>
      </section>

      <section className="surface-card space-y-4">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Registre des cycles</h2>
            <p className="panel-copy">{rows.length} cycle{rows.length !== 1 ? 's' : ''} enregistré{rows.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="toolbar-shell">
          <div className="relative max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-note">Chargement...</div>
        ) : filtered.length === 0 ? (
          <EmptyState title="Aucun cycle trouvé" description="Créez votre premier cycle académique." />
        ) : (
          <div className="data-table-wrap">
            <div className="table-scroll">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Code</th>
                    <th>Classes</th>
                    <th>Créé le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium text-slate-950">{c.name}</td>
                      <td>{c.code ? <span className="status-chip status-chip--muted">{c.code}</span> : '—'}</td>
                      <td>{c._count.classes}</td>
                      <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => {
                              setEditingId(c.id);
                              setName(c.name);
                              setCode(c.code ?? '');
                              setIsModalOpen(true);
                            }}
                          >
                            Modifier
                          </button>
                          <button type="button" className="btn-outline" onClick={() => onDelete(c.id)}
                            disabled={c._count.classes > 0}
                            title={c._count.classes > 0 ? 'Cycle utilisé par des classes' : undefined}
                          >
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
        )}
      </section>

      <ModalShell
        open={isModalOpen}
        title={editingId ? 'Modifier le cycle' : 'Ajouter un cycle'}
        description="Un cycle représente un niveau d'enseignement (ex. Ingénieur, Master, DUT)."
        onClose={closeModal}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onSubmit} disabled={saving || !name.trim()}>
              {saving ? 'Enregistrement...' : editingId ? 'Enregistrer' : 'Créer'}
            </button>
            <button className="btn-outline" type="button" onClick={closeModal}>Annuler</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="field-stack">
            <label className="field-label">Nom <span className="text-red-500">*</span></label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Ingénieur, Master, Vétérinaire" />
          </div>
          <div className="field-stack">
            <label className="field-label">Code</label>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ex. ING, MST, INGE" maxLength={20} />
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
