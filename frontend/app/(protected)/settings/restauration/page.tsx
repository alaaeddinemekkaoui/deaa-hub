'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Pencil, Plus, Trash2, Utensils } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';

type Meal = {
  id: number;
  name: string;
  price: number;
  active: boolean;
  serviceStartTime?: string | null;
  serviceEndTime?: string | null;
};

const emptyForm = {
  id: undefined as number | undefined,
  name: '',
  price: '',
  active: true,
  serviceStartTime: '',
  serviceEndTime: '',
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(value || 0);

export default function RestaurationSettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [meals, setMeals] = useState<Meal[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadMeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Meal[]>('/restauration/meals', { params: { includeInactive: true } });
      setMeals(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de charger les repas'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeals();
  }, [loadMeals]);

  const editMeal = (meal: Meal) => {
    setForm({
      id: meal.id,
      name: meal.name,
      price: String(meal.price),
      active: meal.active,
      serviceStartTime: meal.serviceStartTime ?? '',
      serviceEndTime: meal.serviceEndTime ?? '',
    });
    setOpen(true);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const saveMeal = async () => {
    if (!isAdmin) return;
    if (!form.name.trim() || form.price === '') {
      toast.error('Nom et prix requis');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        active: form.active,
        serviceStartTime: form.serviceStartTime || null,
        serviceEndTime: form.serviceEndTime || null,
      };
      if (form.id) await api.patch(`/restauration/meals/${form.id}`, payload);
      else await api.post('/restauration/meals', payload);
      toast.success('Repas enregistre');
      setForm(emptyForm);
      await loadMeals();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Enregistrement impossible'));
    } finally {
      setSaving(false);
    }
  };

  const deleteMeal = async (meal: Meal) => {
    if (!isAdmin) return;
    if (!window.confirm(`Supprimer ${meal.name} ?`)) return;
    try {
      await api.delete(`/restauration/meals/${meal.id}`);
      toast.success('Repas supprime');
      await loadMeals();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Suppression impossible'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Parametres"
        title="Repas restauration"
        description="Admin cree les repas, fixe les prix et active ce qui apparait dans la grille de reservation."
      />

      {!isAdmin ? (
        <section className="surface-card">
          <EmptyState title="Acces admin requis" description="Seul admin peut modifier les repas." />
        </section>
      ) : (
        <>
          <section className="surface-card space-y-4">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-emerald-200"
              onClick={() => setOpen((value) => !value)}
            >
              <span className="flex items-center gap-2 font-semibold text-slate-950">
                {form.id ? <Pencil size={17} /> : <Plus size={17} />}
                {form.id ? 'Modifier repas' : 'Ajouter repas'}
              </span>
              <ChevronDown className={cn('text-slate-400 transition-transform duration-300', !open && '-rotate-90')} size={17} />
            </button>

            <div className={cn('overflow-hidden transition-all duration-300 ease-in-out', open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0')}>
              <div className="grid gap-3 pt-1 md:grid-cols-[1fr_150px_130px_130px_120px_auto]">
                <div className="field-stack">
                  <label className="field-label">Nom</label>
                  <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Petit dej, Dejeuner, Dinner..." />
                </div>
                <div className="field-stack">
                  <label className="field-label">Prix</label>
                  <input className="input" type="number" min="0" step="0.5" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} />
                </div>
                <div className="field-stack">
                  <label className="field-label">Début service</label>
                  <input className="input" type="time" value={form.serviceStartTime} onChange={(event) => setForm((current) => ({ ...current, serviceStartTime: event.target.value }))} />
                </div>
                <div className="field-stack">
                  <label className="field-label">Fin service</label>
                  <input className="input" type="time" value={form.serviceEndTime} onChange={(event) => setForm((current) => ({ ...current, serviceEndTime: event.target.value }))} />
                </div>
                <label className="mt-7 flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />
                  Actif
                </label>
                <div className="flex items-end gap-2">
                  <button className="btn-primary" type="button" onClick={saveMeal} disabled={saving}>
                    {saving ? 'Save...' : 'Save'}
                  </button>
                  {form.id && <button className="btn-outline" type="button" onClick={resetForm}>Nouveau</button>}
                </div>
              </div>
            </div>
          </section>

          <section className="surface-card space-y-4">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Liste repas</h2>
                <p className="panel-copy">{meals.length} repas configure{meals.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {loading ? (
              <div className="empty-note">Chargement...</div>
            ) : meals.length === 0 ? (
              <EmptyState title="Aucun repas" description="Ajoutez le premier repas pour ouvrir la reservation." />
            ) : (
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Repas</th>
                      <th>Prix</th>
                      <th>Intervalle</th>
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meals.map((meal) => (
                      <tr key={meal.id}>
                        <td>
                          <span className="inline-flex items-center gap-2 font-semibold text-slate-950">
                            <Utensils size={15} className="text-emerald-700" />
                            {meal.name}
                          </span>
                        </td>
                        <td>{formatMoney(meal.price)}</td>
                        <td>
                          {meal.serviceStartTime && meal.serviceEndTime
                            ? `${meal.serviceStartTime} - ${meal.serviceEndTime}`
                            : 'Non défini'}
                        </td>
                        <td>
                          <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', meal.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                            {meal.active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button className="btn-outline" type="button" onClick={() => editMeal(meal)}>
                              <Pencil size={14} className="mr-1 inline" />
                              Modifier
                            </button>
                            <button className="btn-outline" type="button" onClick={() => deleteMeal(meal)}>
                              <Trash2 size={14} className="mr-1 inline" />
                              Supprimer
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
