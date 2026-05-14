'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Check, CopyPlus, Search, Star } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import {
  getDefaultAcademicYear,
  sortAcademicYearsCurrentFirst,
} from '@/components/academic/academic-year-select';
import { SemesterSelect } from '@/components/academic/semester-select';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { useAuth } from '@/features/auth/auth-context';
import { api, fetchRef, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type AcademicClass = {
  id: number;
  name: string;
  year: number;
  academicYear?: string | null;
  semestre?: string | null;
  classType?: string | null;
  filiereId?: number | null;
  filiere?: { id?: number; name: string; department?: { id: number; name: string } } | null;
  academicOption?: { id: number; name: string } | null;
  cycle?: { id: number; name: string; code?: string | null } | null;
  _count: { students: number; teachers: number; cours: number };
};
type AcademicYear = { id: number; label: string; isCurrent: boolean };

const PAGE_SIZE = 10;
type TransferMode = 'duplicate' | 'existing';

export default function ClassTransferPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<AcademicClass[]>([]);
  const [allClasses, setAllClasses] = useState<AcademicClass[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filterAcademicYear, setFilterAcademicYear] = useState('');
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
  const [sourceAcademicYear, setSourceAcademicYear] = useState('');
  const [sourceSemestre, setSourceSemestre] = useState('');
  const [transferMode, setTransferMode] = useState<TransferMode>('duplicate');
  const [destinationAcademicYear, setDestinationAcademicYear] = useState('');
  const [destinationSemestre, setDestinationSemestre] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Session log
  const [transferLog, setTransferLog] = useState<{ from: string; fromYear: number; to: string; toYear: number; academicYear?: string }[]>([]);

  const availableYears = useMemo(() => {
    const s = new Set(rows.map((r) => r.year));
    return Array.from(s).sort((a, b) => b - a);
  }, [rows]);

  const sessionDepartmentIds = useMemo(
    () => user?.departments?.map((department) => department.id) ?? [],
    [user],
  );

  const singleDepartmentId = sessionDepartmentIds.length === 1 ? sessionDepartmentIds[0] : undefined;

  const academicYearOptions = useMemo(
    () =>
      academicYears.map((year) => ({
        value: year.label,
        label: year.label,
        badge: year.isCurrent ? 'Actuelle' : undefined,
        icon: year.isCurrent ? ('star' as const) : undefined,
      })),
    [academicYears],
  );

  const classOptions = useMemo(
    () =>
      allClasses
        .filter((item) => !selected || item.id !== selected.id)
        .map((item) => ({
          value: String(item.id),
          label: item.name,
          badge: item.semestre ?? undefined,
          description: [
            item.academicYear,
            `Année ${item.year}`,
            item.filiere?.name,
            item.academicOption?.name,
            `${item._count.cours} cours`,
          ]
            .filter(Boolean)
            .join(' · '),
          group: item.academicYear ?? 'Sans année académique',
        })),
    [allClasses, selected],
  );

  const selectedTarget = useMemo(
    () => allClasses.find((c) => String(c.id) === targetClassId) ?? null,
    [allClasses, targetClassId],
  );

  useEffect(() => {
    const loadYears = async () => {
      try {
        const years = await fetchRef<AcademicYear[]>('/academic-years');
        const sortedYears = sortAcademicYearsCurrentFirst(years);
        setAcademicYears(sortedYears);
        const current = getDefaultAcademicYear(sortedYears);
        if (current) {
          setFilterAcademicYear((value) => value || current);
          setSourceAcademicYear((value) => value || current);
          setDestinationAcademicYear((value) => value || current);
        }
      } catch {
        // The transfer still works, but the target year dropdown will be empty.
      }
    };
    void loadYears();
  }, []);

  const nextSemester = (semestre?: string | null) => {
    const match = /^S(\d+)$/i.exec(semestre ?? '');
    if (!match) return '';
    const next = Number(match[1]) + 1;
    return next <= 10 ? `S${next}` : '';
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError(null);
        const [pageRes, allRes] = await Promise.all([
          api.get<PaginatedResponse<AcademicClass>>('/classes', {
            params: {
              page, limit: PAGE_SIZE,
              search: query || undefined,
              academicYear: filterAcademicYear || undefined,
              departmentId: singleDepartmentId,
              sortBy: 'name', sortOrder: 'asc',
            },
          }),
          api.get<PaginatedResponse<AcademicClass>>('/classes', {
            params: { page: 1, limit: 500, academicYear: filterAcademicYear || undefined, departmentId: singleDepartmentId, sortBy: 'name', sortOrder: 'asc' },
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

        const requestedSourceId = searchParams.get('sourceClassId');
        if (requestedSourceId && !selected) {
          const source = scopedAllRows.find((item) => String(item.id) === requestedSourceId);
          if (source) {
            openModal(source, scopedAllRows);
          }
        }
      } catch (err) {
        setError(getApiErrorMessage(err, 'Impossible de charger les classes.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [page, query, filterAcademicYear, refreshKey, searchParams, selected, sessionDepartmentIds, singleDepartmentId]);

  const openModal = (item: AcademicClass, classPool = allClasses) => {
    setSelected(item);
    const nextSemestre = nextSemester(item.semestre);
    const matchingTarget = classPool.find(
      (candidate) =>
        candidate.id !== item.id &&
        candidate.year === item.year &&
        (!nextSemestre || candidate.semestre === nextSemestre) &&
        candidate.filiereId === item.filiereId,
    );
    setTargetClassId(matchingTarget ? String(matchingTarget.id) : '');
    const currentAcademicYear = getDefaultAcademicYear(academicYears);
    setSourceAcademicYear(item.academicYear ?? currentAcademicYear);
    setSourceSemestre(item.semestre ?? '');
    setDestinationAcademicYear(item.academicYear ?? currentAcademicYear);
    setDestinationSemestre(nextSemestre || item.semestre || '');
    setTransferMode(matchingTarget ? 'existing' : 'duplicate');
  };
  const closeModal = () => {
    setSelected(null);
    setTargetClassId('');
    setSourceAcademicYear('');
    setSourceSemestre('');
    setDestinationAcademicYear('');
    setDestinationSemestre('');
    setTransferMode('duplicate');
  };

  const onTransfer = async () => {
    if (!selected) return;
    if (!sourceAcademicYear || !destinationAcademicYear || !destinationSemestre) {
      toast.error('Choisissez les années académiques et le semestre cible.');
      return;
    }
    if (transferMode === 'existing' && !targetClassId) {
      toast.error('Choisissez une classe cible existante.');
      return;
    }
    if (
      transferMode === 'duplicate' &&
      sourceAcademicYear === destinationAcademicYear &&
      (sourceSemestre || selected.semestre || '') === destinationSemestre
    ) {
      toast.error('La destination doit être différente de la source.');
      return;
    }
    setTransferring(true);
    try {
      await api.post(`/classes/${selected.id}/transfer`, {
        transferMode,
        destinationClassId: transferMode === 'existing' ? Number(targetClassId) : undefined,
        sourceAcademicYear,
        sourceSemestre: sourceSemestre || undefined,
        destinationAcademicYear,
        destinationSemestre,
      });
      const target = selectedTarget;
      toast.success(
        transferMode === 'duplicate'
          ? `Classe « ${selected.name} ${destinationSemestre} » créée et modules transférés`
          : `Modules et enseignants transférés vers « ${target?.name} (${target?.year}) »`,
      );
      setTransferLog((prev) => [
        { from: selected.name, fromYear: selected.year, to: transferMode === 'duplicate' ? `${selected.name} ${destinationSemestre}` : (target?.name ?? '?'), toYear: target?.year ?? selected.year, academicYear: destinationAcademicYear },
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
                {entry.academicYear && (
                  <span className="status-chip status-chip--muted">{entry.academicYear}</span>
                )}
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
            <SearchableSelect
              className="xl:max-w-64"
              value={filterAcademicYear}
              options={academicYearOptions}
              label="Année académique"
              placeholder="Choisir une année"
              searchPlaceholder="Rechercher une année..."
              includeAllOption
              allLabel="Toutes les années académiques"
              onChange={(value) => {
                setFilterAcademicYear(value);
                setPage(1);
              }}
            />
            <div className="flex gap-2">
              <button className="btn-outline" type="button" onClick={() => { setPage(1); setQuery(search.trim()); }}>Rechercher</button>
              <button className="btn-outline" type="button" onClick={() => { setSearch(''); setQuery(''); setFilterAcademicYear(getDefaultAcademicYear(academicYears)); setPage(1); }}>Réinitialiser</button>
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
                      <th>Année académique</th>
                      <th>Année classe</th>
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
                              {[item.semestre, item.classType, item.cycle?.name, item.academicOption?.name].filter(Boolean).join(' • ') || '—'}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span className="status-chip status-chip--muted">{item.academicYear ?? '—'}</span>
                        </td>
                        <td>
                          <span className="status-chip status-chip--ok">{item.year}</span>
                          {item.semestre ? <span className="status-chip status-chip--muted ml-1">{item.semestre}</span> : null}
                        </td>
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
        title="Transfert de modules"
        description={selected ? `Copier les modules de « ${selected.name} » en choisissant une source, un mode et une destination.` : ''}
        onClose={closeModal}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onTransfer} disabled={transferring || (transferMode === 'existing' && !targetClassId)}>
              {transferring ? 'Transfert en cours…' : 'Confirmer le transfert'}
            </button>
            <button className="btn-outline" type="button" onClick={closeModal}>Annuler</button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Step 1: Source */}
          {selected && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <StepHeader number="1" title="Source" />
              <div className="mt-3 rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
                <p className="font-semibold text-slate-900">
                  {selected.name}
                  <span className="status-chip status-chip--warn ml-2">{selected.year}</span>
                  {selected.semestre ? <span className="status-chip status-chip--muted ml-1">{selected.semestre}</span> : null}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {[selected.academicYear, selected.filiere?.name, `${selected._count.cours} cours`, `${selected._count.students} étudiants`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
              <SearchableSelect
                value={sourceAcademicYear}
                options={academicYearOptions}
                onChange={setSourceAcademicYear}
                label="Année académique source"
                placeholder="Choisir une année source"
                searchPlaceholder="Rechercher une année..."
                required
              />
              <SemesterSelect
                value={sourceSemestre}
                onChange={setSourceSemestre}
                label="Semestre source"
                emptyLabel="Tous les semestres"
              />
              </div>
            </div>
          )}

          {/* Arrow */}
          <div className="flex items-center justify-center gap-3 text-slate-400">
            <span className="text-xs font-medium">Modules + éléments + enseignants</span>
            <ArrowRight size={18} />
          </div>

          {/* Step 2: Mode */}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <StepHeader number="2" title="Mode de transfert" />
            <div className="mt-3 grid gap-2 md:grid-cols-2">
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition ${transferMode === 'duplicate' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input
                type="radio"
                name="transferMode"
                className="mt-1"
                checked={transferMode === 'duplicate'}
                onChange={() => setTransferMode('duplicate')}
              />
              <span>
                <span className="block font-semibold text-slate-900">Dupliquer</span>
                <span className="block text-xs text-slate-500">Même structure vers un autre semestre ou une autre année.</span>
              </span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition ${transferMode === 'existing' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input
                type="radio"
                name="transferMode"
                className="mt-1"
                checked={transferMode === 'existing'}
                onChange={() => setTransferMode('existing')}
              />
              <span>
                <span className="block font-semibold text-slate-900">Classe existante</span>
                <span className="block text-xs text-slate-500">Copier les modules vers une classe déjà créée.</span>
              </span>
            </label>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <StepHeader number="3" title="Destination" />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <SearchableSelect
                value={destinationAcademicYear}
                options={academicYearOptions}
                onChange={setDestinationAcademicYear}
                label="Année académique cible"
                placeholder="Choisir une année cible"
                searchPlaceholder="Rechercher une année..."
                required
              />
              <SemesterSelect
                value={destinationSemestre}
                onChange={setDestinationSemestre}
                label="Semestre cible"
                required
                includeEmpty={false}
              />
            </div>

            {transferMode === 'existing' && (
              <div className="mt-3">
                <SearchableSelect
                  value={targetClassId}
                  options={classOptions}
                  onChange={setTargetClassId}
                  label="Classe cible"
                  placeholder="Sélectionner une classe"
                  searchPlaceholder="Rechercher par classe, filière, semestre..."
                  required
                />
              </div>
            )}
          </div>

          {/* Preview */}
          {(selectedTarget || transferMode === 'duplicate') && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
              <ArrowRight size={16} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-medium text-emerald-800">
                  {transferMode === 'duplicate' ? selected?.name : selectedTarget?.name} <span className="status-chip status-chip--ok ml-1">{transferMode === 'duplicate' ? selected?.year : selectedTarget?.year}</span>{destinationSemestre ? <span className="status-chip status-chip--muted ml-1">{destinationSemestre}</span> : null}
                  {destinationAcademicYear && <span className="ml-2 text-emerald-600 text-xs">· {destinationAcademicYear}</span>}
                </p>
                <p className="text-emerald-700 text-xs mt-0.5">
                  {transferMode === 'duplicate' ? (selected?.filiere?.name ?? 'Aucune filière') : (selectedTarget?.filiere?.name ?? 'Aucune filière')} · {transferMode === 'duplicate' ? 'nouvelle classe' : `${selectedTarget?._count.students ?? 0} étudiant(s)`}
                </p>
              </div>
            </div>
          )}
        </div>
      </ModalShell>
    </div>
  );
}

type SearchableOption = {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  group?: string;
  icon?: 'star';
};

type SearchableSelectProps = {
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  required?: boolean;
  includeAllOption?: boolean;
  allLabel?: string;
  className?: string;
};

function SearchableSelect({
  value,
  options,
  onChange,
  label,
  placeholder,
  searchPlaceholder,
  required,
  includeAllOption,
  allLabel = 'Tous',
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedQuery) return true;
    return [option.label, option.description, option.badge, option.group]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery);
  });

  const groupedOptions = filteredOptions.reduce<Record<string, SearchableOption[]>>((acc, option) => {
    const group = option.group ?? '';
    acc[group] = acc[group] ?? [];
    acc[group].push(option);
    return acc;
  }, {});

  return (
    <div className={`field-stack relative ${className ?? ''}`}>
      <label className="field-label">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <button
        type="button"
        className={`input flex min-h-11 items-center justify-between gap-3 text-left ${selected?.icon === 'star' ? 'border-emerald-300 bg-emerald-50/60' : ''}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0">
          <span className={selected ? 'block truncate font-medium text-slate-900' : 'block truncate text-slate-400'}>
            {selected?.label ?? (includeAllOption && !value ? allLabel : placeholder)}
          </span>
          {selected?.description ? (
            <span className="block truncate text-xs text-slate-500">{selected.description}</span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {selected?.badge ? <span className="status-chip status-chip--muted">{selected.badge}</span> : null}
          {selected?.icon === 'star' ? <Star size={13} fill="currentColor" className="text-emerald-700" /> : null}
          <Search size={15} className="text-slate-400" />
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_20px_60px_-35px_rgba(15,23,42,0.45)]">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="input h-9 pl-9 text-sm"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {includeAllOption ? (
              <SearchableOptionButton
                option={{ value: '', label: allLabel }}
                selected={!value}
                onSelect={() => {
                  onChange('');
                  setOpen(false);
                  setQuery('');
                }}
              />
            ) : null}
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">Aucun résultat</div>
            ) : (
              Object.entries(groupedOptions).map(([group, items]) => (
                <div key={group || 'default'} className="py-1">
                  {group ? (
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {group}
                    </p>
                  ) : null}
                  {items.map((option) => (
                    <SearchableOptionButton
                      key={option.value}
                      option={option}
                      selected={option.value === value}
                      onSelect={() => {
                        onChange(option.value);
                        setOpen(false);
                        setQuery('');
                      }}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SearchableOptionButton({
  option,
  selected,
  onSelect,
}: {
  option: SearchableOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${selected ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-50'}`}
      onClick={onSelect}
    >
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-medium">
          {option.icon === 'star' ? <Star size={13} fill="currentColor" /> : null}
          {option.label}
        </span>
        {option.description ? (
          <span className="mt-0.5 block truncate text-xs text-slate-500">{option.description}</span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {option.badge ? <span className="status-chip status-chip--muted">{option.badge}</span> : null}
        {selected ? <Check size={15} /> : null}
      </span>
    </button>
  );
}

function StepHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
        {number}
      </span>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
    </div>
  );
}
