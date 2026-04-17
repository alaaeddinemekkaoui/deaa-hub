'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Check, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';

type AcademicYear = {
  id: number;
  label: string;
  isCurrent: boolean;
  createdAt: string;
};

export default function AcademicYearsPage() {
  const [rows, setRows] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [label, setLabel] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<AcademicYear[]>('/academic-years');
        setRows(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les années académiques'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [refreshKey]);

  const resetForm = () => {
    setEditingId(null);
    setLabel('');
    setIsCurrent(false);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (row: AcademicYear) => {
    setEditingId(row.id);
    setLabel(row.label);
    setIsCurrent(row.isCurrent);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const onSubmit = async () => {
    if (!label.trim()) {
      toast.error('Le libellé est requis (ex: 2025/2026)');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/academic-years/${editingId}`, { label: label.trim(), isCurrent });
        toast.success('Année académique mise à jour');
      } else {
        await api.post('/academic-years', { label: label.trim(), isCurrent });
        toast.success('Année académique créée');
      }
      closeModal();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number, yearLabel: string) => {
    if (!window.confirm(`Supprimer l'année "${yearLabel}" ?`)) return;
    try {
      await api.delete(`/academic-years/${id}`);
      toast.success('Année supprimée');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de supprimer'));
    }
  };

  const onSetCurrent = async (row: AcademicYear) => {
    if (row.isCurrent) return;
    try {
      await api.patch(`/academic-years/${row.id}`, { isCurrent: true });
      toast.success(`"${row.label}" est maintenant l'année en cours`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de définir comme courante'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Paramètres"
        title="Années académiques"
        description="Gérez les années académiques et définissez l'année en cours utilisée par défaut dans les épreuves et délibérations."
      />

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Liste des années</h2>
            <p className="panel-copy">
              L&apos;année marquée <span className="font-semibold text-emerald-700">En cours</span> est
              sélectionnée par défaut dans les formulaires.
            </p>
          </div>
          <button type="button" className="btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={14} />
            Nouvelle année
          </button>
        </div>

        {loading ? (
          <div className="empty-note">Chargement...</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Aucune année académique"
            description="Créez votre première année académique pour commencer à saisir des notes."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4">Libellé</th>
                  <th className="pb-3 pr-4">Statut</th>
                  <th className="pb-3 pr-4">Créée le</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="group">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <CalendarClock size={14} className="shrink-0 text-slate-400" />
                        <span className="font-semibold text-slate-900">{row.label}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      {row.isCurrent ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <Star size={10} />
                          En cours
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600"
                          onClick={() => onSetCurrent(row)}
                          title="Définir comme année en cours"
                        >
                          <Check size={10} />
                          Définir comme courante
                        </button>
                      )}
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
                          onClick={() => onDelete(row.id, row.label)}
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

      {/* Create / Edit modal */}
      <ModalShell
        open={isModalOpen}
        onClose={closeModal}
        title={editingId ? 'Modifier l\'année académique' : 'Nouvelle année académique'}
      >
        <div className="space-y-4">
          <div className="field-stack">
            <label className="field-label">
              Libellé <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              placeholder="ex: 2025/2026"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            />
            <p className="text-[11px] text-slate-400">Format recommandé : AAAA/AAAA</p>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-emerald-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-emerald-600"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
            />
            <div>
              <p className="text-sm font-medium text-slate-800">Année en cours</p>
              <p className="text-[11px] text-slate-400">
                Sera sélectionnée automatiquement dans les épreuves et délibérations.
                L&apos;ancienne année courante sera automatiquement désactivée.
              </p>
            </div>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={closeModal}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onSubmit}
              disabled={saving || !label.trim()}
            >
              {saving ? 'Enregistrement...' : editingId ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
