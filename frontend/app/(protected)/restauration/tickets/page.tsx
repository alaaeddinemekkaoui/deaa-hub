'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, QrCode, ReceiptText, Utensils } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';
import { TicketPreview } from '../_components/ticket-preview';
import type { Reservation } from '../_components/types';
import { formatMoney, statusClass, statusLabel, todayIso } from '../utils';

export default function RestaurationTicketsPage() {
  const { user } = useAuth();
  const canManage = ['admin', 'staff', 'restauration'].includes(user?.role ?? '');
  const today = todayIso();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuingId, setIssuingId] = useState<number | null>(null);

  const loadReservations = useCallback(async () => {
    if (canManage) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get<Reservation[]>('/restauration/reservations');
      setReservations(response.data);
      const issuedToday = response.data.find(
        (item) => item.reservationDate === today && item.ticketCode,
      );
      setSelectedTicket(issuedToday ?? null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible de charger vos tickets'));
    } finally {
      setLoading(false);
    }
  }, [canManage, today]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const todayReservations = useMemo(
    () =>
      reservations.filter(
        (item) =>
          item.reservationDate === today &&
          ['confirmed', 'consumed'].includes(item.status),
      ),
    [reservations, today],
  );

  const issueTicket = async (reservation: Reservation) => {
    if (reservation.ticketCode) {
      setSelectedTicket(reservation);
      return;
    }

    setIssuingId(reservation.id);
    try {
      const response = await api.post<Reservation>('/restauration/tickets/issue', {
        reservationId: reservation.id,
      });
      setSelectedTicket(response.data);
      setReservations((current) =>
        current.map((item) => (item.id === response.data.id ? response.data : item)),
      );
      toast.success('Ticket genere');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible de generer le ticket'));
    } finally {
      setIssuingId(null);
    }
  };

  if (canManage) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Restauration"
          title="Tickets restauration"
          description="Le personnel restauration utilise la page de validation pour verifier les codes et sortir les tickets."
          actions={
            <Link className="btn-primary flex items-center gap-2" href="/restauration/verification">
              <QrCode size={14} />
              Validation tickets
            </Link>
          }
        />
        <EmptyState
          title="Validation disponible"
          description="Ouvrez la validation tickets pour rechercher un etudiant, generer son ticket du jour ou verifier un code."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Restauration"
        title="Mes tickets"
        description="Recuperez votre ticket du jour apres reservation. Le QR code sert a la validation au restaurant."
        actions={
          <Link className="btn-outline flex items-center gap-2" href="/restauration">
            <Utensils size={14} />
            Reserver repas
          </Link>
        }
      />

      {loading ? (
        <div className="surface-card empty-note">Chargement des tickets...</div>
      ) : todayReservations.length === 0 ? (
        <EmptyState
          title="Aucun repas reserve aujourd'hui"
          description="Reservez d'abord un repas pour pouvoir generer votre ticket quotidien."
        />
      ) : (
        <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="surface-card space-y-4">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Repas du jour</h2>
                <p className="panel-copy">Choisissez le repas puis affichez le ticket.</p>
              </div>
            </div>

            <div className="grid gap-3">
              {todayReservations.map((reservation) => {
                const hasTicket = Boolean(reservation.ticketCode);
                const canIssue = reservation.status === 'confirmed';
                return (
                  <article key={reservation.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{reservation.meal.name}</p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                          <CalendarDays size={13} />
                          {reservation.reservationDate}
                        </p>
                      </div>
                      <span className={cn('rounded-full px-2 py-1 text-xs font-semibold', statusClass(reservation.status))}>
                        {statusLabel(reservation.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-700">{formatMoney(reservation.totalPrice)}</p>
                      <button
                        className={hasTicket ? 'btn-outline' : 'btn-primary'}
                        type="button"
                        onClick={() => issueTicket(reservation)}
                        disabled={issuingId === reservation.id || (!hasTicket && !canIssue)}
                      >
                        {issuingId === reservation.id
                          ? 'Generation...'
                          : hasTicket
                            ? 'Voir ticket'
                            : 'Generer ticket'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="surface-card space-y-4">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Ticket</h2>
                <p className="panel-copy">Presentez le QR code ou le code ticket au restaurant.</p>
              </div>
              <ReceiptText size={20} className="text-emerald-700" />
            </div>
            {selectedTicket ? (
              <TicketPreview reservation={selectedTicket} />
            ) : (
              <EmptyState
                title="Ticket non genere"
                description="Cliquez sur Generer ticket pour afficher le QR code."
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}
