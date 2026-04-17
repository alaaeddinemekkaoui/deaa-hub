'use client';

import { useEffect, useState } from 'react';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';

type DocType = {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
};

export default function DocumentTypesPage() {
  const [rows, setRows] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<DocType[]>('/document-types');
        setRows(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les types de documents'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [refreshKey]);

  const resetForm = () => { setEditingId(null); setName(''); setDescription(''); };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (row: DocType) => {
    setEditingId(row.id);
    setName(row.name);
    setDescription(row.description ?? '');
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); resetForm(); };

  const onSubmit = async () => {
    if (!name.trim()) { toast.error('Le nom est requis'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/document-types/${editingId}`, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        toast.success('Type mis à jour');
      } else {
        await api.post('/document-types', {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        toast.success('Type créé');
      }
      closeModal();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number, docName: string) => {
    if (!window.confirm(`Supprimer le type "${docName}" ?`)) return;
    try {
      await api.delete(`/document-types/${id}`);
      toast.success('Type supprimé');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de supprimer'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Paramètres"
        title="Types de documents"
        description="Gérez les catégories de documents administratifs utilisées dans les demandes."
      />

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Liste des types</h2>
            <p className="panel-copy">
              Ces types apparaissent lors de la création d&apos;une demande de document.
            </p>
          </div>
          <button type="button" className="btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={14} />
            Nouveau type
          </button>
        </div>

        {loading ? (
          <div className="empty-note">Chargement…</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Aucun type de document"
            description="Créez vos premiers types pour les utiliser dans les demandes."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4">Nom</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Créé le</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="group">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="shrink-0 text-slate-400" />
                        <span className="font-semibold text-slate-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {row.description ?? <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {new Date(row.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => openEdit(row)}
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn text-red-500 hover:bg-red-50"
                          onClick={() => onDelete(row.id, row.name)}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ModalShell
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Modifier le type de document' : 'Nouveau type de document'}
      >
        <div className="space-y-4">
          <div className="field-stack">
            <label className="field-label">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              placeholder="ex: Attestation de scolarité"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            />
          </div>

          <div className="field-stack">
            <label className="field-label">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Description optionnelle…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={closeModal}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onSubmit}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
