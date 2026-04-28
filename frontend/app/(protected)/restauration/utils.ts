import type { ReservationStatus } from './_components/types';

export const formatMoney = (value: number) =>
  new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(value || 0);

export function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function buildDateRange(start: string, end: string) {
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

export function statusLabel(status: ReservationStatus) {
  return {
    confirmed: 'Reserve',
    cancelled: 'Annule',
    consumed: 'Consomme',
    expired: 'Expire',
  }[status];
}

export function statusClass(status: ReservationStatus) {
  if (status === 'confirmed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'consumed') return 'bg-blue-50 text-blue-700';
  if (status === 'cancelled') return 'bg-slate-100 text-slate-500';
  return 'bg-amber-50 text-amber-700';
}
