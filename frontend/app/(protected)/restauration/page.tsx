'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CreditCard, QrCode, ReceiptText, Utensils } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';
import { StudentLookup } from './_components/student-lookup';
import type {
  Meal,
  Reservation,
  StudentLookupResult,
  Transaction,
  Wallet,
} from './_components/types';
import {
  buildDateRange,
  formatMoney,
  statusClass,
  statusLabel,
  todayIso,
} from './utils';

type TabKey = 'reservations' | 'transactions';

export default function RestaurationPage() {
  const { user } = useAuth();
  const canManage = ['admin', 'staff', 'restauration'].includes(user?.role ?? '');

  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentLookupResult | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
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

  const selectedStudentId = selectedStudent ? String(selectedStudent.id) : '';
  const activeMeals = useMemo(() => meals.filter((meal) => meal.active), [meals]);
  const dates = useMemo(() => buildDateRange(startDate, endDate), [startDate, endDate]);

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
  const reservedKeys = useMemo(
    () =>
      new Set(
        reservations
          .filter((item) => ['confirmed', 'consumed'].includes(item.status))
          .map((item) => `${item.reservationDate}:${item.meal.id}`),
      ),
    [reservations],
  );
  const allKeys = useMemo(
    () =>
      dates
        .flatMap((date) => activeMeals.map((meal) => `${date}:${meal.id}`))
        .filter((key) => !reservedKeys.has(key)),
    [activeMeals, dates, reservedKeys],
  );
  const allSelected = allKeys.length > 0 && allKeys.every((key) => selectedKeys.has(key));
  const today = todayIso();

  const loadMeals = useCallback(async () => {
    const res = await api.get<Meal[]>('/restauration/meals');
    setMeals(res.data);
  }, []);

  const resetStudentData = useCallback(() => {
    setWallet(null);
    setReservations([]);
    setTransactions([]);
    setAdjustBalance('');
    setSelectedKeys(new Set());
    setReceipt(null);
  }, []);

  const loadStudentData = useCallback(
    async (studentId?: string) => {
      if (canManage && !studentId) {
        resetStudentData();
        return;
      }

      setProfileLoading(true);
      try {
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
      } finally {
        setProfileLoading(false);
      }
    },
    [canManage, resetStudentData],
  );

  useEffect(() => {
    const loadInitial = async () => {
      setLoading(true);
      try {
        await loadMeals();
        if (!canManage) {
          if (user?.studentProfile) {
            await loadStudentData();
          } else {
            resetStudentData();
          }
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger la restauration'));
      } finally {
        setLoading(false);
      }
    };

    void loadInitial();
  }, [canManage, loadMeals, loadStudentData, resetStudentData, user?.studentProfile]);

  const handleStudentSelect = async (student: StudentLookupResult) => {
    setSelectedStudent(student);
    try {
      await loadStudentData(String(student.id));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de charger le profil'));
    }
  };

  const handleStudentClear = () => {
    setSelectedStudent(null);
    resetStudentData();
  };

  const toggleCell = (key: string) => {
    if (reservedKeys.has(key)) return;
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
      }>('/restauration/reservations/bulk', {
        studentId: canManage ? Number(selectedStudentId) : undefined,
        items: selectedItems.map(({ mealId, reservationDate }) => ({ mealId, reservationDate })),
      });

      setWallet((current) => (current ? { ...current, balance: res.data.balanceAfter } : current));
      setSelectedKeys(new Set());
      const reservedCount = res.data.reservations.length;
      const skippedCount = res.data.skipped?.length ?? 0;

      if (reservedCount > 0 && skippedCount > 0) {
        toast.success(
          `${reservedCount} repas reserve${reservedCount > 1 ? 's' : ''}, ${skippedCount} deja reserve${skippedCount > 1 ? 's' : ''} ignore${skippedCount > 1 ? 's' : ''}`,
        );
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
      const res = await api.patch<{ reservation: Reservation; balanceAfter: number }>(
        `/restauration/reservations/${reservation.id}/cancel`,
      );
      setWallet((current) => (current ? { ...current, balance: res.data.balanceAfter } : current));
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
      await api.post('/restauration/wallets/credit', {
        studentId: Number(selectedStudentId),
        amount: Number(creditAmount),
      });
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
      await api.post('/restauration/wallets/adjust', {
        studentId: Number(selectedStudentId),
        balance: Number(adjustBalance),
      });
      toast.success('Solde mis a jour');
      await loadStudentData(selectedStudentId);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Mise a jour impossible'));
    } finally {
      setSavingWallet(false);
    }
  };

  const needsStudentSelection = canManage && !selectedStudentId;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Restauration"
        title="Reservations repas"
        description="Reservations par dates, solde restauration et historique. La verification ticket est desormais sur sa propre page."
        actions={
          canManage ? (
            <Link className="btn-outline flex items-center gap-2" href="/restauration/verification">
              <QrCode size={14} />
              Verification tickets
            </Link>
          ) : (
            <Link className="btn-outline flex items-center gap-2" href="/restauration/tickets">
              <ReceiptText size={14} />
              Mes tickets
            </Link>
          )
        }
      />

      {loading ? (
        <div className="surface-card empty-note">Chargement...</div>
      ) : !canManage && !user?.studentProfile ? (
        <section className="surface-card">
          <EmptyState
            title="Profil étudiant non lié"
            description="Votre compte étudiant n'est pas encore lié à une fiche étudiant. Connectez-vous avec le code étudiant ou demandez à l'administration de créer le compte depuis la fiche étudiant."
          />
        </section>
      ) : (
        <>
          {canManage && (
            <StudentLookup
              selectedStudent={selectedStudent}
              onSelect={handleStudentSelect}
              onClear={handleStudentClear}
            />
          )}

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="surface-card flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Solde</p>
                <p className="text-2xl font-semibold text-slate-950">{formatMoney(wallet?.balance ?? 0)}</p>
                <p className="text-xs text-slate-400">
                  {canManage ? selectedStudent?.fullName ?? 'Aucun etudiant' : 'Votre solde'}
                </p>
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

            {needsStudentSelection ? (
              <EmptyState
                title="Cherchez un etudiant"
                description="Aucun profil n&apos;est charge tant que vous n&apos;avez pas lance une recherche."
              />
            ) : (
              <>
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
                              const alreadyReserved = reservedKeys.has(key);
                              return (
                                <td key={key}>
                                  <label
                                    className={cn(
                                      'inline-flex h-10 min-w-[6.5rem] items-center justify-center rounded-lg border px-3 text-xs font-semibold transition',
                                      alreadyReserved
                                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                        : 'cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-emerald-300',
                                    )}
                                  >
                                    {alreadyReserved ? (
                                      'Réservé'
                                    ) : (
                                      <input
                                        className="h-4 w-4"
                                        type="checkbox"
                                        checked={selectedKeys.has(key)}
                                        onChange={() => toggleCell(key)}
                                      />
                                    )}
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

                {!hasEnoughSolde && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    Solde insuffisant
                  </p>
                )}
                <button
                  className="btn-primary"
                  type="button"
                  onClick={reserveMeals}
                  disabled={savingReservation || selectedItems.length === 0 || !hasEnoughSolde || needsStudentSelection}
                >
                  {savingReservation ? 'Reservation...' : `Reserver ${selectedItems.length} repas`}
                </button>
              </>
            )}
          </section>

          <section className="surface-card space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['reservations', 'transactions'] as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  className={cn(
                    'btn-outline',
                    activeTab === tab && 'border-emerald-500 bg-emerald-50 text-emerald-800',
                  )}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'reservations' ? 'Reservations' : 'Transactions solde'}
                </button>
              ))}
            </div>

            {needsStudentSelection ? (
              <EmptyState
                title="Aucun profil actif"
                description="Cherchez un etudiant pour afficher ses reservations et son historique."
              />
            ) : profileLoading ? (
              <div className="empty-note">Chargement du profil restauration...</div>
            ) : activeTab === 'reservations' ? (
              reservations.length === 0 ? (
                <EmptyState title="Aucune reservation" description="Les reservations apparaitront ici." />
              ) : (
                <div className="table-scroll">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Recu</th>
                        <th>Repas</th>
                        <th>Date</th>
                        <th>Statut</th>
                        <th>Total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.map((item) => {
                        const cancellable =
                          item.status === 'confirmed' && !item.consumedAt && item.reservationDate >= today;
                        return (
                          <tr key={item.id}>
                            <td>{item.receiptNumber}</td>
                            <td>{item.meal.name}</td>
                            <td>{item.reservationDate}</td>
                            <td>
                              <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusClass(item.status))}>
                                {statusLabel(item.status)}
                              </span>
                            </td>
                            <td>{formatMoney(item.totalPrice)}</td>
                            <td>
                              <div className="flex flex-wrap gap-2">
                                <button className="btn-outline" type="button" onClick={() => setReceipt(item)}>
                                  Recu
                                </button>
                                {cancellable && (
                                  <button className="btn-outline" type="button" onClick={() => cancelReservation(item)}>
                                    Annuler
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : transactions.length === 0 ? (
              <EmptyState title="Aucune transaction" description="Recharges, ajustements et debits apparaitront ici." />
            ) : (
              <div className="table-scroll">
                <table className="table-base">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Montant</th>
                      <th>Solde</th>
                      <th>Par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {item.type}
                          <p className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleString('fr-FR')}</p>
                        </td>
                        <td>{formatMoney(item.amount)}</td>
                        <td>{formatMoney(item.balanceAfter)}</td>
                        <td>{item.actor.fullName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
            <button className="btn-primary" type="button" onClick={creditWallet} disabled={savingWallet || !selectedStudentId || !creditAmount}>
              Ajouter
            </button>
          </div>
          <div className="field-stack">
            <label className="field-label">Nouveau solde</label>
            <input className="input" type="number" min="0" step="0.5" value={adjustBalance} onChange={(event) => setAdjustBalance(event.target.value)} />
            <button className="btn-outline" type="button" onClick={adjustWalletValue} disabled={savingWallet || !selectedStudentId || adjustBalance === ''}>
              Modifier
            </button>
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
            <button className="btn-primary" type="button" onClick={() => window.print()}>
              Imprimer
            </button>
            <button className="btn-outline" type="button" onClick={() => setReceipt(null)}>
              Fermer
            </button>
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
