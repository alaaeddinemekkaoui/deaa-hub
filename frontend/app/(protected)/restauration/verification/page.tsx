'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Barcode, CheckCircle2, ScanLine, Ticket, XCircle } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { MobileQRScanner } from '@/components/scanner/mobile-qr-scanner';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';
import { StudentLookup } from '../_components/student-lookup';
import { TicketPreview } from '../_components/ticket-preview';
import type { Meal, Reservation, StudentLookupResult, TicketValidation } from '../_components/types';
import { statusClass, statusLabel, todayIso } from '../utils';

function studentClassLabel(student: StudentLookupResult) {
  if (!student.academicClass) return '-';
  return [
    student.academicClass.name,
    student.academicClass.year ? `Année ${student.academicClass.year}` : '',
    student.academicClass.semestre ?? '',
  ].filter(Boolean).join(' · ');
}

function TicketLookupCard({
  validation,
  loading,
  message,
}: {
  validation: TicketValidation | null;
  loading: boolean;
  message: string;
}) {
  if (loading) {
    return (
      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
        Recherche du ticket...
      </div>
    );
  }

  if (message) {
    return (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
        {message}
      </div>
    );
  }

  if (!validation) return null;

  if (!validation.reservation) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
        <XCircle size={16} />
        {validation.reason}
      </div>
    );
  }

  const reservation = validation.reservation;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-slate-950">{reservation.student.fullName}</p>
          <p className="text-xs text-slate-500">{reservation.student.codeEtudiant || reservation.student.codeMassar || '-'}</p>
        </div>
        <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusClass(reservation.status))}>
          {statusLabel(reservation.status)}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
        <p><strong>Classe:</strong> {studentClassLabel(reservation.student)}</p>
        <p><strong>Repas:</strong> {reservation.meal.name}</p>
        <p><strong>Date:</strong> {reservation.reservationDate}</p>
        <p><strong>Ticket:</strong> <span className="font-mono">{reservation.ticketCode ?? '-'}</span></p>
      </div>
      <div className={cn('mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold', validation.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
        {validation.valid ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
        {validation.reason}
      </div>
    </div>
  );
}

export default function RestaurationVerificationPage() {
  const { user } = useAuth();
  const canManage = ['admin', 'staff', 'restauration'].includes(user?.role ?? '');

  const [selectedStudent, setSelectedStudent] = useState<StudentLookupResult | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [autoMealId, setAutoMealId] = useState('');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [validation, setValidation] = useState<TicketValidation | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');
  const [ticket, setTicket] = useState<Reservation | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  const selectedStudentId = selectedStudent ? String(selectedStudent.id) : '';
  const today = todayIso();

  const todayReservations = useMemo(
    () =>
      reservations.filter(
        (item) => item.reservationDate === today && item.status === 'confirmed',
      ),
    [reservations, today],
  );

  const consumedOrTicketed = useMemo(
    () => reservations.filter((item) => item.ticketCode || item.status === 'consumed'),
    [reservations],
  );

  const loadReservations = async (studentId: string) => {
    setLoading(true);
    try {
      const response = await api.get<Reservation[]>('/restauration/reservations', {
        params: { studentId },
      });
      setReservations(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadMeals = async () => {
      try {
        const response = await api.get<Meal[]>('/restauration/meals');
        setMeals(response.data);
      } catch {
        setMeals([]);
      }
    };
    void loadMeals();
  }, []);

  useEffect(() => {
    setReservations([]);
    setTicket(null);
    setValidation(null);
    setLookupMessage('');
    setTicketModalOpen(false);
  }, [selectedStudentId]);

  useEffect(() => {
    const query = scanCode.trim();
    if (!query) {
      setValidation(null);
      setLookupMessage('');
      setPreviewLoading(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const response = await api.post<TicketValidation>('/restauration/tickets/preview', {
          query,
          mealId: autoMealId ? Number(autoMealId) : undefined,
        });
        setValidation(response.data);
        setLookupMessage('');
      } catch (error) {
        setValidation(null);
        setLookupMessage(getApiErrorMessage(error, 'Aucun ticket trouve'));
      } finally {
        setPreviewLoading(false);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [autoMealId, scanCode]);

  const handleStudentSelect = async (student: StudentLookupResult) => {
    setSelectedStudent(student);
    try {
      await loadReservations(String(student.id));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible de charger les tickets'));
    }
  };

  const issueTicket = async (reservation: Reservation) => {
    try {
      const response = await api.post<Reservation>('/restauration/tickets/issue', {
        reservationId: reservation.id,
      });
      setTicket(response.data);
      setTicketModalOpen(true);
      toast.success('Ticket genere');
      await loadReservations(String(reservation.student.id));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Ticket impossible'));
    }
  };

  const openTicketFromHistory = async (reservation: Reservation) => {
    if (reservation.ticketCode) {
      setTicket(reservation);
      setTicketModalOpen(true);
      return;
    }

    await issueTicket(reservation);
  };

  const validateTicket = async () => {
    if (!scanCode.trim()) return;
    try {
      const response = await api.post<TicketValidation>('/restauration/tickets/preview', {
        query: scanCode.trim(),
        mealId: autoMealId ? Number(autoMealId) : undefined,
      });
      setValidation(response.data);
      setLookupMessage('');
    } catch (error) {
      setValidation(null);
      setLookupMessage(getApiErrorMessage(error, 'Aucun ticket trouve'));
    }
  };

  const consumeTicket = async () => {
    if (!scanCode.trim()) return;
    try {
      const response = await api.post<Reservation>('/restauration/tickets/consume', {
        code: scanCode.trim(),
      });
      setTicket(response.data);
      setValidation({ valid: false, reason: 'Ticket consomme', reservation: response.data });
      setLookupMessage('');
      toast.success('Repas marque consomme');
      if (selectedStudentId) {
        await loadReservations(selectedStudentId);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Consommation impossible'));
    }
  };

  const autoConsume = async () => {
    if (!scanCode.trim()) return;
    try {
      const response = await api.post<Reservation>('/restauration/tickets/auto-consume', {
        query: scanCode.trim(),
        mealId: autoMealId ? Number(autoMealId) : undefined,
      });
      setTicket(response.data);
      setValidation({ valid: false, reason: 'Consommé', reservation: response.data });
      setLookupMessage('');
      toast.success('Ticket consommé');
      if (selectedStudentId) {
        await loadReservations(selectedStudentId);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Recherche/validation impossible'));
    }
  };

  const handleCameraCode = (code: string) => {
    setScanCode(code);
  };

  if (!canManage) {
    return (
      <EmptyState
        title="Acces non autorise"
        description="La verification ticket est reservee au personnel restauration."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Restauration"
        title="Verification tickets"
        description="Sortie de ticket du jour, historique ticket et scanner QR / barcode sur une page dediee."
        actions={
          <Link className="btn-outline flex items-center gap-2" href="/restauration">
            <Ticket size={14} />
            Retour reservations
          </Link>
        }
      />

      <StudentLookup
        selectedStudent={selectedStudent}
        onSelect={handleStudentSelect}
        onClear={() => {
          setSelectedStudent(null);
          setReservations([]);
          setTicket(null);
          setValidation(null);
        }}
      />

      {!selectedStudentId ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <section className="surface-card">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Validation rapide</h2>
                <p className="panel-copy">Scannez un QR ticket ou saisissez code étudiant / nom. Le repas est détecté par intervalle horaire si aucun repas n’est choisi.</p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px]">
              <div className="field-stack">
                <label className="field-label">Code ou nom</label>
                <input
                  className="input"
                  value={scanCode}
                  onChange={(event) => setScanCode(event.target.value)}
                  placeholder="TCK-..., L003003, Soufiane..."
                />
              </div>
              <div className="field-stack">
                <label className="field-label">Repas</label>
                <select className="input" value={autoMealId} onChange={(event) => setAutoMealId(event.target.value)}>
                  <option value="">Selon l’heure</option>
                  {meals.map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {meal.name}
                      {meal.serviceStartTime && meal.serviceEndTime
                        ? ` (${meal.serviceStartTime}-${meal.serviceEndTime})`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <MobileQRScanner
                onScan={handleCameraCode}
                label="Autoriser la caméra"
                hint="Scannez le QR ticket. Le code sera rempli sans validation automatique."
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-primary" type="button" onClick={autoConsume} disabled={!validation?.valid}>
                <CheckCircle2 size={14} />
                Valider
              </button>
              <button className="btn-outline" type="button" onClick={validateTicket}>
                <ScanLine size={14} />
                Actualiser aperçu
              </button>
            </div>
            <TicketLookupCard validation={validation} loading={previewLoading} message={lookupMessage} />
          </section>
          {ticket ? (
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-100"
              onClick={() => setTicketModalOpen(true)}
            >
              <span>
                <span className="block text-sm font-semibold text-emerald-800">Ticket prêt</span>
                <span className="text-xs text-emerald-700">Appuyez pour ouvrir le popup du ticket.</span>
              </span>
              <Barcode className="text-emerald-700" size={18} />
            </button>
          ) : (
            <EmptyState
              title="Scan direct disponible"
              description="Vous pouvez aussi chercher un étudiant à gauche pour voir ses tickets du jour."
            />
          )}
        </div>
      ) : loading ? (
        <div className="surface-card empty-note">Chargement des tickets...</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4">
            <section className="surface-card">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Tickets du jour</h2>
                  <p className="panel-copy">Un ticket est valable uniquement pour la date du jour.</p>
                </div>
              </div>
              {todayReservations.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Aucun repas reserve pour aujourd&apos;hui.</p>
              ) : (
                <div className="mt-3 grid gap-2">
                  {todayReservations.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left hover:border-emerald-300"
                      onClick={() => issueTicket(item)}
                    >
                      <span>
                        <span className="block font-medium text-slate-950">{item.meal.name}</span>
                        <span className="text-xs text-slate-400">
                          {item.student.codeEtudiant || item.student.codeMassar || 'Sans code'}
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">
                        {item.ticketCode ? 'Voir ticket' : 'Sortir ticket'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="surface-card">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Historique tickets</h2>
                  <p className="panel-copy">Tickets emis ou deja consommes pour ce profil.</p>
                </div>
              </div>
              {consumedOrTicketed.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Aucun ticket sorti.</p>
              ) : (
                <div className="mt-3 table-scroll">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Etudiant</th>
                        <th>Date</th>
                        <th>Repas</th>
                        <th>Code</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumedOrTicketed.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <button
                              type="button"
                              className="text-left text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
                              onClick={() => void openTicketFromHistory(item)}
                            >
                              {item.student.fullName}
                            </button>
                            <p className="text-xs text-slate-400">
                              {item.student.codeEtudiant || item.student.codeMassar || 'Sans code'}
                            </p>
                          </td>
                          <td>{item.reservationDate}</td>
                          <td>{item.meal.name}</td>
                          <td className="font-mono text-xs">{item.ticketCode ?? '-'}</td>
                          <td>
                            <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusClass(item.status))}>
                              {statusLabel(item.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-4">
            <section className="surface-card">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Scanner ticket</h2>
                  <p className="panel-copy">Scannez le QR/code ticket, ou saisissez code étudiant / nom pour valider automatiquement le repas du moment.</p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px]">
                <div className="field-stack">
                <label className="field-label">QR / barcode / code étudiant / nom</label>
                <input
                  className="input"
                  value={scanCode}
                  onChange={(event) => setScanCode(event.target.value)}
                  placeholder="TCK-..., L003003, Soufiane..."
                />
                </div>
                <div className="field-stack">
                  <label className="field-label">Repas</label>
                  <select className="input" value={autoMealId} onChange={(event) => setAutoMealId(event.target.value)}>
                    <option value="">Selon l’heure</option>
                    {meals.map((meal) => (
                      <option key={meal.id} value={meal.id}>
                        {meal.name}
                        {meal.serviceStartTime && meal.serviceEndTime
                          ? ` (${meal.serviceStartTime}-${meal.serviceEndTime})`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <MobileQRScanner
                  onScan={handleCameraCode}
                  label="Autoriser la caméra"
                  hint="Scannez le QR ticket. Le code sera rempli sans validation automatique."
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-primary" type="button" onClick={autoConsume} disabled={!validation?.valid}>
                  <CheckCircle2 size={14} />
                  Valider
                </button>
                <button className="btn-outline" type="button" onClick={validateTicket}>
                  <ScanLine size={14} />
                  Actualiser aperçu
                </button>
                <button className="btn-outline" type="button" onClick={consumeTicket}>
                  <CheckCircle2 size={14} />
                  Consommer code ticket
                </button>
              </div>

              <TicketLookupCard validation={validation} loading={previewLoading} message={lookupMessage} />
            </section>

            {ticket ? (
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-100"
                onClick={() => setTicketModalOpen(true)}
              >
                <span>
                  <span className="block text-sm font-semibold text-emerald-800">Ticket prêt</span>
                  <span className="text-xs text-emerald-700">Appuyez pour ouvrir le popup du ticket.</span>
                </span>
                <Barcode className="text-emerald-700" size={18} />
              </button>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-400">
                <Barcode className="mx-auto mb-2" />
                Ticket sort ici
              </div>
            )}
          </div>
        </div>
      )}

      <ModalShell
        open={ticketModalOpen && Boolean(ticket)}
        title="Ticket restauration"
        description="Le ticket est affiché en popup pour une meilleure lecture sur mobile et ordinateur."
        onClose={() => setTicketModalOpen(false)}
        size="lg"
        footer={
          <button className="btn-outline ml-auto" type="button" onClick={() => setTicketModalOpen(false)}>
            Fermer
          </button>
        }
      >
        {ticket ? <TicketPreview reservation={ticket} /> : null}
      </ModalShell>
    </div>
  );
}
