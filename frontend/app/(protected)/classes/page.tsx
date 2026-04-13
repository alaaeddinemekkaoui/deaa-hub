'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CalendarRange, GraduationCap, Search, Users } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type AcademicClass = {
  id: number;
  name: string;
  year: number;
  classType?: string | null;
  cycleId?: number | null;
  optionId?: number | null;
  filiereId?: number | null;
  createdAt: string;
  updatedAt: string;
  filiere?: {
    id?: number;
    name: string;
    department?: { id: number; name: string };
  } | null;
  academicOption?: { id: number; name: string } | null;
  cycle?: { id: number; name: string; code?: string | null } | null;
  _count: {
    students: number;
    teachers: number;
    cours: number;
  };
};

type Filiere = { id: number; name: string; departmentId?: number };
type Department = { id: number; name: string };
type AcademicOption = { id: number; name: string; filiereId: number };
type Cycle = { id: number; name: string; code?: string | null };

const PAGE_SIZE = 8;
const CURRENT_YEAR = new Date().getFullYear();

export default function ClassesPage() {
  const [rows, setRows] = useState<AcademicClass[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [options, setOptions] = useState<AcademicOption[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [classType, setClassType] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [optionId, setOptionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [filiereId, setFiliereId] = useState('');

  // Filter state
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterFiliereId, setFilterFiliereId] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  // UI state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'year' | 'updatedAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1,
    hasNextPage: false, hasPreviousPage: false,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Transfer modal state
  const [transferClass, setTransferClass] = useState<AcademicClass | null>(null);
  const [targetYear, setTargetYear] = useState('');
  const [transferring, setTransferring] = useState(false);

  const totalStudents = useMemo(() => rows.reduce((sum, item) => sum + item._count.students, 0), [rows]);
  const totalTeachers = useMemo(() => rows.reduce((sum, item) => sum + item._count.teachers, 0), [rows]);

  const resetForm = () => {
    setEditingId(null); setName(''); setYear(String(CURRENT_YEAR)); setClassType('');
    setCycleId(''); setOptionId(''); setDepartmentId(''); setFiliereId('');
  };
  const closeModal = () => { setIsModalOpen(false); resetForm(); };
  const openCreateModal = () => { resetForm(); setIsModalOpen(true); };

  const filieresByDepartment = useMemo(
    () => departmentId ? filieres.filter((f) => String(f.departmentId ?? '') === departmentId) : filieres,
    [departmentId, filieres],
  );
  const optionsByFiliere = useMemo(
    () => filiereId ? options.filter((o) => String(o.filiereId) === filiereId) : [],
    [filiereId, options],
  );
  const filterFilieresByDepartment = useMemo(
    () => filterDepartmentId ? filieres.filter((f) => String(f.departmentId ?? '') === filterDepartmentId) : filieres,
    [filterDepartmentId, filieres],
  );

  // Distinct years for filter
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b - a);
    return years;
  }, [rows]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const [classesRes, filieresRes, depsRes, optsRes, cyclesRes] = await Promise.all([
          api.get<PaginatedResponse<AcademicClass>>('/classes', {
            params: {
              page, limit: PAGE_SIZE, search: query || undefined,
              departmentId: filterDepartmentId || undefined,
              filiereId: filterFiliereId || undefined,
              year: filterYear || undefined,
              sortBy, sortOrder,
            },
          }),
          api.get<PaginatedResponse<Filiere>>('/filieres', { params: { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<Department>>('/departments', { params: { page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<PaginatedResponse<AcademicOption>>('/options', { params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<Cycle[]>('/cycles'),
        ]);
        setRows(classesRes.data.data);
        setMeta(classesRes.data.meta);
        setFilieres(filieresRes.data.data);
        setDepartments(depsRes.data.data);
        setOptions(optsRes.data.data);
        setCycles(Array.isArray(cyclesRes.data) ? cyclesRes.data : []);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Impossible de charger les classes.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [filterDepartmentId, filterFiliereId, filterYear, page, query, refreshKey, sortBy, sortOrder]);

  // Clear filiere when department changes in form
  useEffect(() => {
    if (!departmentId) return;
    const valid = filieres.some((f) => String(f.id) === filiereId && String(f.departmentId ?? '') === departmentId);
    if (!valid) setFiliereId('');
  }, [departmentId, filiereId, filieres]);

  // Clear filiere filter when department filter changes
  useEffect(() => {
    if (!filterDepartmentId) return;
    const valid = filieres.some((f) => String(f.id) === filterFiliereId && String(f.departmentId ?? '') === filterDepartmentId);
    if (!valid) setFilterFiliereId('');
  }, [filterDepartmentId, filterFiliereId, filieres]);

  // Clear option when filiere changes
  useEffect(() => { setOptionId(''); }, [filiereId]);

  const onSubmit = async () => {
    if (!name.trim()) return;
    if (!year || isNaN(Number(year))) { toast.error("L'année est requise"); return; }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        year: Number(year),
        classType: classType.trim() || null,
        cycleId: cycleId ? Number(cycleId) : null,
        optionId: optionId ? Number(optionId) : null,
        filiereId: filiereId ? Number(filiereId) : null,
      };
      if (editingId) {
        await api.patch(`/classes/${editingId}`, payload);
        toast.success('Classe mise à jour avec succès');
      } else {
        await api.post('/classes', payload);
        toast.success('Classe créée avec succès');
      }
      closeModal(); setPage(1); setRefreshKey((v) => v + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'enregistrement de la classe"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette classe ?')) return;
    try {
      await api.delete(`/classes/${id}`);
      toast.success('Classe supprimée avec succès');
      if (editingId === id) closeModal();
      if (rows.length === 1 && page > 1) setPage(page - 1);
      else setRefreshKey((v) => v + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la suppression de la classe'));
    }
  };

  const openTransferModal = (item: AcademicClass) => {
    setTransferClass(item);
    setTargetYear(String(item.year + 1));
  };
  const closeTransferModal = () => { setTransferClass(null); setTargetYear(''); };

  const onTransfer = async () => {
    if (!transferClass) return;
    const ty = Number(targetYear);
    if (!targetYear || isNaN(ty) || ty < 1 || ty > 2100) {
      toast.error("Année cible invalide");
      return;
    }
    setTransferring(true);
    try {
      await api.post(`/classes/${transferClass.id}/transfer`, { targetYear: ty });
      toast.success(`Classe transférée vers ${ty} avec succès`);
      closeTransferModal();
      setRefreshKey((v) => v + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec du transfert de la classe'));
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cohortes"
        title="Administration des classes"
        description="Gérez les classes par année académique. Transférez une classe vers l'année suivante pour cloner ses modules, éléments et affectations d'enseignants."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total des classes" value={meta.total} hint="Registre actuel" icon={CalendarRange} />
        <MetricCard label="Étudiants visibles" value={totalStudents} hint="Sur la page actuelle" icon={GraduationCap} />
        <MetricCard label="Enseignants visibles" value={totalTeachers} hint="Sur la page actuelle" icon={Users} />
        <MetricCard label="Filières disponibles" value={filieres.length} hint="Programmes avec classes" icon={BookOpen} />
      </section>

      <section className="flex justify-end gap-2">
        <ImportDataButton onSuccess={() => setRefreshKey((k) => k + 1)} />
        <ExportDataButton />
        <button className="btn-primary" type="button" onClick={openCreateModal}>Ajouter une classe</button>
      </section>

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Registre des classes</h2>
            <p className="panel-copy">Vérifiez la structure des cohortes, la filière et la charge en étudiants et enseignants.</p>
          </div>
        </div>

        <div className="toolbar-shell">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className="input pl-10" placeholder="Rechercher par nom de classe ou type..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button className="btn-outline" type="button" onClick={() => { setPage(1); setQuery(search.trim()); }}>Appliquer</button>
                <button className="btn-outline" type="button" onClick={() => { setSearch(''); setQuery(''); setFilterDepartmentId(''); setFilterFiliereId(''); setFilterYear(''); setSortBy('name'); setSortOrder('asc'); setPage(1); }}>Réinitialiser</button>
              </div>
            </div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <select className="input xl:max-w-48" value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}>
                <option value="">Toutes les années</option>
                {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select className="input xl:max-w-56" value={filterDepartmentId} onChange={(e) => setFilterDepartmentId(e.target.value)}>
                <option value="">Tous les départements ({departments.length})</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select className="input xl:max-w-56" value={filterFiliereId} onChange={(e) => setFilterFiliereId(e.target.value)}>
                <option value="">Toutes les filières ({filterFilieresByDepartment.length})</option>
                {filterFilieresByDepartment.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select className="input xl:max-w-52" value={sortBy} onChange={(e) => setSortBy(e.target.value as 'name' | 'year' | 'updatedAt')}>
                <option value="name">Trier par nom</option>
                <option value="year">Trier par année</option>
                <option value="updatedAt">Trier par date de mise à jour</option>
              </select>
              <select className="input xl:max-w-44" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}>
                <option value="asc">Croissant</option>
                <option value="desc">Décroissant</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="empty-note">Chargement des classes...</div>
        ) : error ? (
          <div className="empty-note">{error}</div>
        ) : rows.length === 0 ? (
          <EmptyState title="Aucune classe ne correspond" description="Ajustez vos filtres ou créez une classe." />
        ) : (
          <>
            <div className="data-table-wrap">
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Classe</th>
                      <th>Année</th>
                      <th>Filière</th>
                      <th>Département</th>
                      <th>Étudiants</th>
                      <th>Enseignants</th>
                      <th>Cours</th>
                      <th>État</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <p className="font-medium text-slate-950">{item.name}</p>
                            <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              {[item.classType, item.cycle?.name, item.academicOption?.name].filter(Boolean).join(' • ') || '—'}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span className="status-chip status-chip--ok">{item.year}</span>
                        </td>
                        <td>{item.filiere?.name ?? 'Non assignée'}</td>
                        <td>{item.filiere?.department?.name ?? '-'}</td>
                        <td>{item._count.students}</td>
                        <td>{item._count.teachers}</td>
                        <td>
                          <span className={`status-chip ${item._count.cours > 0 ? 'status-chip--ok' : 'status-chip--warn'}`}>
                            {item._count.cours}
                          </span>
                        </td>
                        <td>
                          <span className={`status-chip ${item.filiere ? 'status-chip--ok' : 'status-chip--warn'}`}>
                            {item.filiere ? 'Assignée' : 'Sans filière'}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="btn-outline" onClick={() => {
                              setEditingId(item.id); setName(item.name); setYear(String(item.year));
                              setClassType(item.classType ?? ''); setCycleId(String(item.cycleId ?? ''));
                              setOptionId(String(item.optionId ?? '')); setDepartmentId(String(item.filiere?.department?.id ?? ''));
                              setFiliereId(String(item.filiereId ?? '')); setIsModalOpen(true);
                            }}>Modifier</button>
                            <button type="button" className="btn-outline" onClick={() => openTransferModal(item)}>Transférer</button>
                            <button type="button" className="btn-outline" onClick={() => onDelete(item.id)}>Supprimer</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <PaginationControls page={meta.page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
          </>
        )}
      </section>

      {/* ── Create / Edit modal ── */}
      <ModalShell
        open={isModalOpen}
        title={editingId ? 'Modifier la classe' : 'Ajouter une classe'}
        description="Chaque classe est identifiée par son nom et son année académique (ex. GI-1 / 2026)."
        onClose={closeModal}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onSubmit} disabled={saving}>
              {editingId ? 'Enregistrer les modifications' : 'Créer une classe'}
            </button>
            <button className="btn-outline" type="button" onClick={closeModal}>Annuler</button>
          </>
        }
      >
        <div className="form-grid md:grid-cols-1 xl:grid-cols-1">
          <div className="field-stack">
            <label className="field-label">Nom de la classe <span className="text-red-500">*</span></label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. GI-1, APESA-2" />
          </div>
          <div className="field-stack">
            <label className="field-label">Année académique <span className="text-red-500">*</span></label>
            <input className="input" type="number" min={1900} max={2100} value={year} onChange={(e) => setYear(e.target.value)} placeholder="ex. 2026" />
          </div>
          <div className="field-stack">
            <label className="field-label">Type de classe</label>
            <input className="input" value={classType} onChange={(e) => setClassType(e.target.value)} placeholder="prépa / ingénieur" />
          </div>
          <div className="field-stack">
            <label className="field-label">Cycle</label>
            <select className="input" value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
              <option value="">— Aucun cycle —</option>
              {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</option>)}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Département</label>
            <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Tous les départements</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Filière</label>
            <select className="input" value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
              <option value="">Non assignée</option>
              {filieresByDepartment.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Option</label>
            <select className="input" value={optionId} onChange={(e) => setOptionId(e.target.value)} disabled={!filiereId}>
              <option value="">{filiereId ? 'Aucune option' : "Sélectionner une filière d'abord"}</option>
              {optionsByFiliere.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>
      </ModalShell>

      {/* ── Transfer modal ── */}
      <ModalShell
        open={!!transferClass}
        title="Transférer la classe vers une nouvelle année"
        description={transferClass ? `Cloner « ${transferClass.name} (${transferClass.year}) » avec tous ses modules, éléments et affectations d'enseignants.` : ''}
        onClose={closeTransferModal}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onTransfer} disabled={transferring}>
              {transferring ? 'Transfert en cours...' : 'Confirmer le transfert'}
            </button>
            <button className="btn-outline" type="button" onClick={closeTransferModal}>Annuler</button>
          </>
        }
      >
        <div className="form-grid md:grid-cols-1 xl:grid-cols-1">
          <div className="field-stack">
            <label className="field-label">Année cible <span className="text-red-500">*</span></label>
            <input
              className="input"
              type="number"
              min={1900}
              max={2100}
              value={targetYear}
              onChange={(e) => setTargetYear(e.target.value)}
              placeholder="ex. 2027"
            />
            <p className="text-xs text-slate-500 mt-1">
              Une nouvelle classe «{transferClass?.name} ({targetYear || '…'})» sera créée avec des copies indépendantes de tous les modules et éléments.
            </p>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
