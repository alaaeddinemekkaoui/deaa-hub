'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Clock,
  FileText,
  Plus,
  Trash2,
  X,
  History,
  User,
} from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, fetchCollectionRef, getApiErrorMessage } from '@/services/api';
import { useAuth } from '@/features/auth/auth-context';
import { toast } from 'sonner';

/* ── Types ────────────────────────────────────────────────────────── */
type Status = 'pending' | 'in_progress' | 'completed' | 'refused';

type DocumentType = { id: number; name: string };

type TimelineEntry = {
  id: number;
  status: Status;
  note?: string;
  changedAt: string;
};

type Demande = {
  id: number;
  title: string;
  description?: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: number; fullName: string; role: string };
  student?: { id: number; fullName: string; codeMassar: string; filiere?: { name: string } } | null;
  documentType?: { id: number; name: string } | null;
  timeline: TimelineEntry[];
};

type StaffUser = { id: number; fullName: string };
type Student  = { id: number; fullName: string; codeMassar: string };

/* ── Constants ────────────────────────────────────────────────────── */
const STATUS_TABS: { key: Status | 'all'; label: string }[] = [
  { key: 'all',       label: 'Toutes' },
  { key: 'pending',   label: 'En attente' },
  { key: 'completed', label: 'Terminé' },
  { key: 'refused',   label: 'Refusé' },
];

