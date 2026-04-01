'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, CopyPlus, GraduationCap, Plus, ShieldCheck } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { PaginationControls } from '@/components/admin/pagination-controls';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type Filiere = { id: number; name: string };
type AcademicClass = { id: number; name: string; year: number };

type AccreditationPlan = {
  id: number;
  name: string;
  academicYear: string;
  status: 'draft' | 'published' | 'archived';
  _count?: { lines: number; classAssignments: number; derivedPlans: number };
};

type PlanDiff = {
  sourcePlan: { id: number; name: string; academicYear: string } | null;
  added: Array<{ cours: { name: string } }>;
  removed: Array<{ cours: { name: string } }>;
  changed: Array<{ cours: { name: string } }>;
};

const PAGE_SIZE = 8;

export default function AccreditationsPage() {
  const [rows, setRows] = useState<AccreditationPlan[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [filiereId, setFiliereId] = useState('');
  const [sourcePlanId, setSourcePlanId] = useState('');
  const [saving, setSaving] = useState(false);

  const [assignPlanId, setAssignPlanId] = useState('');
  const [assignClassId, setAssignClassId] = useState('');
  const [assignYear, setAssignYear] = useState('');
  const [transferClassId, setTransferClassId] = useState('');
  const [transferFromYear, setTransferFromYear] = useState('');
  const [transferToYear, setTransferToYear] = useState('');
  const [transferPlanName, setTransferPlanName] = useState('');
  const [transferring, setTransferring] = useState(false);

  const [diffForPlanId, setDiffForPlanId] = useState('');
  const [diff, setDiff] = useState<PlanDiff | null>(null);

  const plansById = useMemo(
    () => Object.fromEntries(rows.map((r) => [String(r.id), r])),
    [rows],
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [plansRes, filiereRes, classRes] = await Promise.all([
          api.get<PaginatedResponse<AccreditationPlan>>('/accreditations/plans', {
            params: { page, limit: PAGE_SIZE },
          }),
          api.get<PaginatedResponse<Filiere>>('/filieres', {
            params: { page: 1, limit: 300, sortBy: 'name', sortOrder: 'asc' },
          }),
          api.get<PaginatedResponse<AcademicClass>>('/classes', {
            params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' },
          }),
        ]);

        setRows(plansRes.data.data);
        setMeta(plansRes.data.meta);
        setFilieres(filiereRes.data.data);
        setClasses(classRes.data.data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Impossible de charger les accréditations'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [page, refreshKey]);

  const resetCreate = () => {
    setName('');
    setAcademicYear('');
    setFiliereId('');
    setSourcePlanId('');
  };

  const onCreatePlan = async () => {
    if (!name.trim() || !academicYear.trim()) return;
    try {
      setSaving(true);
      await api.post('/accreditations/plans', {
        name: name.trim(),
        academicYear: academicYear.trim(),
        filiereId: filiereId ? Number(filiereId) : null,
        sourcePlanId: sourcePlanId ? Number(sourcePlanId) : null,
      });
      toast.success('Plan créé (brouillon)');
      setIsCreateOpen(false);
      resetCreate();
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Échec de la création du plan'));
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async (id: number) => {
    try {
      await api.patch(`/accreditations/plans/${id}`, { status: 'published' });
      toast.success('Plan publié');
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Échec de la publication'));
    }
  };

  const onArchive = async (id: number) => {
    try {
      await api.patch(`/accreditations/plans/${id}`, { status: 'archived' });
      toast.success('Plan archivé');
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Échec de l’archivage'));
    }
  };

  const onLoadDiff = async (id: number) => {
    try {
      const res = await api.get<PlanDiff>(`/accreditations/plans/${id}/diff`);
      setDiffForPlanId(String(id));
      setDiff(res.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible de charger le diff'));
    }
  };

  const onAssignPlan = async () => {
    if (!assignPlanId || !assignClassId || !assignYear.trim()) return;
    try {
      await api.post(`/accreditations/plans/${assignPlanId}/assignments`, {
        classId: Number(assignClassId),
        academicYear: assignYear.trim(),
      });
      toast.success('Plan affecté à la classe/année');
      setIsAssignOpen(false);
      setAssignPlanId('');
      setAssignClassId('');
      setAssignYear('');
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Échec de l’affectation'));
    }
  };

  const onTransferClassAssignment = async () => {
    if (!transferClassId || !transferFromYear.trim() || !transferToYear.trim()) {
      return;
    }

    try {
      setTransferring(true);
      await api.post(`/accreditations/classes/${transferClassId}/assignments/transfer`, {
        fromAcademicYear: transferFromYear.trim(),
        toAcademicYear: transferToYear.trim(),
        targetPlanName: transferPlanName.trim() || undefined,
      });
      toast.success('Transfert effectué vers la nouvelle année');
      setIsTransferOpen(false);
      setTransferClassId('');
      setTransferFromYear('');
      setTransferToYear('');
      setTransferPlanName('');
      setRefreshKey((k) => k + 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Échec du transfert de l’accréditation'));
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accréditation"
        title="Plans annuels versionnés"
        description="Conservez l’historique des accréditations par année et publiez de nouvelles versions sans écraser l’ancien référentiel."
      />

      <section className="flex justify-end gap-2">
        <button className="btn-outline" type="button" onClick={() => setIsTransferOpen(true)}>
          <ArrowRightLeft size={14} className="mr-1 inline" />Transférer N→N+1
        </button>
        <button className="btn-outline" type="button" onClick={() => setIsAssignOpen(true)}>
          <GraduationCap size={14} className="mr-1 inline" />Affecter à une classe
        </button>
        <button className="btn-primary" type="button" onClick={() => setIsCreateOpen(true)}>
          <Plus size={14} className="mr-1 inline" />Nouveau plan
        </button>
      </section>

      <section className="surface-card space-y-4">
        {loading ? (
          <div className="empty-note">Chargement...</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Aucun plan"
            description="Créez un brouillon ou clonez une accréditation existante pour le prochain exercice."
          />
        ) : (
          <>
            <div className="data-table-wrap">
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Année</th>
                      <th>Statut</th>
                      <th>Lignes</th>
                      <th>Affectations</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="font-medium text-slate-950">{row.name}</td>
                        <td>{row.academicYear}</td>
                        <td>
                          <span className={`status-chip ${
                            row.status === 'published'
                              ? 'status-chip--ok'
                              : row.status === 'archived'
                                ? ''
                                : 'status-chip--warn'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td>{row._count?.lines ?? 0}</td>
                        <td>{row._count?.classAssignments ?? 0}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button className="btn-outline" type="button" onClick={() => onLoadDiff(row.id)}>
                              Diff
                            </button>
                            {row.status === 'draft' ? (
                              <button className="btn-outline" type="button" onClick={() => onPublish(row.id)}>
                                <ShieldCheck size={14} className="mr-1 inline" />Publier
                              </button>
                            ) : null}
                            {row.status !== 'archived' ? (
                              <button className="btn-outline" type="button" onClick={() => onArchive(row.id)}>
                                Archiver
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <PaginationControls
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              onPageChange={setPage}
            />
          </>
        )}
      </section>

      {diff && diffForPlanId ? (
        <section className="surface-card space-y-3">
          <h2 className="panel-title">Diff du plan {plansById[diffForPlanId]?.name}</h2>
          <p className="text-sm text-slate-500">
            Source: {diff.sourcePlan ? `${diff.sourcePlan.name} (${diff.sourcePlan.academicYear})` : 'Aucune source'}
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="field-label">Ajoutés ({diff.added.length})</p>
              <ul className="text-sm text-slate-700 list-disc pl-5">
                {diff.added.slice(0, 8).map((item, idx) => <li key={`a-${idx}`}>{item.cours.name}</li>)}
              </ul>
            </div>
            <div>
              <p className="field-label">Retirés ({diff.removed.length})</p>
              <ul className="text-sm text-slate-700 list-disc pl-5">
                {diff.removed.slice(0, 8).map((item, idx) => <li key={`r-${idx}`}>{item.cours.name}</li>)}
              </ul>
            </div>
            <div>
              <p className="field-label">Modifiés ({diff.changed.length})</p>
              <ul className="text-sm text-slate-700 list-disc pl-5">
                {diff.changed.slice(0, 8).map((item, idx) => <li key={`c-${idx}`}>{item.cours.name}</li>)}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <ModalShell
        open={isCreateOpen}
        title="Créer un plan d’accréditation"
        description="Vous pouvez partir d’un plan existant (clone) pour préparer la nouvelle année."
        onClose={() => {
          setIsCreateOpen(false);
          resetCreate();
        }}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onCreatePlan} disabled={saving}>
              {saving ? 'Création...' : 'Créer'}
            </button>
            <button className="btn-outline" type="button" onClick={() => setIsCreateOpen(false)}>
              Annuler
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="field-stack">
            <label className="field-label">Nom</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field-stack">
            <label className="field-label">Année académique</label>
            <input className="input" placeholder="2026-2027" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
          </div>
          <div className="field-stack">
            <label className="field-label">Filière</label>
            <select className="input" value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
              <option value="">—</option>
              {filieres.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Cloner depuis</label>
            <select className="input" value={sourcePlanId} onChange={(e) => setSourcePlanId(e.target.value)}>
              <option value="">Aucun (plan vide)</option>
              {rows.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.academicYear})</option>
              ))}
            </select>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={isAssignOpen}
        title="Affecter un plan à une classe/année"
        description="Cette opération verrouille l’historique de la classe pour l’année donnée."
        onClose={() => setIsAssignOpen(false)}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={onAssignPlan}>
              Affecter
            </button>
            <button className="btn-outline" type="button" onClick={() => setIsAssignOpen(false)}>
              Annuler
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="field-stack">
            <label className="field-label">Plan</label>
            <select className="input" value={assignPlanId} onChange={(e) => setAssignPlanId(e.target.value)}>
              <option value="">—</option>
              {rows.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.academicYear})</option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Classe</label>
            <select className="input" value={assignClassId} onChange={(e) => setAssignClassId(e.target.value)}>
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} (A{c.year})</option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Année académique</label>
            <input className="input" placeholder="2026-2027" value={assignYear} onChange={(e) => setAssignYear(e.target.value)} />
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={isTransferOpen}
        title="Transférer l’accréditation d’une classe"
        description="Crée un nouveau plan brouillon pour l’année cible à partir du plan source, puis conserve l’historique d’origine."
        onClose={() => {
          setIsTransferOpen(false);
          setTransferClassId('');
          setTransferFromYear('');
          setTransferToYear('');
          setTransferPlanName('');
        }}
        footer={
          <>
            <button
              className="btn-primary"
              type="button"
              onClick={onTransferClassAssignment}
              disabled={transferring}
            >
              {transferring ? 'Transfert...' : 'Transférer'}
            </button>
            <button className="btn-outline" type="button" onClick={() => setIsTransferOpen(false)}>
              Annuler
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="field-stack">
            <label className="field-label">Classe</label>
            <select
              className="input"
              value={transferClassId}
              onChange={(e) => setTransferClassId(e.target.value)}
            >
              <option value="">—</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (A{c.year})
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="field-stack">
              <label className="field-label">Année source</label>
              <input
                className="input"
                placeholder="2025-2026"
                value={transferFromYear}
                onChange={(e) => setTransferFromYear(e.target.value)}
              />
            </div>
            <div className="field-stack">
              <label className="field-label">Année cible</label>
              <input
                className="input"
                placeholder="2026-2027"
                value={transferToYear}
                onChange={(e) => setTransferToYear(e.target.value)}
              />
            </div>
          </div>
          <div className="field-stack">
            <label className="field-label">Nom du plan cible (optionnel)</label>
            <input
              className="input"
              placeholder="Laisser vide pour nom automatique"
              value={transferPlanName}
              onChange={(e) => setTransferPlanName(e.target.value)}
            />
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
