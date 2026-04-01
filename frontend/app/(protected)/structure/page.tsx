'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Building2, ChevronDown, ChevronRight, GraduationCap, Layers, Plus, Search } from 'lucide-react';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Department = { id: number; name: string; _count?: { filieres: number } };
type Filiere = { id: number; name: string; code: string; departmentId: number; filiereType?: string | null; _count?: { options: number; classes: number } };
type Option = { id: number; name: string; code?: string | null; filiereId: number; _count?: { classes: number; modules: number } };

type TreeNode =
  | { kind: 'dept'; data: Department }
  | { kind: 'filiere'; data: Filiere }
  | { kind: 'option'; data: Option };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StructurePage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [expandedDepts, setExpandedDepts] = useState<Set<number>>(new Set());
  const [expandedFilieres, setExpandedFilieres] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<TreeNode | null>(null);
  const [search, setSearch] = useState('');

  // ── Modals ──
  const [modal, setModal] = useState<'dept' | 'filiere' | 'option' | null>(null);
  const [saving, setSaving] = useState(false);
  const [deptName, setDeptName] = useState('');
  const [filiereName, setFiliereName] = useState('');
  const [filiereCode, setFiliereCode] = useState('');
  const [filiereDeptId, setFiliereDeptId] = useState('');
  const [optName, setOptName] = useState('');
  const [optCode, setOptCode] = useState('');
  const [optFiliereId, setOptFiliereId] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [dRes, fRes, oRes] = await Promise.all([
          api.get<PaginatedResponse<Department>>('/departments', { params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<Filiere>>('/filieres', { params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<Option>>('/options', { params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' } }),
        ]);
        setDepartments(dRes.data.data);
        setFilieres(fRes.data.data);
        setOptions(oRes.data.data);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger la structure'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [refreshKey]);

  const filteredDepts = useMemo(() =>
    search ? departments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())) : departments,
    [departments, search]);

  const filieresForDept = (dId: number) => filieres.filter((f) => f.departmentId === dId);
  const optionsForFiliere = (fId: number) => options.filter((o) => o.filiereId === fId);

  const toggleDept = (id: number) => setExpandedDepts((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFiliere = (id: number) => setExpandedFilieres((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Detail panel data ──
  const detailChildren = useMemo(() => {
    if (!selected) return [];
    if (selected.kind === 'dept') return filieresForDept(selected.data.id);
    if (selected.kind === 'filiere') return optionsForFiliere(selected.data.id);
    return [];
  }, [selected, filieres, options]);

  // ── Stats for selected node ──
  const stats = useMemo(() => {
    if (!selected) return null;
    if (selected.kind === 'dept') {
      const dFilieres = filieresForDept(selected.data.id);
      const dOptions = dFilieres.flatMap((f) => optionsForFiliere(f.id));
      return [
        { label: 'Filières', value: dFilieres.length },
        { label: 'Options', value: dOptions.length },
      ];
    }
    if (selected.kind === 'filiere') {
      const fOptions = optionsForFiliere(selected.data.id);
      return [
        { label: 'Options', value: fOptions.length },
        { label: 'Classes liées', value: selected.data._count?.classes ?? 0 },
      ];
    }
    if (selected.kind === 'option') {
      return [
        { label: 'Classes liées', value: selected.data._count?.classes ?? 0 },
        { label: 'Modules', value: selected.data._count?.modules ?? 0 },
      ];
    }
    return null;
  }, [selected, filieres, options]);

  // ── Save handlers ──
  const saveDept = async () => {
    if (!deptName.trim()) return;
    setSaving(true);
    try {
      await api.post('/departments', { name: deptName.trim() });
      toast.success('Département créé');
      setModal(null); setDeptName(''); setRefreshKey((k) => k + 1);
    } catch (err) { toast.error(getApiErrorMessage(err, 'Erreur')); }
    finally { setSaving(false); }
  };

  const saveFiliere = async () => {
    if (!filiereName.trim() || !filiereCode.trim() || !filiereDeptId) return;
    setSaving(true);
    try {
      await api.post('/filieres', { name: filiereName.trim(), code: filiereCode.trim(), departmentId: Number(filiereDeptId) });
      toast.success('Filière créée');
      setModal(null); setFiliereName(''); setFiliereCode(''); setFiliereDeptId(''); setRefreshKey((k) => k + 1);
    } catch (err) { toast.error(getApiErrorMessage(err, 'Erreur')); }
    finally { setSaving(false); }
  };

  const saveOption = async () => {
    if (!optName.trim() || !optFiliereId) return;
    setSaving(true);
    try {
      await api.post('/options', { name: optName.trim(), code: optCode.trim() || null, filiereId: Number(optFiliereId) });
      toast.success('Option créée');
      setModal(null); setOptName(''); setOptCode(''); setOptFiliereId(''); setRefreshKey((k) => k + 1);
    } catch (err) { toast.error(getApiErrorMessage(err, 'Erreur')); }
    finally { setSaving(false); }
  };

  const deleteNode = async (node: TreeNode) => {
    const label = node.kind === 'dept' ? 'ce département' : node.kind === 'filiere' ? 'cette filière' : 'cette option';
    if (!window.confirm(`Supprimer ${label} ?`)) return;
    try {
      if (node.kind === 'dept') await api.delete(`/departments/${node.data.id}`);
      else if (node.kind === 'filiere') await api.delete(`/filieres/${node.data.id}`);
      else await api.delete(`/options/${node.data.id}`);
      toast.success('Supprimé avec succès');
      if (selected?.data.id === node.data.id) setSelected(null);
      setRefreshKey((k) => k + 1);
    } catch (err) { toast.error(getApiErrorMessage(err, 'Échec de la suppression')); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Structure"
        title="Structure Organisationnelle"
        description="Gérez la hiérarchie Département → Filière → Option de l'établissement."
      />

      {/* Action bar */}
      <section className="flex flex-wrap justify-end gap-2">
        <button className="btn-outline" type="button" onClick={() => { setOptFiliereId(''); setModal('option'); }}>+ Option</button>
        <button className="btn-outline" type="button" onClick={() => { setFiliereDeptId(''); setModal('filiere'); }}>+ Filière</button>
        <button className="btn-primary" type="button" onClick={() => setModal('dept')}>+ Département</button>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr_280px]">
        {/* ── Tree panel ── */}
        <div className="surface-card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9 text-sm" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          {loading ? (
            <div className="empty-note">Chargement...</div>
          ) : (
            <div className="divide-y divide-slate-50 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {filteredDepts.map((dept) => {
                const dFilieres = filieresForDept(dept.id);
                const isExpanded = expandedDepts.has(dept.id);
                const isSelected = selected?.kind === 'dept' && selected.data.id === dept.id;
                return (
                  <div key={dept.id}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 ${isSelected ? 'bg-emerald-50' : ''}`}
                      onClick={() => { setSelected({ kind: 'dept', data: dept }); toggleDept(dept.id); }}
                    >
                      {isExpanded ? <ChevronDown size={14} className="shrink-0 text-slate-400" /> : <ChevronRight size={14} className="shrink-0 text-slate-400" />}
                      <Building2 size={14} className="shrink-0 text-slate-500" />
                      <span className="flex-1 text-sm font-medium text-slate-800">{dept.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{dFilieres.length}</span>
                    </button>
                    {isExpanded && dFilieres.map((fil) => {
                      const fOpts = optionsForFiliere(fil.id);
                      const fExp = expandedFilieres.has(fil.id);
                      const fSel = selected?.kind === 'filiere' && selected.data.id === fil.id;
                      return (
                        <div key={fil.id}>
                          <button
                            type="button"
                            className={`flex w-full items-center gap-2 py-2 pl-10 pr-4 text-left hover:bg-slate-50 ${fSel ? 'bg-emerald-50' : ''}`}
                            onClick={() => { setSelected({ kind: 'filiere', data: fil }); toggleFiliere(fil.id); }}
                          >
                            {fExp ? <ChevronDown size={13} className="shrink-0 text-slate-400" /> : <ChevronRight size={13} className="shrink-0 text-slate-400" />}
                            <BookOpen size={13} className="shrink-0 text-slate-400" />
                            <span className="flex-1 text-sm text-slate-700">{fil.name}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{fOpts.length}</span>
                          </button>
                          {fExp && fOpts.map((opt) => {
                            const oSel = selected?.kind === 'option' && selected.data.id === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                className={`flex w-full items-center gap-2 py-2 pl-16 pr-4 text-left hover:bg-slate-50 ${oSel ? 'bg-emerald-50' : ''}`}
                                onClick={() => setSelected({ kind: 'option', data: opt })}
                              >
                                <Layers size={12} className="shrink-0 text-slate-400" />
                                <span className="flex-1 text-sm text-slate-600">{opt.name}</span>
                                {opt.code && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">{opt.code}</span>}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {filteredDepts.length === 0 && <div className="empty-note">Aucun résultat</div>}
            </div>
          )}
        </div>

        {/* ── Detail panel ── */}
        <div className="surface-card">
          {!selected ? (
            <div className="empty-note">Sélectionnez un nœud pour voir ses détails</div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    {selected.kind === 'dept' ? 'Département' : selected.kind === 'filiere' ? 'Filière' : 'Option'}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">{selected.data.name}</h3>
                  {'code' in selected.data && selected.data.code && (
                    <p className="mt-0.5 font-mono text-sm text-slate-500">{selected.data.code}</p>
                  )}
                </div>
                <button type="button" className="btn-outline text-xs" onClick={() => deleteNode(selected)}>Supprimer</button>
              </div>

              <div className="border-t border-slate-100" />

              <div>
                <p className="mb-3 text-sm font-semibold text-slate-600">
                  {selected.kind === 'dept' ? 'Filières' : selected.kind === 'filiere' ? 'Options' : 'Pas de sous-nœuds'}
                </p>
                {selected.kind !== 'option' && detailChildren.length === 0 && (
                  <p className="text-sm text-slate-400 italic">Aucun élément. Utilisez les boutons + pour en créer.</p>
                )}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {detailChildren.map((child) => (
                    <div
                      key={child.id}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                      onClick={() => {
                        if (selected.kind === 'dept') setSelected({ kind: 'filiere', data: child as Filiere });
                        else setSelected({ kind: 'option', data: child as Option });
                      }}
                    >
                      <p className="text-sm font-semibold text-slate-800">{child.name}</p>
                      {'code' in child && child.code && <p className="mt-0.5 font-mono text-xs text-slate-400">{child.code}</p>}
                      <div className="mt-2 flex gap-3">
                        {'_count' in child && child._count && Object.entries(child._count).map(([k, v]) => (
                          <span key={k} className="text-xs text-slate-500">{v} {k}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {selected.kind !== 'option' && (
                  <button
                    type="button"
                    className="btn-outline mt-4 text-sm"
                    onClick={() => {
                      if (selected.kind === 'dept') { setFiliereDeptId(String(selected.data.id)); setModal('filiere'); }
                      else { setOptFiliereId(String(selected.data.id)); setModal('option'); }
                    }}
                  >
                    <Plus size={14} className="mr-1 inline" />
                    {selected.kind === 'dept' ? 'Ajouter une filière' : 'Ajouter une option'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Metadata panel ── */}
        <div className="surface-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Statistiques globales</p>
          <div className="space-y-3">
            {[
              { label: 'Départements', value: departments.length, icon: Building2, color: 'text-blue-600 bg-blue-50' },
              { label: 'Filières', value: filieres.length, icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
              { label: 'Options', value: options.length, icon: Layers, color: 'text-amber-600 bg-amber-50' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}><Icon size={15} /></div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
          {stats && (
            <>
              <div className="my-4 border-t border-slate-100" />
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Sélection actuelle</p>
              <div className="space-y-2">
                {stats.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-600">{label}</span>
                    <span className="font-semibold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Département modal ── */}
      <ModalShell open={modal === 'dept'} title="Ajouter un département" description="" onClose={() => setModal(null)}
        footer={<><button className="btn-primary" type="button" onClick={saveDept} disabled={saving}>Créer</button><button className="btn-outline" type="button" onClick={() => setModal(null)}>Annuler</button></>}>
        <div className="field-stack"><label className="field-label">Nom</label><input className="input" value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="ex. Agronomie" /></div>
      </ModalShell>

      {/* ── Filière modal ── */}
      <ModalShell open={modal === 'filiere'} title="Ajouter une filière" description="" onClose={() => setModal(null)}
        footer={<><button className="btn-primary" type="button" onClick={saveFiliere} disabled={saving}>Créer</button><button className="btn-outline" type="button" onClick={() => setModal(null)}>Annuler</button></>}>
        <div className="space-y-3">
          <div className="field-stack"><label className="field-label">Département</label>
            <select className="input" value={filiereDeptId} onChange={(e) => setFiliereDeptId(e.target.value)}>
              <option value="">Sélectionner...</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="field-stack"><label className="field-label">Nom</label><input className="input" value={filiereName} onChange={(e) => setFiliereName(e.target.value)} placeholder="ex. APESA" /></div>
          <div className="field-stack"><label className="field-label">Code</label><input className="input" value={filiereCode} onChange={(e) => setFiliereCode(e.target.value)} placeholder="ex. APESA" /></div>
        </div>
      </ModalShell>

      {/* ── Option modal ── */}
      <ModalShell open={modal === 'option'} title="Ajouter une option" description="" onClose={() => setModal(null)}
        footer={<><button className="btn-primary" type="button" onClick={saveOption} disabled={saving}>Créer</button><button className="btn-outline" type="button" onClick={() => setModal(null)}>Annuler</button></>}>
        <div className="space-y-3">
          <div className="field-stack"><label className="field-label">Filière</label>
            <select className="input" value={optFiliereId} onChange={(e) => setOptFiliereId(e.target.value)}>
              <option value="">Sélectionner...</option>
              {filieres.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="field-stack"><label className="field-label">Nom</label><input className="input" value={optName} onChange={(e) => setOptName(e.target.value)} placeholder="ex. Production Animale" /></div>
          <div className="field-stack"><label className="field-label">Code (optionnel)</label><input className="input" value={optCode} onChange={(e) => setOptCode(e.target.value)} placeholder="ex. PA" /></div>
        </div>
      </ModalShell>
    </div>
  );
}
