'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Barcode, CheckCircle2, QrCode, ScanLine, Ticket, XCircle } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';
import { StudentLookup } from '../_components/student-lookup';
import { TicketPreview } from '../_components/ticket-preview';
import type { Reservation, StudentLookupResult, TicketValidation } from '../_components/types';
import { statusClass, statusLabel, todayIso } from '../utils';

export default function RestaurationVerificationPage() {
  const { user } = useAuth();
  const canManage = ['admin', 'staff', 'restauration'].includes(user?.role ?? '');

  const [selectedStudent, setSelectedStudent] = useState<StudentLookupResult | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [validation, setValidation] = useState<TicketValidation | null>(null);
  const [ticket, setTicket] = useState<Reservation | null>(null);

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
    setReservations([]);
    setTicket(null);
    setValidation(null);
  }, [selectedStudentId]);

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
      toast.success('Ticket genere');
      await loadReservations(String(reservation.student.id));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Ticket impossible'));
    }
  };

  const validateTicket = async () => {
    if (!scanCode.trim()) return;
    try {
      const response = await api.get<TicketValidation>(
        `/restauration/tickets/validate/${encodeURIComponent(scanCode.trim())}`,
      );
      setValidation(response.data);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Validation impossible'));
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
      toast.success('Repas marque consomme');
      if (selectedStudentId) {
        await loadReservations(selectedStudentId);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Consommation impossible'));
    }
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
        <EmptyState
          title="Cherchez un etudiant"
          description="La page reste vide tant qu&apos;aucun etudiant n&apos;est selectionne."
        />
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
                        <th>Date</th>
                        <th>Repas</th>
                        <th>Code</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumedOrTicketed.map((item) => (
                        <tr key={item.id}>
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
                  <p className="panel-copy">Verifier le QR code ou le code barre avant de servir le repas.</p>
                </div>
              </div>

              <div className="mt-3 field-stack">
                <label className="field-label">QR / barcode</label>
                <input
                  className="input"
                  value={scanCode}
                  onChange={(event) => setScanCode(event.target.value)}
                  placeholder="TCK-..."
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn-outline" type="button" onClick={validateTicket}>
                  <ScanLine size={14} />
                  Verifier
                </button>
                <button className="btn-primary" type="button" onClick={consumeTicket}>
                  <CheckCircle2 size={14} />
                  Valider repas
                </button>
              </div>

              {validation && (
                <div
                  className={cn(
                    'mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold',
                    validation.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                  )}
                >
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
            </section>

            {ticket ? (
              <TicketPreview reservation={ticket} />
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-slate-400">
                <Barcode className="mx-auto mb-2" />
                Ticket sort ici
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
