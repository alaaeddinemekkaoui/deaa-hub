'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CopyPlus, Search } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { useAuth } from '@/features/auth/auth-context';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type AcademicClass = {
  id: number;
  name: string;
  year: number;
  classType?: string | null;
  filiereId?: number | null;
  filiere?: { id?: number; name: string; department?: { id: number; name: string } } | null;
  academicOption?: { id: number; name: string } | null;
  cycle?: { id: number; name: string; code?: string | null } | null;
  _count: { students: number; teachers: number; cours: number };
};

const PAGE_SIZE = 10;

export default function ClassTransferPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AcademicClass[]>([]);
  const [allClasses, setAllClasses] = useState<AcademicClass[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1,
    hasNextPage: false, hasPreviousPage: false,
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // Transfer modal
  const [selected, setSelected] = useState<AcademicClass | null>(null);
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Session log
  const [transferLog, setTransferLog] = useState<{ from: string; fromYear: number; to: string; toYear: number }[]>([]);

  const availableYears = useMemo(() => {
    const s = new Set(rows.map((r) => r.year));
    return Array.from(s).sort((a, b) => b - a);
  }, [rows]);

  const sessionDepartmentIds = useMemo(
    () => user?.departments?.map((department) => department.id) ?? [],
    [user],
  );

  const singleDepartmentId = sessionDepartmentIds.length === 1 ? sessionDepartmentIds[0] : undefined;

  // Candidates for target: all classes except source
  const targetCandidates = useMemo(() => {
    if (!selected) return allClasses;
    const q = targetSearch.trim().toLowerCase();
    return allClasses.filter(
      (c) => c.id !== selected.id && (!q || c.name.toLowerCase().includes(q) || String(c.year).includes(q)),
    );
  }, [allClasses, selected, targetSearch]);

  const selectedTarget = useMemo(
    () => allClasses.find((c) => String(c.id) === targetClassId) ?? null,
    [allClasses, targetClassId],
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const [pageRes, allRes] = await Promise.all([
          api.get<PaginatedResponse<AcademicClass>>('/classes', {
            params: {
              page, limit: PAGE_SIZE,
              search: query || undefined,
              year: filterYear || undefined,
              departmentId: singleDepartmentId,
              sortBy: 'name', sortOrder: 'asc',
            },
          }),
          api.get<PaginatedResponse<AcademicClass>>('/classes', {
            params: { page: 1, limit: 500, departmentId: singleDepartmentId, sortBy: 'name', sortOrder: 'asc' },
          }),
        ]);

        const isClassInScope = (academicClass: AcademicClass) => {
          if (sessionDepartmentIds.length === 0) return true;
          const departmentId = academicClass.filiere?.department?.id;
          return typeof departmentId === 'number' && sessionDepartmentIds.includes(departmentId);
        };

        const scopedPageRows = pageRes.data.data.filter(isClassInScope);
        const scopedAllRows = allRes.data.data.filter(isClassInScope);

        setRows(scopedPageRows);
        setAllClasses(scopedAllRows);
        setMeta({
          ...pageRes.data.meta,
          total: scopedAllRows.length,
          totalPages: Math.max(1, Math.ceil(scopedAllRows.length / PAGE_SIZE)),
          hasNextPage: page < Math.max(1, Math.ceil(scopedAllRows.length / PAGE_SIZE)),
          hasPreviousPage: page > 1,
        });
      } catch (err) {
        setError(getApiErrorMessage(err, 'Impossible de charger les classes.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [page, query, filterYear, refreshKey, sessionDepartmentIds, singleDepartmentId]);

  const openModal = (item: AcademicClass) => {
    setSelected(item);
    setTargetClassId('');
    setTargetSearch('');
  };
  const closeModal = () => { setSelected(null); setTargetClassId(''); setTargetSearch(''); };

  const onTransfer = async () => {
    if (!selected || !targetClassId) return;
    setTransferring(true);
    try {
      await api.post(`/classes/${selected.id}/transfer`, { targetClassId: Number(targetClassId) });
      const target = selectedTarget;
      toast.success(`Modules et enseignants transférés vers « ${target?.name} (${target?.year}) »`);
      setTransferLog((prev) => [
        { from: selected.name, fromYear: selected.year, to: target?.name ?? '?', toYear: target?.year ?? 0 },
        ...prev,
      ]);
      closeModal();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec du transfert'));
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Classes"
        title="Transfert de modules entre classes"
        description="Sélectionnez une classe source, puis une classe cible existante. Les modules, leurs éléments et les affectations d'enseignants seront copiés dans la classe cible de façon indépendante."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Classes disponibles" value={meta.total} hint="Prêtes à transférer" icon={CopyPlus} />
        <MetricCard label="Années distinctes" value={availableYears.length} hint="Sur la page actuelle" icon={ArrowRight} />
        <MetricCard label="Transferts (session)" value={transferLog.length} hint="Effectués maintenant" icon={ArrowRight} />
      </section>

      {/* Session log */}
      {transferLog.length > 0 && (
        <section className="surface-card space-y-3">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Transferts effectués</h2>
              <p className="panel-copy">Historique de la session en cours.</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {transferLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 px-1 flex-wrap">
                <span className="font-medium text-slate-800">{entry.from}</span>
                <span className="status-chip status-chip--warn">{entry.fromYear}</span>
                <ArrowRight size={14} className="text-slate-400" />
                <span className="font-medium text-slate-800">{entry.to}</span>
                <span className="status-chip status-chip--ok">{entry.toYear}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Classe source</h2>
            <p className="panel-copy">Choisissez la classe dont vous voulez transférer les modules et enseignants.</p>
          </div>
        </div>

        <div className="toolbar-shell">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-10"
                placeholder="Rechercher par nom de classe…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setPage(1), setQuery(search.trim()))}
              />
            </div>
            <select
              className="input xl:max-w-48"
              value={filterYear}
              onChange={(e) => { setFilterYear(e.target.value); setPage(1); }}
            >
              <option value="">Toutes les années</option>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="flex gap-2">
              <button className="btn-outline" type="button" onClick={() => { setPage(1); setQuery(search.trim()); }}>Rechercher</button>
              <button className="btn-outline" type="button" onClick={() => { setSearch(''); setQuery(''); setFilterYear(''); setPage(1); }}>Réinitialiser</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="empty-note">Chargement des classes…</div>
        ) : error ? (
          <div className="empty-note">{error}</div>
        ) : rows.length === 0 ? (
          <EmptyState title="Aucune classe trouvée" description="Ajustez vos filtres ou créez des classes." />
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
                      <th>Étudiants</th>
                      <th>Enseignants</th>
                      <th>Cours</th>
                      <th>Action</th>
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
                        <td><span className="status-chip status-chip--ok">{item.year}</span></td>
                        <td>{item.filiere?.name ?? '—'}</td>
                        <td>{item._count.students}</td>
                        <td>{item._count.teachers}</td>
                        <td>{item._count.cours}</td>
                        <td>
                          <button type="button" className="btn-primary text-xs" onClick={() => openModal(item)}>
                            Transférer →
                          </button>
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

      {/* Transfer modal */}
      <ModalShell
        open={!!selected}
        title="Choisir la classe cible"
        description={selected ? `Copier les modules et enseignants de « ${selected.name} (${selected.year}) » vers une classe existante.` : ''}
        onClose={closeModal}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onTransfer} disabled={transferring || !targetClassId}>
              {transferring ? 'Transfert en cours…' : 'Confirmer le transfert'}
            </button>
            <button className="btn-outline" type="button" onClick={closeModal}>Annuler</button>
          </>
        }
      >
        <div className="form-grid md:grid-cols-1 xl:grid-cols-1">
          {/* Source summary */}
          {selected && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-1 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Classe source</p>
              <p className="font-medium text-slate-800">{selected.name} <span className="status-chip status-chip--warn ml-1">{selected.year}</span></p>
              <p className="text-slate-500 text-xs">
                {selected._count.students} étudiant(s) · {selected._count.teachers} enseignant(s) · {selected._count.cours} cours
              </p>
            </div>
          )}

          {/* Arrow */}
          <div className="flex items-center justify-center gap-3 py-1 text-slate-400">
            <span className="text-xs">Modules + éléments + enseignants</span>
            <ArrowRight size={18} />
          </div>

          {/* Target picker */}
          <div className="field-stack">
            <label className="field-label">Classe cible <span className="text-red-500">*</span></label>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9 text-sm mb-2"
                placeholder="Filtrer les classes…"
                value={targetSearch}
                onChange={(e) => setTargetSearch(e.target.value)}
              />
            </div>
            <select
              className="input"
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              size={6}
            >
              <option value="">— Sélectionner une classe —</option>
              {targetCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.year}){c.filiere ? ` · ${c.filiere.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Preview */}
          {selectedTarget && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
              <ArrowRight size={16} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-medium text-emerald-800">
                  {selectedTarget.name} <span className="status-chip status-chip--ok ml-1">{selectedTarget.year}</span>
                </p>
                <p className="text-emerald-700 text-xs mt-0.5">
                  {selectedTarget.filiere?.name ?? 'Aucune filière'} · {selectedTarget._count.students} étudiant(s)
                </p>
              </div>
            </div>
          )}
        </div>
      </ModalShell>
    </div>
  );
}
