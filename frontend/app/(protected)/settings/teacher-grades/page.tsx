'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';

type TeacherGrade = { id: number; name: string; _count?: { teachers: number } };

const emptyForm = { id: undefined as number | undefined, name: '' };

export default function TeacherGradesSettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [grades, setGrades] = useState<TeacherGrade[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadGrades = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<TeacherGrade[]>('/teachers/grades');
      setGrades(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de charger les grades'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadGrades(); }, [loadGrades]);

  const editGrade = (grade: TeacherGrade) => {
    setForm({ id: grade.id, name: grade.name });
    setOpen(true);
  };

  const resetForm = () => { setForm(emptyForm); setOpen(true); };

  const saveGrade = async () => {
    if (!isAdmin) return;
    if (!form.name.trim()) { toast.error('Nom requis'); return; }
    setSaving(true);
    try {
      if (form.id) await api.patch(`/teachers/grades/${form.id}`, { name: form.name.trim() });
      else await api.post('/teachers/grades', { name: form.name.trim() });
      toast.success('Grade enregistré');
      setForm(emptyForm);
      await loadGrades();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Enregistrement impossible'));
    } finally {
      setSaving(false);
    }
  };

  const deleteGrade = async (grade: TeacherGrade) => {
    if (!isAdmin) return;
    if (!window.confirm(`Supprimer "${grade.name}" ?`)) return;
    try {
      await api.delete(`/teachers/grades/${grade.id}`);
      toast.success('Grade supprimé');
      await loadGrades();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Suppression impossible'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Paramètres"
        title="Grades enseignants"
        description="Définissez les grades académiques : Professeur Habilité, Assistant, Doctorant, etc."
      />

      {!isAdmin ? (
        <section className="surface-card">
          <EmptyState title="Accès admin requis" description="Seul l'admin peut modifier les grades enseignants." />
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
                {form.id ? 'Modifier grade' : 'Ajouter grade'}
              </span>
              <ChevronDown className={cn('text-slate-400 transition-transform duration-300', !open && '-rotate-90')} size={17} />
            </button>

            <div className={cn('overflow-hidden transition-all duration-300 ease-in-out', open ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0')}>
              <div className="grid gap-3 pt-1 md:grid-cols-[1fr_auto]">
                <div className="field-stack">
                  <label className="field-label">Nom du grade</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                    placeholder="PH, PA, Doctorant, Assistant..."
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button className="btn-primary" type="button" onClick={saveGrade} disabled={saving}>
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
                <h2 className="panel-title">Liste des grades</h2>
                <p className="panel-copy">{grades.length} grade{grades.length !== 1 ? 's' : ''} configuré{grades.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            {loading ? (
              <div className="empty-note">Chargement...</div>
            ) : grades.length === 0 ? (
              <EmptyState title="Aucun grade" description="Ajoutez le premier grade enseignant." />
            ) : (
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Grade</th>
                      <th>Enseignants</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.map((grade) => (
                      <tr key={grade.id}>
                        <td className="font-semibold text-slate-950">{grade.name}</td>
                        <td>{grade._count?.teachers ?? 0}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button className="btn-outline" type="button" onClick={() => editGrade(grade)}>
                              <Pencil size={14} className="mr-1 inline" />Modifier
                            </button>
                            <button className="btn-outline" type="button" onClick={() => deleteGrade(grade)}>
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