const STATUS_META: Record<Status, { label: string; chip: string; dot: string }> = {
  pending:    { label: 'En attente', chip: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-400' },
  in_progress:{ label: 'En cours',   chip: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-400' },
  completed:  { label: 'Terminé',    chip: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
  refused:    { label: 'Refusé',     chip: 'bg-red-100 text-red-600',       dot: 'bg-red-400' },
};

const STATUS_ACCENT: Record<Status, string> = {
  pending:     'border-l-amber-400',
  in_progress: 'border-l-blue-400',
  completed:   'border-l-emerald-500',
  refused:     'border-l-red-400',
};

/* ── Helpers ──────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Timeline panel ───────────────────────────────────────────────── */
function TimelinePanel({ entries }: { entries: TimelineEntry[] }) {
  return (
    <div className="mt-3 ml-1 space-y-2 border-l-2 border-slate-200 pl-4">
      {entries.map((e, i) => (
        <div key={e.id} className="relative">
          <span
            className={`absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-white ${STATUS_META[e.status]?.dot ?? 'bg-slate-400'}`}
          />
          <p className="text-[11px] font-semibold text-slate-700">{STATUS_META[e.status]?.label ?? e.status}</p>
          {e.note && <p className="text-[11px] text-slate-500">{e.note}</p>}
          <p className="text-[10px] text-slate-400">{new Date(e.changedAt).toLocaleString('fr-FR')}</p>
          {i < entries.length - 1 && <div className="absolute -left-[13px] top-4 h-full w-px bg-slate-200" />}
        </div>
      ))}
    </div>
  );
}

/* ── Request card ─────────────────────────────────────────────────── */
function DemandeCard({
  item,
  isAdmin,
  onStatusChange,
  onDelete,
}: {
  item: Demande;
  isAdmin: boolean;
  onStatusChange: (id: number, status: Status, note?: string) => void;
  onDelete: (id: number) => void;
}) {
  const [showTimeline, setShowTimeline] = useState(false);
  const meta = STATUS_META[item.status];

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 border-l-4 bg-white shadow-sm ${STATUS_ACCENT[item.status]}`}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          {/* Main info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.chip}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
              {item.documentType && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                  <FileText size={10} />
                  {item.documentType.name}
                </span>
              )}
            </div>
            <h3 className="mt-1.5 text-sm font-semibold text-slate-900 leading-snug">{item.title}</h3>
            {item.description && (
              <p className="mt-0.5 text-[12px] text-slate-500 leading-snug">{item.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-400">
              {item.student && (
                <span className="flex items-center gap-1">
                  <User size={11} />
                  {item.student.fullName}
                  {item.student.filiere && ` · ${item.student.filiere.name}`}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {fmtDate(item.createdAt)}
              </span>
              <span>Chargé : {item.assignedTo.fullName}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Status changer */}
            {(isAdmin || item.status === 'pending') && (
              <select
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                value={item.status}
                onChange={(e) => onStatusChange(item.id, e.target.value as Status)}
              >
                <option value="pending">En attente</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminé</option>
                <option value="refused">Refusé</option>
              </select>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Timeline toggle */}
        {item.timeline.length > 0 && (
          <button
            type="button"
            onClick={() => setShowTimeline((v) => !v)}
            className="mt-3 flex items-center gap-1 text-[11px] font-medium text-slate-400 transition hover:text-slate-600"
          >
            <History size={11} />
            {item.timeline.length} étape{item.timeline.length > 1 ? 's' : ''}
            <ChevronDown size={11} className={`transition-transform ${showTimeline ? 'rotate-180' : ''}`} />
          </button>
        )}
        {showTimeline && <TimelinePanel entries={item.timeline} />}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
export default function DemandesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [items, setItems]       = useState<Demande[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [users, setUsers]       = useState<StaffUser[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<Status | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [formTitle, setFormTitle]   = useState('');
  const [formDesc, setFormDesc]     = useState('');
  const [formDocTypeId, setFormDocTypeId] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formAssignedId, setFormAssignedId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [demandesRes, docTypesRes, usersData, studentsData] = await Promise.all([
        api.get<Demande[]>('/workflows'),
        api.get<DocumentType[]>('/document-types'),
        fetchCollectionRef<StaffUser>('/users'),
        fetchCollectionRef<Student>('/students', { page: 1, limit: 500 }),
      ]);
      setItems(demandesRes.data);
      setDocTypes(docTypesRes.data);
      setUsers(usersData);
      setStudents(studentsData);
      if (usersData.length > 0) setFormAssignedId(String(usersData[0].id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de charger les demandes'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resetForm = () => {
    setFormTitle(''); setFormDesc(''); setFormDocTypeId('');
    setFormStudentId('');
    setFormAssignedId(users.length > 0 ? String(users[0].id) : '');
  };

  const openModal = () => { resetForm(); setModalOpen(true); };

  const onSubmit = async () => {
    if (!formTitle.trim() || !formAssignedId) {
      toast.error('Le titre et le responsable sont requis.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/workflows', {
        title: formTitle.trim(),
        description: formDesc.trim() || undefined,
        assignedToId: Number(formAssignedId),
        studentId: formStudentId ? Number(formStudentId) : undefined,
        documentTypeId: formDocTypeId ? Number(formDocTypeId) : undefined,
      });
      toast.success('Demande créée');
      setModalOpen(false);
      void load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la création'));
    } finally {
      setSaving(false);
    }
  };

  const onStatusChange = async (id: number, status: Status) => {
    try {
      await api.patch(`/workflows/${id}`, { status });
      setItems((prev) => prev.map((w) => (w.id === id ? { ...w, status } : w)));
      // Re-fetch to get updated timeline
      const res = await api.get<Demande>(`/workflows/${id}`);
      setItems((prev) => prev.map((w) => (w.id === id ? res.data : w)));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de changer le statut'));
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette demande ?')) return;
    try {
      await api.delete(`/workflows/${id}`);
      setItems((prev) => prev.filter((w) => w.id !== id));
      toast.success('Demande supprimée');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de supprimer'));
    }
  };

  const filtered = activeTab === 'all'
    ? items
    : items.filter((w) => w.status === activeTab);

  const countFor = (s: Status | 'all') =>
    s === 'all' ? items.length : items.filter((w) => w.status === s).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestion administrative"
        title="Demandes de documents"
        description="Suivez les demandes de documents administratifs des étudiants."
        actions={
          (isAdmin || user?.role === 'staff') && (
            <button type="button" className="btn-primary flex items-center gap-2" onClick={openModal}>
              <Plus size={14} />
              Nouvelle demande
            </button>
          )
        }
      />

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[12px] font-semibold transition ${
              activeTab === tab.key
                ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {countFor(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="empty-note">Chargement…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Aucune demande"
          description={activeTab === 'all' ? 'Aucune demande de document pour le moment.' : `Aucune demande avec le statut sélectionné.`}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <DemandeCard
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <ModalShell open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle demande de document">
        <div className="space-y-4">
          <div className="field-stack">
            <label className="field-label">Titre <span className="text-red-500">*</span></label>
            <input
              className="input"
              placeholder="ex: Attestation de scolarité"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
            />
          </div>

          <div className="field-stack">
            <label className="field-label">Type de document</label>
            <select className="input" value={formDocTypeId} onChange={(e) => setFormDocTypeId(e.target.value)}>
              <option value="">— Sélectionner un type —</option>
              {docTypes.map((dt) => (
                <option key={dt.id} value={dt.id}>{dt.name}</option>
              ))}
            </select>
            {docTypes.length === 0 && (
              <p className="text-[11px] text-amber-600">
                Aucun type défini. Ajoutez-en dans Paramètres → Types de documents.
              </p>
            )}
          </div>

          <div className="field-stack">
            <label className="field-label">Étudiant concerné</label>
            <select className="input" value={formStudentId} onChange={(e) => setFormStudentId(e.target.value)}>
              <option value="">— Aucun —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName} ({s.codeMassar})</option>
              ))}
            </select>
          </div>

          <div className="field-stack">
            <label className="field-label">Responsable <span className="text-red-500">*</span></label>
            <select className="input" value={formAssignedId} onChange={(e) => setFormAssignedId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>

          <div className="field-stack">
            <label className="field-label">Description / Remarques</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Informations complémentaires…"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" className="btn-outline" onClick={() => setModalOpen(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onSubmit}
              disabled={saving || !formTitle.trim() || !formAssignedId}
            >
              {saving ? 'Enregistrement…' : 'Créer la demande'}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
