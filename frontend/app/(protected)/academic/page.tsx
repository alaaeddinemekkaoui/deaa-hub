'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Layers, Plus } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Filiere = { id: number; name: string };
type Option = { id: number; name: string; filiereId: number };
type AcademicModule = {
  id: number; name: string; semestre?: string | null;
  filiereId?: number | null; optionId?: number | null;
  filiere?: { id: number; name: string } | null;
  option?: { id: number; name: string } | null;
  _count: { elements: number };
};
type ElementModule = {
  id: number; name: string; type: 'CM' | 'TD' | 'TP';
  volumeHoraire?: number | null; moduleId: number; classId?: number | null;
  module?: { id: number; name: string };
  class?: { id: number; name: string; year: number } | null;
  _count?: { sessions: number };
};
type AcademicClass = { id: number; name: string; year: number; filiereId?: number | null };

const TYPE_COLOR: Record<string, string> = {
  CM: 'bg-blue-50 text-blue-700 border-blue-200',
  TD: 'bg-teal-50 text-teal-700 border-teal-200',
  TP: 'bg-amber-50 text-amber-700 border-amber-200',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AcademicPage() {
  const [modules, setModules] = useState<AcademicModule[]>([]);
  const [elements, setElements] = useState<ElementModule[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<AcademicModule | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [filterFiliereId, setFilterFiliereId] = useState('');
  const [filterOptionId, setFilterOptionId] = useState('');

  // Module modal
  const [modModal, setModModal] = useState(false);
  const [editingModId, setEditingModId] = useState<number | null>(null);
  const [modName, setModName] = useState('');
  const [modSemestre, setModSemestre] = useState('');
  const [modFiliereId, setModFiliereId] = useState('');
  const [modOptionId, setModOptionId] = useState('');
  const [savingMod, setSavingMod] = useState(false);

  // Element modal
  const [elModal, setElModal] = useState(false);
  const [editingElId, setEditingElId] = useState<number | null>(null);
  const [elName, setElName] = useState('');
  const [elType, setElType] = useState<'CM' | 'TD' | 'TP'>('CM');
  const [elVolume, setElVolume] = useState('');
  const [elFiliereId, setElFiliereId] = useState('');
  const [elModuleId, setElModuleId] = useState('');
  const [elClassId, setElClassId] = useState('');
  const [savingEl, setSavingEl] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [mRes, fRes, oRes, cRes] = await Promise.all([
          api.get<PaginatedResponse<AcademicModule>>('/academic-modules', { params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc', filiereId: filterFiliereId || undefined, optionId: filterOptionId || undefined } }),
          api.get<PaginatedResponse<Filiere>>('/filieres', { params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<Option>>('/options', { params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<AcademicClass>>('/classes', { params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' } }),
        ]);
        setModules(mRes.data.data);
        setFilieres(fRes.data.data);
        setOptions(oRes.data.data);
        setClasses(cRes.data.data);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les données'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [filterFiliereId, filterOptionId, refreshKey]);

  // Load elements when module selected
  useEffect(() => {
    if (!selectedModule) { setElements([]); return; }
    const load = async () => {
      try {
        const res = await api.get<PaginatedResponse<ElementModule>>('/element-modules', { params: { page: 1, limit: 200, moduleId: selectedModule.id, sortBy: 'name', sortOrder: 'asc' } });
        setElements(res.data.data);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les éléments'));
      }
    };
    void load();
  }, [selectedModule, refreshKey]);

  const filteredOptions = useMemo(
    () => filterFiliereId ? options.filter((o) => String(o.filiereId) === filterFiliereId) : options,
    [filterFiliereId, options],
  );

  const modalOptions = useMemo(
    () => modFiliereId ? options.filter((o) => String(o.filiereId) === modFiliereId) : options,
    [modFiliereId, options],
  );

  // Modules filtered by filière selection in the element modal
  const elModalModules = useMemo(
    () => elFiliereId ? modules.filter((m) => String(m.filiereId) === elFiliereId) : modules,
    [elFiliereId, modules],
  );

  // Classes filtered by filière selection in the element modal
  const elModalClasses = useMemo(
    () => elFiliereId ? classes.filter((c) => String(c.filiereId) === elFiliereId) : classes,
    [elFiliereId, classes],
  );

  // ── Module CRUD ──
  const openCreateMod = () => { setEditingModId(null); setModName(''); setModSemestre(''); setModFiliereId(''); setModOptionId(''); setModModal(true); };
  const openEditMod = (m: AcademicModule) => { setEditingModId(m.id); setModName(m.name); setModSemestre(m.semestre ?? ''); setModFiliereId(String(m.filiereId ?? '')); setModOptionId(String(m.optionId ?? '')); setModModal(true); };

  const saveMod = async () => {
    if (!modName.trim()) return;
    setSavingMod(true);
    try {
      const data = { name: modName.trim(), semestre: modSemestre || null, filiereId: modFiliereId ? Number(modFiliereId) : null, optionId: modOptionId ? Number(modOptionId) : null };
      if (editingModId) await api.patch(`/academic-modules/${editingModId}`, data);
      else await api.post('/academic-modules', data);
      toast.success(editingModId ? 'Module mis à jour' : 'Module créé');
      setModModal(false); setRefreshKey((k) => k + 1);
    } catch (err) { toast.error(getApiErrorMessage(err, 'Erreur')); }
    finally { setSavingMod(false); }
  };

  const deleteMod = async (id: number) => {
    if (!window.confirm('Supprimer ce module et tous ses éléments ?')) return;
    try {
      await api.delete(`/academic-modules/${id}`);
      toast.success('Module supprimé');
      if (selectedModule?.id === id) setSelectedModule(null);
      setRefreshKey((k) => k + 1);
    } catch (err) { toast.error(getApiErrorMessage(err, 'Erreur')); }
  };

  // ── Element CRUD ──
  const openCreateEl = () => {
    setEditingElId(null); setElName(''); setElType('CM'); setElVolume('');
    const parentFiliere = selectedModule?.filiereId ? String(selectedModule.filiereId) : '';
    setElFiliereId(parentFiliere);
    setElModuleId(String(selectedModule?.id ?? ''));
    setElClassId('');
    setElModal(true);
  };
  const openEditEl = (el: ElementModule) => {
    setEditingElId(el.id); setElName(el.name); setElType(el.type);
    setElVolume(String(el.volumeHoraire ?? ''));
    setElFiliereId(String(el.module?.id ? (modules.find((m) => m.id === el.moduleId)?.filiereId ?? '') : ''));
    setElModuleId(String(el.moduleId));
    setElClassId(String(el.classId ?? ''));
    setElModal(true);
  };

  const saveEl = async () => {
    if (!elName.trim() || !elModuleId) return;
    setSavingEl(true);
    try {
      const data = { name: elName.trim(), type: elType, volumeHoraire: elVolume ? Number(elVolume) : null, moduleId: Number(elModuleId), classId: elClassId ? Number(elClassId) : null };
      if (editingElId) await api.patch(`/element-modules/${editingElId}`, data);
      else await api.post('/element-modules', data);
      toast.success(editingElId ? 'Élément mis à jour' : 'Élément créé');
      setElModal(false); setRefreshKey((k) => k + 1);
    } catch (err) { toast.error(getApiErrorMessage(err, 'Erreur')); }
    finally { setSavingEl(false); }
  };

  const deleteEl = async (id: number) => {
    if (!window.confirm('Supprimer cet élément de module ?')) return;
    try {
      await api.delete(`/element-modules/${id}`);
      toast.success('Élément supprimé');
      setRefreshKey((k) => k + 1);
    } catch (err) { toast.error(getApiErrorMessage(err, 'Erreur')); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Curriculum"
        title="Structure Académique"
        description="Gérez les modules et leurs éléments (cours). Chaque élément de module représente un cours dispensé en CM, TD ou TP."
      />

      {/* Filters + actions */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select className="input xl:max-w-48" value={filterFiliereId} onChange={(e) => { setFilterFiliereId(e.target.value); setFilterOptionId(''); }}>
            <option value="">Toutes les filières</option>
            {filieres.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select className="input xl:max-w-48" value={filterOptionId} onChange={(e) => setFilterOptionId(e.target.value)} disabled={filteredOptions.length === 0}>
            <option value="">Toutes les options</option>
            {filteredOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <button className="btn-primary" type="button" onClick={openCreateMod}>+ Module</button>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        {/* ── Modules panel ── */}
        <div className="surface-card overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="font-semibold text-slate-800">Modules ({modules.length})</p>
          </div>
          {loading ? (
            <div className="empty-note">Chargement...</div>
          ) : modules.length === 0 ? (
            <EmptyState title="Aucun module" description="Créez un module pour commencer." />
          ) : (
            <div className="divide-y divide-slate-50 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {modules.map((mod) => {
                const isSel = selectedModule?.id === mod.id;
                return (
                  <div
                    key={mod.id}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50 ${isSel ? 'bg-emerald-50 border-r-2 border-emerald-500' : ''}`}
                    onClick={() => setSelectedModule(isSel ? null : mod)}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <BookOpen size={14} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{mod.name}</p>
                      <p className="text-xs text-slate-400">
                        {mod.option?.name ?? mod.filiere?.name ?? 'Sans affectation'}
                        {mod.semestre ? ` • ${mod.semestre}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${mod._count.elements > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-600'}`}>
                        {mod._count.elements} él.
                      </span>
                      <button type="button" className="text-xs text-slate-400 hover:text-slate-700" onClick={(e) => { e.stopPropagation(); openEditMod(mod); }}>✏️</button>
                      <button type="button" className="text-xs text-slate-400 hover:text-red-500" onClick={(e) => { e.stopPropagation(); void deleteMod(mod.id); }}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Elements panel ── */}
        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-semibold text-slate-800">
                {selectedModule ? `Éléments de module — ${selectedModule.name}` : 'Éléments de module'}
              </p>
              {selectedModule && (
                <p className="text-xs text-slate-400">
                  Chaque élément = un Cours (CM / TD / TP)
                </p>
              )}
            </div>
            {selectedModule && (
              <button type="button" className="btn-primary text-sm" onClick={openCreateEl}>
                <Plus size={14} className="mr-1 inline" />Ajouter un élément
              </button>
            )}
          </div>

          {!selectedModule ? (
            <div className="empty-note">Sélectionnez un module pour voir ses éléments</div>
          ) : elements.length === 0 ? (
            <EmptyState title="Aucun élément" description="Ce module n’a pas encore d’éléments." />
          ) : (
            <div className="divide-y divide-slate-50 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {elements.map((el) => (
                <div key={el.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${TYPE_COLOR[el.type]}`}>
                    {el.type}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{el.name}</p>
                    <p className="text-xs text-slate-400">
                      {el.volumeHoraire ? `${el.volumeHoraire}h` : 'Volume non défini'}
                      {el.class ? ` • ${el.class.name}` : ''}
                      {' • '}{el._count?.sessions ?? 0} session{(el._count?.sessions ?? 0) !== 1 ? 's' : ''} planifiée{(el._count?.sessions ?? 0) !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-outline text-xs" onClick={() => openEditEl(el)}>Modifier</button>
                    <button type="button" className="btn-outline text-xs" onClick={() => deleteEl(el.id)}>Supprimer</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Module modal ── */}
      <ModalShell open={modModal} title={editingModId ? 'Modifier le module' : 'Ajouter un module'} description="" onClose={() => setModModal(false)}
        footer={<><button className="btn-primary" type="button" onClick={saveMod} disabled={savingMod}>{editingModId ? 'Enregistrer' : 'Créer'}</button><button className="btn-outline" type="button" onClick={() => setModModal(false)}>Annuler</button></>}>
        <div className="space-y-3">
          <div className="field-stack"><label className="field-label">Nom du module</label><input className="input" value={modName} onChange={(e) => setModName(e.target.value)} placeholder="ex. Mathématiques" /></div>
          <div className="field-stack"><label className="field-label">Semestre (optionnel)</label>
            <select className="input" value={modSemestre} onChange={(e) => setModSemestre(e.target.value)}>
              <option value="">—</option>
              {['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field-stack"><label className="field-label">Filière</label>
            <select className="input" value={modFiliereId} onChange={(e) => { setModFiliereId(e.target.value); setModOptionId(''); }}>
              <option value="">—</option>
              {filieres.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="field-stack"><label className="field-label">Option</label>
            <select className="input" value={modOptionId} onChange={(e) => setModOptionId(e.target.value)} disabled={modalOptions.length === 0}>
              <option value="">—</option>
              {modalOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>
      </ModalShell>

      {/* ── Element modal ── */}
      <ModalShell open={elModal} title={editingElId ? 'Modifier l’élément' : 'Ajouter un élément de module'} description="Un élément de module représente un cours (CM, TD ou TP)." onClose={() => setElModal(false)}
        footer={<><button className="btn-primary" type="button" onClick={saveEl} disabled={savingEl}>{editingElId ? 'Enregistrer' : 'Créer'}</button><button className="btn-outline" type="button" onClick={() => setElModal(false)}>Annuler</button></>}>
        <div className="space-y-3">
          <div className="field-stack">
            <label className="field-label">Nom de l’élément / Cours</label>
            <input className="input" value={elName} onChange={(e) => setElName(e.target.value)} placeholder="ex. Algèbre, Analyse, TP Chimie" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field-stack">
              <label className="field-label">Type</label>
              <select className="input" value={elType} onChange={(e) => setElType(e.target.value as 'CM' | 'TD' | 'TP')}>
                <option value="CM">CM — Cours Magistral</option>
                <option value="TD">TD — Travaux Dirigés</option>
                <option value="TP">TP — Travaux Pratiques</option>
              </select>
            </div>
            <div className="field-stack">
              <label className="field-label">Volume horaire (h)</label>
              <input className="input" type="number" min={1} value={elVolume} onChange={(e) => setElVolume(e.target.value)} placeholder="ex. 30" />
            </div>
          </div>
          {/* Filière → Module cascade */}
          <div className="field-stack">
            <label className="field-label">Filière</label>
            <select className="input" value={elFiliereId} onChange={(e) => { setElFiliereId(e.target.value); setElModuleId(''); setElClassId(''); }}>
              <option value="">— Toutes les filières</option>
              {filieres.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Module parent <span className="text-red-500">*</span></label>
            <select className="input" value={elModuleId} onChange={(e) => setElModuleId(e.target.value)}>
              <option value="">Sélectionner un module...</option>
              {elModalModules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.semestre ? ` (${m.semestre})` : ''}
                </option>
              ))}
            </select>
          </div>
          {/* Class link */}
          <div className="field-stack">
            <label className="field-label">Classe liée (optionnel)</label>
            <select className="input" value={elClassId} onChange={(e) => setElClassId(e.target.value)}>
              <option value="">Aucune classe spécifique</option>
              {elModalClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — Année {c.year}</option>
              ))}
            </select>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
