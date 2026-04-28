'use client';

export type Meal = { id: number; name: string; price: number; active: boolean };

export type StudentLookupResult = {
  id: number;
  fullName: string;
  codeMassar?: string;
  codeEtudiant?: string | null;
};

export type Wallet = { studentId: number; balance: number };

export type ReservationStatus = 'confirmed' | 'cancelled' | 'consumed' | 'expired';

export type Reservation = {
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
  student: StudentLookupResult;
  reservedBy: { fullName: string; role: string };
};

export type Transaction = {
  id: number;
  type: 'credit' | 'debit' | 'adjustment';
  amount: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
  actor: { fullName: string; role: string };
};

export type TicketValidation = { valid: boolean; reason: string; reservation?: Reservation };
