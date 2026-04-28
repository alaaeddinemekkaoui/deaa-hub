'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';

type ProfileDocumentType = { id: number; name: string; description?: string | null };

const emptyForm = { id: undefined as number | undefined, name: '', description: '' };

export default function ProfileDocumentTypesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';

  const [types, setTypes] = useState<ProfileDocumentType[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTypes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ProfileDocumentType[]>('/profile-document-types');
      setTypes(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de charger les types'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadTypes(); }, [loadTypes]);

  const editType = (t: ProfileDocumentType) => {
    setForm({ id: t.id, name: t.name, description: t.description ?? '' });
    setOpen(true);
  };

  const resetForm = () => { setForm(emptyForm); setOpen(true); };

  const saveType = async () => {
    if (!isAdmin) return;
    if (!form.name.trim()) { toast.error('Nom requis'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() || undefined };
      if (form.id) await api.patch(`/profile-document-types/${form.id}`, payload);
      else await api.post('/profile-document-types', payload);
      toast.success('Type enregistré');
      setForm(emptyForm);
      await loadTypes();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Enregistrement impossible'));
    } finally {
      setSaving(false);
    }
  };

  const deleteType = async (t: ProfileDocumentType) => {
    if (!isAdmin) return;
    if (!window.confirm(`Supprimer "${t.name}" ?`)) return;
    try {
      await api.delete(`/profile-document-types/${t.id}`);
      toast.success('Type supprimé');
      await loadTypes();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Suppression impossible'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Paramètres"
        title="Types de documents profil"
        description="Configurez les types de fichiers acceptés pour les dossiers étudiants et enseignants : CIN, acte de naissance, photo, relevé de notes, etc."
      />

      {!isAdmin ? (
        <section className="surface-card">
          <EmptyState title="Accès admin requis" description="Seul l'admin ou le personnel peut modifier les types de documents." />
        </section>
      ) : (
        <>
          <section className="surface-card space-y-4">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-200"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="flex items-center gap-2 font-semibold text-slate-950">
                {form.id ? <Pencil size={17} /> : <Plus size={17} />}
                {form.id ? 'Modifier type' : 'Ajouter type'}
              </span>
              <ChevronDown className={cn('text-slate-400 transition-transform duration-300', !open && '-rotate-90')} size={17} />
            </button>

            <div className={cn('overflow-hidden transition-all duration-300 ease-in-out', open ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0')}>
              <div className="grid gap-3 pt-1">
                <div className="field-stack">
                  <label className="field-label">Nom du type *</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                    placeholder="CIN, Acte de naissance, Photo de profil, Relevé de notes..."
                  />
                </div>
                <div className="field-stack">
                  <label className="field-label">Description (optionnel)</label>
                  <input
                    className="input"
                    value={form.description}
                    onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                    placeholder="Précisions sur le document attendu..."
                  />
                </div>
                <div className="flex gap-2">
                  <button className="btn-primary" type="button" onClick={saveType} disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  {form.id && <button className="btn-outline" type="button" onClick={resetForm}>Nouveau</button>}
                </div>
              </div>
            </div>
          </section>

          <section className="surface-card space-y-4">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Types configurés</h2>
                <p className="panel-copy">{types.length} type{types.length !== 1 ? 's' : ''} de document{types.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {loading ? (
              <div className="empty-note">Chargement...</div>
            ) : types.length === 0 ? (
              <EmptyState title="Aucun type configuré" description="Ajoutez des types de documents comme CIN, photo de profil, acte de naissance, etc." />
            ) : (
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Nom</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((t) => (
                      <tr key={t.id}>
                        <td className="font-semibold text-slate-950">{t.name}</td>
                        <td className="text-slate-500">{t.description ?? '—'}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button className="btn-outline" type="button" onClick={() => editType(t)}>
                              <Pencil size={14} className="mr-1 inline" />Modifier
                            </button>
                            <button className="btn-outline" type="button" onClick={() => deleteType(t)}>
                              <Trash2 size={14} className="mr-1 inline" />Supprimer
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
        </>
      )}
    </div>
  );
}
