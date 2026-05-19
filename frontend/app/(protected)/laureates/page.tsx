'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, GraduationCap, Medal, MoreHorizontal, Pencil, Search, Trash2, X } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PaginationControls, type PageSizeValue } from '@/components/admin/pagination-controls';
import { PageHeader } from '@/components/admin/page-header';
import { api, PaginatedResponse } from '@/services/api';
import { confirmDelete } from '@/lib/confirm';
import { toast } from 'sonner';

type Laureate = {
  id: number;
  studentId: number;
  graduationYear: number;
  diplomaStatus: 'retrieved' | 'not_retrieved';
  proofDocumentId?: number | null;
  student: {
    fullName: string;
    sex: 'male' | 'female';
    codeEtudiant?: string | null;
    codeMassar?: string | null;
    filiere?: { name: string } | null;
    academicClass?: { name: string; year?: number } | null;
  };
};

type StudentOption = {
  id: number;
  fullName: string;
  codeMassar: string;
  filiere?: { name: string } | null;
  academicClass?: { name: string } | null;
};

type Document = { id: number; name: string };
const DEFAULT_LAUREATE_PAGE_SIZE: PageSizeValue = 25;
const resolveLimit = (pageSize: PageSizeValue) => (pageSize === 'all' ? 1000 : pageSize);
const initialMeta: PaginatedResponse<Laureate>['meta'] = {
  page: 1,
  limit: resolveLimit(DEFAULT_LAUREATE_PAGE_SIZE),
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

/* ── Searchable student combobox ─────────────────────────────────────── */
function StudentCombobox({
  selected,
  onSelect,
  disabled,
}: {
  selected: StudentOption | null;
  onSelect: (s: StudentOption | null) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {};
        if (query.trim()) params.search = query.trim();
        const res = await api.get<StudentOption[]>('/laureates/non-laureates', { params });
        setOptions(res.data);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [query, open]);

  const displayValue = selected
    ? `${selected.fullName}${selected.filiere ? ` — ${selected.filiere.name}` : ''}`
    : '';

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-8 pr-8"
          placeholder="Chercher l'étudiant par nom ou Massar…"
          value={open ? query : displayValue}
          disabled={disabled}
          onFocus={() => { setOpen(true); setQuery(''); }}
          onChange={(e) => setQuery(e.target.value)}
        />
        {selected && !open && (
          <button
            type="button"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
            onClick={() => { onSelect(null); setQuery(''); }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border bg-white shadow-lg overflow-hidden">
          {loading ? (
            <p className="px-4 py-3 text-sm text-slate-400">Recherche en cours…</p>
          ) : options.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">
              {query ? 'Aucun étudiant correspondant trouvé' : 'Tous les étudiants sont déjà des lauréats'}
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto">
              {options.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-emerald-50 transition"
                    onMouseDown={() => { onSelect(s); setOpen(false); setQuery(''); }}
                  >
                    <span className="font-medium text-slate-900">{s.fullName}</span>
                    <span className="ml-2 text-xs text-slate-400">{s.codeMassar}</span>
                    {s.filiere && (
                      <span className="ml-2 text-xs text-slate-500">· {s.filiere.name}</span>
                    )}
                    {s.academicClass && (
                      <span className="ml-1 text-xs text-slate-400">({s.academicClass.name})</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */
export default function LaureatesPage() {
  const [rows, setRows] = useState<Laureate[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeValue>(DEFAULT_LAUREATE_PAGE_SIZE);
  const [meta, setMeta] = useState<PaginatedResponse<Laureate>['meta']>(initialMeta);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openActionsId, setOpenActionsId] = useState<number | null>(null);

  // modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // form fields
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [graduationYear, setGraduationYear] = useState(String(new Date().getFullYear()));
  const [diplomaStatus, setDiplomaStatus] = useState<'retrieved' | 'not_retrieved'>('not_retrieved');
  const [proofDocumentId, setProofDocumentId] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [laureatesRes, docsRes] = await Promise.all([
        api.get<PaginatedResponse<Laureate>>('/laureates', {
          params: { page, limit: resolveLimit(pageSize) },
        }),
        api.get<Document[]>('/documents'),
      ]);
      setRows(laureatesRes.data.data);
      setMeta(laureatesRes.data.meta);
      setDocuments(docsRes.data);
    } catch {
      toast.error('Échec du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [page, pageSize, refreshKey, meta.total]);

  const resetForm = () => {
    setEditingId(null);
    setSelectedStudent(null);
    setGraduationYear(String(new Date().getFullYear()));
    setDiplomaStatus('not_retrieved');
    setProofDocumentId('');
  };

  const openCreate = () => { resetForm(); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); resetForm(); };

  const getStudentCode = (item: Laureate) => item.student.codeEtudiant ?? '—';

  const getInitials = (fullName: string) =>
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'LA';

  const getClassLabel = (item: Laureate) => {
    if (!item.student.academicClass) return 'Classe non affectée';
    const year = item.student.academicClass.year
      ? ` · Année ${item.student.academicClass.year}`
      : '';
    return `${item.student.academicClass.name}${year}`;
  };

  const openEditModal = (item: Laureate) => {
    setEditingId(item.id);
    setGraduationYear(String(item.graduationYear));
    setDiplomaStatus(item.diplomaStatus);
    setProofDocumentId(item.proofDocumentId ? String(item.proofDocumentId) : '');
    setIsModalOpen(true);
  };

  const onSubmit = async () => {
    if (!editingId && !selectedStudent) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        graduationYear: Number(graduationYear),
        diplomaStatus,
        proofDocumentId: proofDocumentId ? Number(proofDocumentId) : undefined,
      };
      if (!editingId) payload.studentId = selectedStudent!.id;

      if (editingId) {
        await api.patch(`/laureates/${editingId}`, payload);
        toast.success('Lauréat mis à jour');
      } else {
        await api.post('/laureates', payload);
        toast.success(`${selectedStudent!.fullName} ajouté comme lauréat`);
      }
      closeModal();
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Échec de l\'enregistrement';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number, name: string) => {
    if (!confirmDelete(name, 'des lauréats')) return;
    try {
      await api.delete(`/laureates/${id}`);
      toast.success('Lauréat supprimé');
      setRefreshKey((k) => k + 1);
    } catch {
      toast.error('Échec de la suppression');
    }
  };

  // stats
  const retrieved = useMemo(() => rows.filter((r) => r.diplomaStatus === 'retrieved').length, [rows]);
  const pending = rows.length - retrieved;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lauréats et Diplômes"
        description="Suivez les étudiants diplômés, l'état de récupération du diplôme et gérez les dossiers des lauréats individuellement ou via l'importation en masse."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total des lauréats" value={rows.length} hint="Tous les dossiers de graduation" icon={Medal} />
        <MetricCard label="Diplôme récupéré" value={retrieved} hint="Retraits confirmés" icon={GraduationCap} />
        <MetricCard label="En attente de récupération" value={pending} hint="Pas encore collecté" icon={GraduationCap} />
      </section>

      <section className="flex justify-end gap-2">
        <ImportDataButton onSuccess={() => setRefreshKey((k) => k + 1)} />
        <ExportDataButton />
        <button className="btn-primary" type="button" onClick={openCreate}>
          Ajouter un lauréat
        </button>
      </section>

      {loading && <div className="empty-note">Chargement des lauréats…</div>}

      {!loading && rows.length === 0 && (
        <EmptyState
          title="Pas encore de lauréats"
          description="Ajoutez des étudiants diplômés individuellement ou importez une liste CSV/Excel."
        />
      )}

      {!loading && rows.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((item) => (
            <article key={item.id} className="flex min-h-[18rem] flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-[1.4rem] border border-slate-200 bg-[#f3f5f4] text-lg font-semibold text-[#8f1d22]">
                  {getInitials(item.student.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    className="text-lg font-semibold text-slate-950 transition hover:text-emerald-700"
                    href={`/students/${item.studentId}`}
                  >
                    {item.student.fullName}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">{getClassLabel(item)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="status-chip status-chip--muted">
                      {item.student.sex === 'female' ? 'Femme' : 'Homme'}
                    </span>
                    <span className="status-chip status-chip--ok">Lauréat {item.graduationYear}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Classe</p>
                  <p className="mt-1 font-medium text-slate-900">{item.student.academicClass?.name ?? '-'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Code étudiant</p>
                  <p className="mt-1 font-medium text-slate-900">{getStudentCode(item)}</p>
                </div>
              </div>

              <div className="mt-auto pt-5">
                <div className="relative flex justify-end">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                    title={`Actions pour ${item.student.fullName}`}
                    aria-label={`Actions pour ${item.student.fullName}`}
                    onClick={() => setOpenActionsId((current) => current === item.id ? null : item.id)}
                  >
                    <MoreHorizontal size={17} />
                  </button>
                  {openActionsId === item.id ? (
                    <div className="absolute bottom-12 right-0 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                      <Link
                        className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50"
                        href={`/students/${item.studentId}`}
                      >
                        <Eye size={14} />
                        Voir le profil
                      </Link>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                        type="button"
                        onClick={() => {
                          setOpenActionsId(null);
                          openEditModal(item);
                        }}
                      >
                        <Pencil size={14} />
                        Modifier
                      </button>
                      <button
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-600 hover:bg-red-50"
                        type="button"
                        onClick={() => {
                          setOpenActionsId(null);
                          void onDelete(item.id, item.student.fullName);
                        }}
                      >
                        <Trash2 size={14} />
                        Supprimer
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {!loading && meta.total > 0 && (
        <PaginationControls
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      )}

      {/* Add / Edit modal */}
      <ModalShell
        open={isModalOpen}
        title={editingId ? 'Modifier le lauréat' : 'Ajouter un lauréat'}
        description={
          editingId
            ? 'Mettez à jour l\'année de graduation et le statut de récupération du diplôme.'
            : 'Sélectionnez un étudiant et enregistrez ses détails de graduation.'
        }
        onClose={closeModal}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onSubmit} disabled={saving || (!editingId && !selectedStudent)}>
              {saving ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Ajouter un lauréat'}
            </button>
            <button className="btn-outline" type="button" onClick={closeModal}>
              Annuler
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {!editingId && (
            <div className="field-stack">
              <label className="field-label">Étudiant</label>
              <StudentCombobox selected={selectedStudent} onSelect={setSelectedStudent} />
              <p className="text-xs text-slate-400">
                Seuls les étudiants non encore marqués comme lauréats sont affichés.
              </p>
            </div>
          )}

          {editingId && (
            <div className="field-stack">
              <label className="field-label">Étudiant</label>
              <p className="input bg-slate-50 text-slate-500 cursor-not-allowed">
                {rows.find((r) => r.id === editingId)?.student.fullName ?? '—'}
              </p>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="field-stack">
              <label className="field-label">Année de graduation</label>
              <input
                className="input"
                type="number"
                min={1950}
                max={2100}
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
              />
            </div>

            <div className="field-stack">
              <label className="field-label">Statut du diplôme</label>
              <select
                className="input"
                value={diplomaStatus}
                onChange={(e) => setDiplomaStatus(e.target.value as 'retrieved' | 'not_retrieved')}
              >
                <option value="not_retrieved">En attente de récupération</option>
                <option value="retrieved">Récupéré</option>
              </select>
            </div>
          </div>

          {documents.length > 0 && (
            <div className="field-stack">
              <label className="field-label">Document de preuve (optionnel)</label>
              <select
                className="input"
                value={proofDocumentId}
                onChange={(e) => setProofDocumentId(e.target.value)}
              >
                <option value="">Aucun</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </ModalShell>
    </div>
  );
}
