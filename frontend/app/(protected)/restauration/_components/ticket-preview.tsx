'use client';

import { useEffect, useRef, useState } from 'react';
import { QrCode } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { statusLabel } from '../utils';
import type { Reservation } from './types';

export function TicketPreview({ reservation }: { reservation: Reservation }) {
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
