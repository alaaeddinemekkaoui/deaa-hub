'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Barcode, CalendarDays, CheckCircle2, CreditCard, QrCode, ReceiptText, Search, Utensils, XCircle } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import { api, getApiErrorMessage, type PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type Meal = { id: number; name: string; price: number; active: boolean };
type Student = { id: number; fullName: string; codeMassar?: string; codeEtudiant?: string | null };
type Wallet = { studentId: number; balance: number };
type ReservationStatus = 'confirmed' | 'cancelled' | 'consumed' | 'expired';
type Reservation = {
  id: number;
  receiptNumber: string;
  ticketCode?: string | null;
  ticketIssuedAt?: string | null;
  consumedAt?: string | null;
  cancelledAt?: string | null;
  reservationDate: string;
  quantity: number;
  totalPrice: number;
  status: ReservationStatus;
  createdAt: string;
  meal: Meal;
  student: Student;
  reservedBy: { fullName: string; role: string };
};
type Transaction = {
  id: number;
  type: 'credit' | 'debit' | 'adjustment';
  amount: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
  actor: { fullName: string; role: string };
};
type TicketValidation = { valid: boolean; reason: string; reservation?: Reservation };
type TabKey = 'reservations' | 'transactions';

const formatMoney = (value: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(value || 0);

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function buildDateRange(start: string, end: string) {
  if (!start || !end) return [];
  const dates: string[] = [];
  const cursor = parseIsoDate(start);
  const last = parseIsoDate(end < start ? start : end);
  while (cursor <= last && dates.length < 45) {
    dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function statusLabel(status: ReservationStatus) {
  return {
    confirmed: 'Reserve',
    cancelled: 'Annule',
    consumed: 'Consomme',
    expired: 'Expire',
  }[status];
}

function statusClass(status: ReservationStatus) {
  if (status === 'confirmed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'consumed') return 'bg-blue-50 text-blue-700';
  if (status === 'cancelled') return 'bg-slate-100 text-slate-500';
  return 'bg-amber-50 text-amber-700';
}

function TicketPreview({ reservation }: { reservation: Reservation }) {
  const [qrSrc, setQrSrc] = useState('');
  const barcodeRef = useRef<SVGSVGElement | null>(null);
  const code = reservation.ticketCode ?? '';

  useEffect(() => {
    let mounted = true;
    if (!code) return;

    QRCode.toDataURL(code, { margin: 1, width: 180 })
      .then((src) => {
        if (mounted) setQrSrc(src);
      })
      .catch(() => setQrSrc(''));

    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, code, {
        format: 'CODE128',
        displayValue: false,
        height: 48,
        margin: 0,
      });
    }

    return () => {
      mounted = false;
    };
  }, [code]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-800">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <p className="text-lg font-bold text-slate-950">Ticket restauration</p>
          <p className="text-slate-500">DEAA Hub</p>
        </div>
        <p className="font-mono text-xs">{code}</p>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <p><strong>Etudiant:</strong> {reservation.student.fullName}</p>
          <p><strong>Code:</strong> {reservation.student.codeEtudiant || reservation.student.codeMassar || '-'}</p>
          <p><strong>Repas:</strong> {reservation.meal.name}</p>
          <p><strong>Date:</strong> {reservation.reservationDate}</p>
          <p><strong>Statut:</strong> {statusLabel(reservation.status)}</p>
        </div>
        <div className="grid justify-items-center gap-3">
          {qrSrc ? <img src={qrSrc} alt="QR ticket" className="h-36 w-36" /> : <QrCode size={96} className="text-slate-300" />}
          <svg ref={barcodeRef} className="max-w-[220px]" />
        </div>
      </div>
    </div>
  );
}

export default function RestaurationPage() {
  const { user } = useAuth();
  const canManage = ['admin', 'staff', 'restauration'].includes(user?.role ?? '');

  const [meals, setMeals] = useState<Meal[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('reservations');

  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [savingReservation, setSavingReservation] = useState(false);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [adjustBalance, setAdjustBalance] = useState('');
  const [savingWallet, setSavingWallet] = useState(false);

  const [receipt, setReceipt] = useState<Reservation | null>(null);
  const [ticket, setTicket] = useState<Reservation | null>(null);
  const [scanCode, setScanCode] = useState('');
  const [validation, setValidation] = useState<TicketValidation | null>(null);

  const activeMeals = useMemo(() => meals.filter((meal) => meal.active), [meals]);
  const dates = useMemo(() => buildDateRange(startDate, endDate), [startDate, endDate]);
  const selectedStudent = students.find((student) => String(student.id) === selectedStudentId) ?? null;

  const visibleStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students.slice(0, 80);
    return students
      .filter((student) =>
        `${student.fullName} ${student.codeMassar ?? ''} ${student.codeEtudiant ?? ''}`.toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [students, studentQuery]);

  const selectedItems = useMemo(() => {
    const mealById = new Map(activeMeals.map((meal) => [meal.id, meal]));
    return [...selectedKeys]
      .map((key) => {
        const [date, mealIdText] = key.split(':');
        const mealId = Number(mealIdText);
        const meal = mealById.get(mealId);
        return meal ? { reservationDate: date, mealId, price: meal.price } : null;
      })
      .filter(Boolean) as { reservationDate: string; mealId: number; price: number }[];
  }, [activeMeals, selectedKeys]);

  const total = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const hasEnoughSolde = (wallet?.balance ?? 0) >= total;
  const allKeys = useMemo(() => dates.flatMap((date) => activeMeals.map((meal) => `${date}:${meal.id}`)), [activeMeals, dates]);
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selectedKeys.has(key));
  const today = todayIso();
  const todayReservations = reservations.filter((item) => item.reservationDate === today && item.status === 'confirmed');
  const consumedOrTicketed = reservations.filter((item) => item.ticketCode || item.status === 'consumed');

  const loadMeals = useCallback(async () => {
    const res = await api.get<Meal[]>('/restauration/meals');
    setMeals(res.data);
  }, []);

  const loadStudentData = useCallback(async (studentId?: string) => {
    const params = studentId ? { studentId } : undefined;
    const [walletRes, reservationsRes, transactionsRes] = await Promise.all([
      canManage && studentId
        ? api.get<Wallet>(`/restauration/wallets/${studentId}`)
        : api.get<Wallet>('/restauration/wallets/me'),
      api.get<Reservation[]>('/restauration/reservations', { params }),
      api.get<Transaction[]>('/restauration/transactions', { params }),
    ]);
    setWallet(walletRes.data);
    setReservations(reservationsRes.data);
    setTransactions(transactionsRes.data);
    setAdjustBalance(String(walletRes.data.balance));
  }, [canManage]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      await loadMeals();
      if (canManage) {
        const studentsRes = await api.get<PaginatedResponse<Student>>('/students', { params: { page: 1, limit: 500 } });
        setStudents(studentsRes.data.data);
        const firstStudentId = studentsRes.data.data[0] ? String(studentsRes.data.data[0].id) : '';
        setSelectedStudentId(firstStudentId);
        if (firstStudentId) await loadStudentData(firstStudentId);
      } else {
        await loadStudentData();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de charger la restauration'));
    } finally {
      setLoading(false);
    }
  }, [canManage, loadMeals, loadStudentData]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const changeStudent = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setTicket(null);
    setValidation(null);
    if (!studentId) return;
    try {
      await loadStudentData(studentId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de charger le profil'));
    }
  };

  const toggleCell = (key: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedKeys(() => (allSelected ? new Set() : new Set(allKeys)));
  };

  const reserveMeals = async () => {
    if (canManage && !selectedStudentId) {
      toast.error('Selectionnez un etudiant');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Selectionnez au moins un repas');
      return;
    }
    if (!hasEnoughSolde) {
      toast.error('Solde insuffisant');
      return;
    }

    setSavingReservation(true);
    try {
      const res = await api.post<{
        reservations: Reservation[];
        skipped?: { mealId: number; mealName: string; reservationDate: string }[];
        balanceAfter: number;
        totalPrice: number;
      }>('/restauration/reservations/bulk', {
        studentId: canManage ? Number(selectedStudentId) : undefined,
        items: selectedItems.map(({ mealId, reservationDate }) => ({ mealId, reservationDate })),
      });
      setWallet((current) => current ? { ...current, balance: res.data.balanceAfter } : current);
      setSelectedKeys(new Set());
      const reservedCount = res.data.reservations.length;
      const skippedCount = res.data.skipped?.length ?? 0;
      if (reservedCount > 0 && skippedCount > 0) {
        toast.success(`${reservedCount} repas reserve${reservedCount > 1 ? 's' : ''}, ${skippedCount} deja reserve${skippedCount > 1 ? 's' : ''} ignore${skippedCount > 1 ? 's' : ''}`);
      } else {
        toast.success(`${reservedCount} repas reserve${reservedCount > 1 ? 's' : ''}`);
      }
      await loadStudentData(canManage ? selectedStudentId : undefined);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Reservation impossible'));
    } finally {
      setSavingReservation(false);
    }
  };

  const cancelReservation = async (reservation: Reservation) => {
    try {
      const res = await api.patch<{ reservation: Reservation; balanceAfter: number }>(`/restauration/reservations/${reservation.id}/cancel`);
      setWallet((current) => current ? { ...current, balance: res.data.balanceAfter } : current);
      toast.success('Reservation annulee');
      await loadStudentData(canManage ? selectedStudentId : undefined);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Annulation impossible'));
    }
  };

  const creditWallet = async () => {
    if (!selectedStudentId || !creditAmount) return;
    setSavingWallet(true);
    try {
      await api.post('/restauration/wallets/credit', { studentId: Number(selectedStudentId), amount: Number(creditAmount) });
      setCreditAmount('');
      toast.success('Solde ajoute');
      await loadStudentData(selectedStudentId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Recharge impossible'));
    } finally {
      setSavingWallet(false);
    }
  };

  const adjustWalletValue = async () => {
    if (!selectedStudentId || adjustBalance === '') return;
    setSavingWallet(true);
    try {
      await api.post('/restauration/wallets/adjust', { studentId: Number(selectedStudentId), balance: Number(adjustBalance) });
      toast.success('Solde mis a jour');
      await loadStudentData(selectedStudentId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Mise a jour impossible'));
    } finally {
      setSavingWallet(false);
    }
  };

  const issueTicket = async (reservation: Reservation) => {
    try {
      const res = await api.post<Reservation>('/restauration/tickets/issue', { reservationId: reservation.id });
      setTicket(res.data);
      toast.success('Ticket genere');
      await loadStudentData(selectedStudentId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Ticket impossible'));
    }
  };

  const validateTicket = async () => {
    if (!scanCode.trim()) return;
    try {
      const res = await api.get<TicketValidation>(`/restauration/tickets/validate/${encodeURIComponent(scanCode.trim())}`);
      setValidation(res.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Validation impossible'));
    }
  };

  const consumeTicket = async () => {
    if (!scanCode.trim()) return;
    try {
      const res = await api.post<Reservation>('/restauration/tickets/consume', { code: scanCode.trim() });
      setTicket(res.data);
      setValidation({ valid: false, reason: 'Ticket consomme', reservation: res.data });
      toast.success('Repas marque consomme');
      await loadStudentData(selectedStudentId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Consommation impossible'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Restauration"
        title="Reservations repas"
        description="Selection par dates, solde restauration, tickets QR/barcode et historique."
      />

      {loading ? (
        <div className="surface-card empty-note">Chargement...</div>
      ) : (
        <>
          {canManage && (
            <section className="surface-card space-y-4">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Profil restauration</h2>
                  <p className="panel-copy">Selectionnez un etudiant pour reserver, recharger ou sortir un ticket.</p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
                <div className="field-stack">
                  <label className="field-label">Recherche etudiant</label>
                  <div className="relative">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className="input pl-9" value={studentQuery} onChange={(event) => setStudentQuery(event.target.value)} placeholder="Nom, code..." />
                  </div>
                </div>
                <div className="field-stack">
                  <label className="field-label">Etudiant</label>
                  <select className="input" value={selectedStudentId} onChange={(event) => void changeStudent(event.target.value)}>
                    <option value="">-- selectionner --</option>
                    {visibleStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.fullName} {student.codeMassar ? `- ${student.codeMassar}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="surface-card flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Solde</p>
                <p className="text-2xl font-semibold text-slate-950">{formatMoney(wallet?.balance ?? 0)}</p>
                <p className="text-xs text-slate-400">{canManage ? selectedStudent?.fullName ?? 'Aucun etudiant' : 'Votre solde'}</p>
              </div>
            </div>
            <div className="surface-card flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Utensils size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Repas actifs</p>
                <p className="text-2xl font-semibold text-slate-950">{activeMeals.length}</p>
                <p className="text-xs text-slate-400">Depuis parametres</p>
              </div>
            </div>
            <div className="surface-card flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <ReceiptText size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Reservations</p>
                <p className="text-2xl font-semibold text-slate-950">{reservations.length}</p>
                <p className="text-xs text-slate-400">Profil courant</p>
              </div>
            </div>
          </section>

          {canManage && (
            <section className="surface-card flex items-center justify-between gap-4">
              <div>
                <h2 className="panel-title">Gestion du solde</h2>
                <p className="panel-copy">Ajouter ou modifier le solde de l&apos;etudiant selectionne.</p>
              </div>
              <button
                className="btn-primary"
                type="button"
                onClick={() => setWalletModalOpen(true)}
                disabled={!selectedStudentId}
              >
                Ajouter / modifier solde
              </button>
            </section>
          )}

          <section className="surface-card space-y-4">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Reserver repas</h2>
                <p className="panel-copy">Choisissez debut/fin, puis cochez les repas par jour.</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[180px_180px_1fr]">
              <div className="field-stack">
                <label className="field-label">Date debut</label>
                <input className="input" type="date" min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </div>
              <div className="field-stack">
                <label className="field-label">Date fin</label>
                <input className="input" type="date" min={today} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <button className="btn-outline" type="button" onClick={toggleAll} disabled={allKeys.length === 0}>
                  {allSelected ? 'Tout retirer' : 'Tout selectionner'}
                </button>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">
                  <span className="text-slate-500">Total: </span>
                  <strong className="text-slate-950">{formatMoney(total)}</strong>
                  <span className="ml-3 text-slate-500">Solde: </span>
                  <strong className="text-slate-950">{formatMoney(wallet?.balance ?? 0)}</strong>
                </div>
              </div>
            </div>

            {activeMeals.length === 0 ? (
              <EmptyState title="Aucun repas actif" description="Admin doit activer les repas dans Parametres." />
            ) : (
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Date</th>
                      {activeMeals.map((meal) => (
                        <th key={meal.id}>
                          {meal.name}
                          <p className="text-xs font-normal text-slate-400">{formatMoney(meal.price)}</p>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dates.map((date) => (
                      <tr key={date}>
                        <td>
                          <span className="inline-flex items-center gap-2 font-medium text-slate-950">
                            <CalendarDays size={14} className="text-emerald-700" />
                            {date}
                          </span>
                        </td>
                        {activeMeals.map((meal) => {
                          const key = `${date}:${meal.id}`;
                          return (
                            <td key={key}>
                              <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:border-emerald-300">
                                <input className="h-4 w-4" type="checkbox" checked={selectedKeys.has(key)} onChange={() => toggleCell(key)} />
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!hasEnoughSolde && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Solde insuffisant</p>}
            <button className="btn-primary" type="button" onClick={reserveMeals} disabled={savingReservation || selectedItems.length === 0 || !hasEnoughSolde || (canManage && !selectedStudentId)}>
              {savingReservation ? 'Reservation...' : `Reserver ${selectedItems.length} repas`}
            </button>
          </section>

          <section className="surface-card space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['reservations', 'transactions'] as TabKey[]).map((tab) => (
                <button key={tab} className={cn('btn-outline', activeTab === tab && 'border-emerald-500 bg-emerald-50 text-emerald-800')} type="button" onClick={() => setActiveTab(tab)}>
                  {tab === 'reservations' ? 'Reservations' : 'Transactions solde'}
                </button>
              ))}
            </div>

            {activeTab === 'reservations' && (
              <div className="space-y-4">
                {canManage && (
                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <h3 className="font-semibold text-slate-950">Tickets du jour</h3>
                    {todayReservations.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">Aucun repas reserve pour aujourd&apos;hui.</p>
                    ) : (
                      <div className="mt-3 grid gap-2">
                        {todayReservations.map((item) => (
                          <button key={item.id} type="button" className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-emerald-300" onClick={() => issueTicket(item)}>
                            <span>
                              <span className="block font-medium text-slate-950">{item.meal.name}</span>
                              <span className="text-xs text-slate-400">{item.student.fullName}</span>
                            </span>
                            <span className="text-xs font-semibold text-emerald-700">{item.ticketCode ? 'Voir ticket' : 'Sortir ticket'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {canManage && (
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                      <h3 className="font-semibold text-slate-950">Historique tickets</h3>
                      {consumedOrTicketed.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500">Aucun ticket sorti.</p>
                      ) : (
                        <div className="mt-3 table-scroll">
                          <table className="table-base">
                            <thead><tr><th>Date</th><th>Repas</th><th>Code</th><th>Statut</th></tr></thead>
                            <tbody>
                              {consumedOrTicketed.map((item) => (
                                <tr key={item.id}>
                                  <td>{item.reservationDate}</td>
                                  <td>{item.meal.name}</td>
                                  <td className="font-mono text-xs">{item.ticketCode ?? '-'}</td>
                                  <td><span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusClass(item.status))}>{statusLabel(item.status)}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <h3 className="font-semibold text-slate-950">Scanner ticket</h3>
                        <div className="mt-3 field-stack">
                          <label className="field-label">QR / barcode</label>
                          <input className="input" value={scanCode} onChange={(event) => setScanCode(event.target.value)} placeholder="TCK-..." />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button className="btn-outline" type="button" onClick={validateTicket}>Verifier</button>
                          <button className="btn-primary" type="button" onClick={consumeTicket}>Valider repas</button>
                        </div>
                        {validation && (
                          <div className={cn('mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold', validation.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                            {validation.valid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                            {validation.reason}
                          </div>
                        )}
                        {validation?.reservation && (
                          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                            <p><strong>Etudiant:</strong> {validation.reservation.student.fullName}</p>
                            <p><strong>Code:</strong> {validation.reservation.student.codeEtudiant || validation.reservation.student.codeMassar || '-'}</p>
                            <p><strong>Repas:</strong> {validation.reservation.meal.name}</p>
                            <p><strong>Date:</strong> {validation.reservation.reservationDate}</p>
                          </div>
                        )}
                      </div>
                      {ticket ? <TicketPreview reservation={ticket} /> : (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-400">
                          <Barcode className="mx-auto mb-2" />
                          Ticket sort ici
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {reservations.length === 0 ? <EmptyState title="Aucune reservation" description="Les reservations apparaitront ici." /> : (
                  <div className="table-scroll">
                    <table className="table-base">
                      <thead><tr><th>Recu</th><th>Repas</th><th>Date</th><th>Statut</th><th>Total</th><th>Actions</th></tr></thead>
                      <tbody>
                        {reservations.map((item) => {
                          const cancellable = item.status === 'confirmed' && !item.consumedAt && item.reservationDate >= today;
                          return (
                            <tr key={item.id}>
                              <td>{item.receiptNumber}</td>
                              <td>{item.meal.name}</td>
                              <td>{item.reservationDate}</td>
                              <td><span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusClass(item.status))}>{statusLabel(item.status)}</span></td>
                              <td>{formatMoney(item.totalPrice)}</td>
                              <td>
                                <div className="flex flex-wrap gap-2">
                                  <button className="btn-outline" type="button" onClick={() => setReceipt(item)}>Recu</button>
                                  {cancellable && <button className="btn-outline" type="button" onClick={() => cancelReservation(item)}>Annuler</button>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transactions' && (
              transactions.length === 0 ? <EmptyState title="Aucune transaction" description="Recharges, ajustements et debits apparaitront ici." /> : (
                <div className="table-scroll">
                  <table className="table-base">
                    <thead><tr><th>Type</th><th>Montant</th><th>Solde</th><th>Par</th></tr></thead>
                    <tbody>
                      {transactions.map((item) => (
                        <tr key={item.id}>
                          <td>{item.type}<p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString('fr-FR')}</p></td>
                          <td>{formatMoney(item.amount)}</td>
                          <td>{formatMoney(item.balanceAfter)}</td>
                          <td>{item.actor.fullName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </section>
        </>
      )}

      <ModalShell
        open={walletModalOpen}
        title="Ajouter / modifier solde"
        description="Recharge rapide ou ajustement complet du solde restauration."
        onClose={() => setWalletModalOpen(false)}
        footer={
          <button className="btn-outline" type="button" onClick={() => setWalletModalOpen(false)}>
            Fermer
          </button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="field-stack">
            <label className="field-label">Montant a ajouter</label>
            <input className="input" type="number" min="0" step="0.5" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} />
            <button className="btn-primary" type="button" onClick={creditWallet} disabled={savingWallet || !selectedStudentId || !creditAmount}>Ajouter</button>
          </div>
          <div className="field-stack">
            <label className="field-label">Nouveau solde</label>
            <input className="input" type="number" min="0" step="0.5" value={adjustBalance} onChange={(event) => setAdjustBalance(event.target.value)} />
            <button className="btn-outline" type="button" onClick={adjustWalletValue} disabled={savingWallet || !selectedStudentId || adjustBalance === ''}>Modifier</button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={Boolean(receipt)}
        title="Recu restauration"
        description="Trace paiement et reservation."
        onClose={() => setReceipt(null)}
        footer={
          <>
            <button className="btn-primary" type="button" onClick={() => window.print()}>Imprimer</button>
            <button className="btn-outline" type="button" onClick={() => setReceipt(null)}>Fermer</button>
          </>
        }
      >
        {receipt && (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-800">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-lg font-bold text-slate-950">DEAA Hub</p>
                <p className="text-slate-500">Recu restauration</p>
              </div>
              <p className="font-mono text-xs">{receipt.receiptNumber}</p>
            </div>
            <div className="mt-4 grid gap-2">
              <p><strong>Etudiant:</strong> {receipt.student.fullName}</p>
              <p><strong>Repas:</strong> {receipt.meal.name}</p>
              <p><strong>Date reservation:</strong> {receipt.reservationDate}</p>
              <p><strong>Total paye:</strong> {formatMoney(receipt.totalPrice)}</p>
              <p><strong>Reserve par:</strong> {receipt.reservedBy.fullName}</p>
              <p><strong>Statut:</strong> {statusLabel(receipt.status)}</p>
              <p className="text-xs text-slate-400">Cree le {new Date(receipt.createdAt).toLocaleString('fr-FR')}</p>
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
}
