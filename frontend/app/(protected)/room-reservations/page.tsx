'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarCheck, CheckCircle, ChevronLeft, ChevronRight, Clock, Trash2, XCircle } from 'lucide-react';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Room = { id: number; name: string; capacity: number; availability: boolean };

type Department = { id: number; name: string };

type AcademicClassForCount = {
  id: number;
  name: string;
  year: number;
  filiere?: {
    id: number;
    name: string;
    code: string;
    department?: { id: number; name: string } | null;
  } | null;
};

type Purpose = 'cours' | 'examen' | 'reunion' | 'autre';
type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

type Reservation = {
  id: number;
  roomId: number;
  classId?: number | null;
  date: string;        // YYYY-MM-DD
  dayOfWeek: number;   // 1–5
  startTime: string;
  endTime: string;
  reservedBy: string;
  purpose: Purpose;
  notes: string | null;
  status: ReservationStatus;
  approvalNote?: string | null;
  requestedBy?: { id: number; fullName: string } | null;
  approvedBy?: { id: number; fullName: string } | null;
  room?: { id: number; name: string; departmentId?: number | null } | null;
  academicClass?: {
    id: number;
    name: string;
    year: number;
    filiere?: {
      id: number;
      name: string;
      code: string;
      department?: { id: number; name: string } | null;
    } | null;
  } | null;
};

const STATUS_BADGE: Record<ReservationStatus, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending:   'En attente',
  approved:  'Approuvée',
  rejected:  'Rejetée',
  cancelled: 'Annulée',
};

type CreateReservationPayload = {
  roomId: number;
  classId?: number | null;
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  reservedBy: string;
  purpose: Purpose;
  notes?: string | null;
};

type FiliereOption = {
  id: number;
  name: string;
  code?: string;
  departmentId?: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7h–19h

const PURPOSE_STYLE: Record<Purpose, string> = {
  cours:    'bg-blue-50   border-blue-300   text-blue-900',
  examen:   'bg-red-50    border-red-300    text-red-900',
  reunion:  'bg-purple-50 border-purple-300 text-purple-900',
  autre:    'bg-slate-50  border-slate-300  text-slate-700',
};

const PURPOSE_BADGE: Record<Purpose, string> = {
  cours:   'bg-blue-100   text-blue-700',
  examen:  'bg-red-100    text-red-700',
  reunion: 'bg-purple-100 text-purple-700',
  autre:   'bg-slate-100  text-slate-600',
};

const PURPOSE_LABELS: Record<Purpose, string> = {
  cours:   'Cours',
  examen:  'Examen',
  reunion: 'Réunion',
  autre:   'Autre',
};

const PURPOSES: Purpose[] = ['cours', 'examen', 'reunion', 'autre'];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function fmt(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getWeekStart(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  return fmt(d);
}

function addDays(s: string, n: number): string {
  const d = toDate(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
}

function getDayOfWeek(s: string): number {
  const day = toDate(s).getDay();
  return day === 0 ? 7 : day;
}

function timeToRow(t: string): number {
  return parseInt(t) - 7; // offset from 7h
}

function rowSpan(start: string, end: string): number {
  return parseInt(end) - parseInt(start);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoomReservationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isInspector = user?.role === 'viewer';
  const canReserveOutsideDepartment = isAdmin || isInspector;
  const userDeptIds = user?.departments.map((d) => d.id) ?? [];

  const canApprove = (reservation: Reservation) => {
    if (isAdmin) return true;
    const roomDeptId = reservation.room?.departmentId;
    return roomDeptId != null && userDeptIds.includes(roomDeptId);
  };

  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<AcademicClassForCount[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedFiliereId, setSelectedFiliereId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => fmt(new Date()));
  const [loading, setLoading] = useState(true);

  // Slide animation
  const [animClass, setAnimClass] = useState('');
  const touchStartX = useRef<number | null>(null);

  const weekStart = useMemo(() => getWeekStart(toDate(selectedDate)), [selectedDate]);
  const weekEnd   = useMemo(() => addDays(weekStart, 4), [weekStart]);
  const todayStr  = useMemo(() => fmt(new Date()), []);
  const currentWeekStart = useMemo(() => getWeekStart(new Date()), []);
  const isCurrentWeek = weekStart === currentWeekStart;

  const classesByDepartment = useMemo(() => {
    const counts = new Map<number, number>();
    for (const department of departments) {
      counts.set(department.id, 0);
    }
    for (const academicClass of classes) {
      const departmentId = academicClass.filiere?.department?.id;
      if (!departmentId) continue;
      counts.set(departmentId, (counts.get(departmentId) ?? 0) + 1);
    }
    return departments.map((department) => ({
      id: department.id,
      name: department.name,
      classCount: counts.get(department.id) ?? 0,
    }));
  }, [departments, classes]);

  const filieres = useMemo<FiliereOption[]>(() => {
    const map = new Map<number, FiliereOption>();
    for (const academicClass of classes) {
      const filiere = academicClass.filiere;
      if (!filiere?.id || map.has(filiere.id)) continue;
      map.set(filiere.id, {
        id: filiere.id,
        name: filiere.name,
        code: filiere.code,
        departmentId: filiere.department?.id,
      });
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [classes]);

  const filteredFilieres = useMemo(() => {
    if (!selectedDepartmentId) return filieres;
    const departmentId = Number(selectedDepartmentId);
    return filieres.filter((filiere) => filiere.departmentId === departmentId);
  }, [filieres, selectedDepartmentId]);

  const filteredClasses = useMemo(() => {
    return classes
      .filter((academicClass) => {
        if (selectedDepartmentId) {
          const departmentId = Number(selectedDepartmentId);
          if (academicClass.filiere?.department?.id !== departmentId) return false;
        }
        if (selectedFiliereId) {
          const filiereId = Number(selectedFiliereId);
          if (academicClass.filiere?.id !== filiereId) return false;
        }
        return true;
      })
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }, [classes, selectedDepartmentId, selectedFiliereId]);

  const modalClassOptions = useMemo(() => {
    if (canReserveOutsideDepartment) {
      return [...classes].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    }
    return filteredClasses;
  }, [canReserveOutsideDepartment, classes, filteredClasses]);

  useEffect(() => {
    if (
      selectedFiliereId &&
      !filteredFilieres.some((filiere) => String(filiere.id) === selectedFiliereId)
    ) {
      setSelectedFiliereId('');
      setSelectedClassId('');
    }
  }, [filteredFilieres, selectedFiliereId]);

  useEffect(() => {
    if (
      selectedClassId &&
      !filteredClasses.some((academicClass) => String(academicClass.id) === selectedClassId)
    ) {
      setSelectedClassId('');
    }
  }, [filteredClasses, selectedClassId]);

  // Modal state
  const [modal, setModal] = useState(false);
  const [modalDate, setModalDate] = useState('');
  const [modalStart, setModalStart] = useState('08:00');
  const [modalEnd, setModalEnd] = useState('10:00');
  const [modalBy, setModalBy] = useState('');
  const [modalPurpose, setModalPurpose] = useState<Purpose>('cours');
  const [modalNotes, setModalNotes] = useState('');
  const [modalClassId, setModalClassId] = useState('');

  // Detail modal
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);

  // ── Data loading ───────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const [roomsRes, departmentsRes, classesRes] = await Promise.all([
          api.get<Room[]>('/rooms'),
          api.get<PaginatedResponse<Department>>('/departments', {
            params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' },
          }),
          api.get<PaginatedResponse<AcademicClassForCount>>('/classes', {
            params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' },
          }),
        ]);
        setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
        setDepartments(Array.isArray(departmentsRes.data?.data) ? departmentsRes.data.data : []);
        setClasses(Array.isArray(classesRes.data?.data) ? classesRes.data.data : []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les données de réservation'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const loadReservations = async () => {
      try {
        const params: Record<string, string> = { weekStart };
        if (selectedRoomId) params.roomId = selectedRoomId;
        if (selectedDepartmentId) params.departmentId = selectedDepartmentId;
        if (selectedFiliereId) params.filiereId = selectedFiliereId;
        if (selectedClassId) params.classId = selectedClassId;

        const response = await api.get<Reservation[]>('/room-reservations', { params });
        setReservations(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les réservations'));
      }
    };

    void loadReservations();
  }, [weekStart, selectedRoomId, selectedDepartmentId, selectedFiliereId, selectedClassId]);

  // ── Week navigation ────────────────────────────────────────────────────────

  const goWeek = useCallback((delta: number) => {
    setAnimClass(delta > 0 ? 'res-slide-right' : 'res-slide-left');
    setSelectedDate((prev) => addDays(prev, delta));
    setTimeout(() => setAnimClass(''), 300);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goWeek(-7); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goWeek(7);  }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goWeek]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) goWeek(diff > 0 ? 7 : -7);
    touchStartX.current = null;
  };

  // ── Grid data ──────────────────────────────────────────────────────────────

  const roomIdNum = selectedRoomId ? Number(selectedRoomId) : null;

  // Reservations visible this week for the selected room
  const weekDates = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const weekReservations = useMemo(() => {
    if (!roomIdNum) return reservations;
    return reservations.filter((r) => r.roomId === roomIdNum);
  }, [reservations, roomIdNum]);

  const hasAcademicFilter = Boolean(
    selectedDepartmentId || selectedFiliereId || selectedClassId,
  );

  const roomReservationCount = useMemo(() => {
    const counts = new Map<number, number>();
    for (const reservation of reservations) {
      counts.set(
        reservation.roomId,
        (counts.get(reservation.roomId) ?? 0) + 1,
      );
    }
    return counts;
  }, [reservations]);

  const visibleRooms = useMemo(() => {
    if (!hasAcademicFilter) return rooms;
    return rooms.filter((room) => (roomReservationCount.get(room.id) ?? 0) > 0);
  }, [hasAcademicFilter, rooms, roomReservationCount]);

  // grid[day][startRow] = reservation
  const grid = useMemo(() => {
    const g: Record<number, Record<number, Reservation>> = {};
    for (let d = 1; d <= 5; d++) g[d] = {};
    for (const r of weekReservations) {
      const row = timeToRow(r.startTime);
      if (row >= 0 && row < HOURS.length) g[r.dayOfWeek][row] = r;
    }
    return g;
  }, [weekReservations]);

  // Conflict detection: same room, overlapping time on same day
  const conflictIds = useMemo(() => {
    const ids = new Set<number>();
    const byDay: Record<number, Reservation[]> = {};
    for (let d = 1; d <= 5; d++) byDay[d] = [];
    for (const r of weekReservations) byDay[r.dayOfWeek]?.push(r);
    for (const list of Object.values(byDay)) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j];
          if (a.startTime < b.endTime && b.startTime < a.endTime) {
            ids.add(a.id); ids.add(b.id);
          }
        }
      }
    }
    return ids;
  }, [weekReservations]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const openModal = (day: number, hour?: number) => {
    const dateStr = addDays(weekStart, day - 1);
    setModalDate(dateStr);
    setModalStart(hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : '08:00');
    setModalEnd(hour !== undefined ? `${String(hour + 2).padStart(2, '0')}:00` : '10:00');
    setModalBy('');
    setModalPurpose('cours');
    setModalNotes('');
    setModalClassId(selectedClassId);
    setModal(true);
  };

  const saveReservation = async () => {
    if (!selectedRoomId || !modalBy.trim() || !modalDate) return;
    const dayOfWeek = getDayOfWeek(modalDate);
    if (dayOfWeek < 1 || dayOfWeek > 5) {
      toast.error('Choisissez une date de lundi à vendredi');
      return;
    }
    if (modalStart >= modalEnd) {
      toast.error("L'heure de fin doit être après l'heure de début");
      return;
    }
    const payload: CreateReservationPayload = {
      roomId: Number(selectedRoomId),
      date: modalDate,
      dayOfWeek,
      startTime: modalStart,
      endTime: modalEnd,
      reservedBy: modalBy.trim(),
      purpose: modalPurpose,
      notes: modalNotes.trim() ? modalNotes.trim() : null,
      classId: modalClassId ? Number(modalClassId) : null,
    };
    try {
      const created = await api.post<Reservation>('/room-reservations', payload);
      setReservations((prev) => [...prev, created.data]);
      setModal(false);
      toast.success('Réservation enregistrée');
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'enregistrement de la réservation"));
    }
  };

  const deleteReservation = async (id: number) => {
    if (!window.confirm('Supprimer cette réservation ?')) return;
    try {
      await api.delete(`/room-reservations/${id}`);
      setReservations((prev) => prev.filter((r) => r.id !== id));
      setDetailRes(null);
      toast.success('Réservation supprimée');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la suppression de la réservation'));
    }
  };

  const approveReservation = async (id: number) => {
    try {
      const updated = await api.patch<Reservation>(`/room-reservations/${id}/approve`, {});
      setReservations((prev) => prev.map((r) => r.id === id ? updated.data : r));
      setDetailRes((prev) => prev?.id === id ? updated.data : prev);
      toast.success('Réservation approuvée');
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'approbation"));
    }
  };

  const rejectReservation = async (id: number) => {
    const note = window.prompt('Motif du rejet (optionnel) :') ?? undefined;
    if (note === null) return; // cancelled
    try {
      const updated = await api.patch<Reservation>(`/room-reservations/${id}/reject`, { note });
      setReservations((prev) => prev.map((r) => r.id === id ? updated.data : r));
      setDetailRes((prev) => prev?.id === id ? updated.data : prev);
      toast.success('Réservation rejetée');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec du rejet'));
    }
  };

  const pendingReservations = useMemo(
    () => reservations.filter((r) => r.status === 'pending' && canApprove(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservations, isAdmin, userDeptIds],
  );

  const selectedRoom = rooms.find((r) => String(r.id) === selectedRoomId);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .res-slide-right { animation: resSlideRight 280ms cubic-bezier(0.25,0.46,0.45,0.94) both; }
        .res-slide-left  { animation: resSlideLeft  280ms cubic-bezier(0.25,0.46,0.45,0.94) both; }
        @keyframes resSlideRight { from { transform: translateX(48px);  opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes resSlideLeft  { from { transform: translateX(-48px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      <div className="space-y-5">
        <PageHeader
          eyebrow="Infrastructure"
          title="Réservation des salles"
          description="Réservez et consultez l'occupation des salles par semaine. Les conflits sont détectés automatiquement."
        />

        {/* ── Pending approvals panel ── */}
        {pendingReservations.length > 0 && (
          <section className="surface-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {pendingReservations.length}
              </span>
              <h2 className="font-semibold text-slate-800">Réservations en attente d&apos;approbation</h2>
            </div>
            <div className="space-y-2">
              {pendingReservations.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="text-sm">
                    <p className="font-medium text-slate-800">{r.reservedBy}</p>
                    <p className="text-slate-500 text-xs">
                      {r.room?.name ?? '—'} · {toDate(r.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })} · {r.startTime}–{r.endTime}
                    </p>
                    {r.requestedBy && (
                      <p className="text-slate-400 text-xs">Demandé par {r.requestedBy.fullName}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                      onClick={() => approveReservation(r.id)}
                    >
                      <CheckCircle size={12} /> Approuver
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      onClick={() => rejectReservation(r.id)}
                    >
                      <XCircle size={12} /> Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Toolbar ── */}
        <section className="surface-card p-4 space-y-4">
          {/* Row 1 — room selector */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="field-stack flex-1 min-w-48">
              <label className="field-label">
                Salle
                {rooms.length > 0 && (
                  <span className="ml-1.5 text-[10px] text-slate-400">({rooms.length} salles)</span>
                )}
              </label>
              <select
                className="input"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                disabled={loading}
              >
                <option value="">Sélectionner une salle ({rooms.length})</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.capacity} places{!r.availability ? ' · ⚠ indisponible' : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedRoomId && (
              <button
                className="btn-primary self-end"
                type="button"
                onClick={() => openModal(1)}
              >
                + Réservation
              </button>
            )}
          </div>

          {/* Row 1b — academic filters */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="field-stack">
              <label className="field-label">Département</label>
              <select
                className="input"
                value={selectedDepartmentId}
                onChange={(e) => {
                  const nextDepartmentId = e.target.value;
                  setSelectedDepartmentId(nextDepartmentId);
                  setSelectedFiliereId('');
                  setSelectedClassId('');
                }}
              >
                <option value="">Tous les départements</option>
                {departments.map((department) => (
                  <option key={department.id} value={String(department.id)}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Filière</label>
              <select
                className="input"
                value={selectedFiliereId}
                onChange={(e) => {
                  setSelectedFiliereId(e.target.value);
                  setSelectedClassId('');
                }}
              >
                <option value="">Toutes les filières</option>
                {filteredFilieres.map((filiere) => (
                  <option key={filiere.id} value={String(filiere.id)}>
                    {filiere.code ? `${filiere.code} — ` : ''}{filiere.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Classe</label>
              <select
                className="input"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="">Toutes les classes</option>
                {filteredClasses.map((academicClass) => (
                  <option key={academicClass.id} value={String(academicClass.id)}>
                    {academicClass.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2 — week nav */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
            <button
              type="button"
              onClick={() => goWeek(-7)}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:shadow-sm transition-all select-none"
              title="Semaine précédente (←)"
            >
              <ChevronLeft size={17} />
              <span className="hidden sm:inline">Préc.</span>
            </button>

            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-2">
                {!isCurrentWeek && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(fmt(new Date()))}
                    className="rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Aujourd&apos;hui
                  </button>
                )}
                {isCurrentWeek && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Semaine actuelle
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-slate-800">
                {toDate(weekStart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                <span className="mx-1.5 text-slate-400">–</span>
                {toDate(weekEnd).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:block">← → pour naviguer · glisser sur le calendrier</span>
            </div>

            <button
              type="button"
              onClick={() => goWeek(7)}
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:shadow-sm transition-all select-none"
              title="Semaine suivante (→)"
            >
              <span className="hidden sm:inline">Suiv.</span>
              <ChevronRight size={17} />
            </button>
          </div>
        </section>

        {/* ── Academic structure summary ── */}
        {classesByDepartment.length > 0 && (
          <section className="surface-card p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Départements et nombre de classes</p>
              <span className="text-xs text-slate-400">
                {classes.length} classe{classes.length !== 1 ? 's' : ''} au total
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {classesByDepartment.map((department) => (
                <span
                  key={department.id}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs"
                >
                  <span className="font-medium text-slate-700">{department.name}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">
                    {department.classCount} classe{department.classCount !== 1 ? 's' : ''}
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── Stats ── */}
        {selectedRoomId && weekReservations.length > 0 && (
          <section className="surface-card flex flex-wrap items-center gap-4 p-4">
            <div className="flex items-center gap-2">
              <CalendarCheck size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                {weekReservations.length} réservation{weekReservations.length !== 1 ? 's' : ''} cette semaine
              </span>
            </div>
            <div className="flex gap-2">
              {PURPOSES.map((p) => {
                const count = weekReservations.filter((r) => r.purpose === p).length;
                if (!count) return null;
                return (
                  <span key={p} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${PURPOSE_BADGE[p]}`}>
                    {count} {PURPOSE_LABELS[p]}
                  </span>
                );
              })}
            </div>
            {conflictIds.size > 0 && (
              <span className="ml-auto flex items-center gap-1 text-sm text-red-600 font-medium">
                <AlertTriangle size={14} /> {conflictIds.size} conflit{conflictIds.size !== 1 ? 's' : ''}
              </span>
            )}
          </section>
        )}

        {/* ── Room list (when no room selected) ── */}
        {!selectedRoomId ? (
          <section className="surface-card p-0 overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="font-semibold text-slate-800">
                {hasAcademicFilter
                  ? 'Salles réservées (selon les filtres)'
                  : 'Toutes les salles'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {hasAcademicFilter
                  ? `Semaine du ${toDate(weekStart).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                    })} au ${toDate(weekEnd).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })} · ${visibleRooms.length} salle${visibleRooms.length !== 1 ? 's' : ''} réservée${visibleRooms.length !== 1 ? 's' : ''}`
                  : 'Sélectionnez une salle ci-dessus pour consulter son calendrier de réservation.'}
              </p>
            </div>
            {loading ? (
              <div className="empty-note">Chargement...</div>
            ) : hasAcademicFilter && visibleRooms.length === 0 ? (
              <div className="empty-note">Aucune salle réservée pour ces filtres sur cette semaine.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {visibleRooms.map((room) => {
                  const total = roomReservationCount.get(room.id) ?? 0;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                      onClick={() => setSelectedRoomId(String(room.id))}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${room.availability ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        <CalendarCheck size={16} className={room.availability ? 'text-emerald-600' : 'text-slate-400'} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{room.name}</p>
                        <p className="text-xs text-slate-400">{room.capacity} places · {room.availability ? 'Disponible' : 'Indisponible'}</p>
                      </div>
                      {total > 0 && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {total} réservation{total !== 1 ? 's' : ''}
                        </span>
                      )}
                      <ChevronRight size={14} className="text-slate-300" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* ── Weekly calendar ── */
          <section
            className="surface-card overflow-auto"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {selectedRoom && !selectedRoom.availability && (
              <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <AlertTriangle size={14} />
                Cette salle est marquée comme <strong>indisponible</strong>. Les réservations restent visibles.
              </div>
            )}

            <div className={animClass}>
              <table className="w-full border-collapse text-sm" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th className="w-14 border-b border-r border-slate-100 bg-slate-50 py-3 text-center text-xs font-medium text-slate-400">Heure</th>
                    {DAYS.map((day, i) => {
                      const dateStr = addDays(weekStart, i);
                      const isToday = dateStr === todayStr;
                      return (
                        <th
                          key={day}
                          className={`border-b border-r border-slate-100 py-3 text-center text-xs font-semibold ${isToday ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-700'}`}
                        >
                          <span className="block">{day}</span>
                          <span className={`block font-normal ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>
                            {toDate(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </span>
                          {isToday && <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map((hour) => (
                    <tr key={hour}>
                      <td className="border-b border-r border-slate-100 bg-slate-50 py-2 text-center text-xs text-slate-400 align-top">
                        {String(hour).padStart(2, '0')}h
                      </td>
                      {[1, 2, 3, 4, 5].map((day) => {
                        const res = grid[day]?.[hour - 7];
                        const isConflict = res && conflictIds.has(res.id);

                        const coveredByAbove = !res && HOURS.slice(0, hour - 7).some((h) => {
                          const r = grid[day]?.[h - 7];
                          return r && timeToRow(r.startTime) < hour - 7 && timeToRow(r.startTime) + rowSpan(r.startTime, r.endTime) > hour - 7;
                        });

                        if (coveredByAbove) return null;

                        const span = res ? rowSpan(res.startTime, res.endTime) : 1;
                        const dateStr = addDays(weekStart, day - 1);
                        const isToday = dateStr === todayStr;

                        return (
                          <td
                            key={day}
                            rowSpan={span > 1 ? span : undefined}
                            className={`border-b border-r border-slate-100 p-1 align-top transition-colors ${
                              !res ? `cursor-pointer ${isToday ? 'hover:bg-blue-50' : 'hover:bg-slate-50'}` : ''
                            } ${isToday && !res ? 'bg-blue-50/30' : ''}`}
                            onClick={!res ? () => {
                              const d = new Date(weekStart);
                              d.setDate(d.getDate() + day - 1);
                              setModalDate(fmt(d));
                              setModalStart(`${String(hour).padStart(2, '0')}:00`);
                              setModalEnd(`${String(Math.min(hour + 2, 19)).padStart(2, '0')}:00`);
                              setModalBy('');
                              setModalPurpose('cours');
                              setModalNotes('');
                              setModalClassId(selectedClassId);
                              setModal(true);
                            } : undefined}
                          >
                            {res && (
                              <div
                                className={`relative h-full rounded-lg border-l-4 p-2 cursor-pointer ${
                                  res.status === 'pending'
                                    ? 'border-amber-400 bg-amber-50'
                                    : res.status === 'rejected'
                                    ? 'border-red-400 bg-red-50 opacity-70'
                                    : PURPOSE_STYLE[res.purpose]
                                } ${isConflict ? '!border-red-400 !bg-red-50' : ''}`}
                                style={{ minHeight: `${span * 3}rem` }}
                                onClick={() => setDetailRes(res)}
                              >
                                {isConflict && (
                                  <div className="absolute right-1 top-1">
                                    <AlertTriangle size={11} className="text-red-500" />
                                  </div>
                                )}
                                {res.status === 'pending' && !isConflict && (
                                  <div className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400" title="En attente" />
                                )}
                                <p className="text-xs font-bold leading-tight truncate">{res.reservedBy}</p>
                                <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${PURPOSE_BADGE[res.purpose]}`}>
                                  {PURPOSE_LABELS[res.purpose]}
                                </span>
                                {res.notes && span >= 2 && (
                                  <p className="mt-0.5 text-[10px] text-slate-500 line-clamp-2">{res.notes}</p>
                                )}
                                <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                                  <Clock size={9} />{res.startTime}–{res.endTime}
                                </p>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Add reservation modal ── */}
        <ModalShell
          open={modal}
          title="Nouvelle réservation"
          description={selectedRoom ? `${selectedRoom.name} · ${toDate(weekStart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}` : ''}
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn-primary" type="button" onClick={saveReservation} disabled={!modalBy.trim()}>
                Réserver
              </button>
              <button className="btn-outline" type="button" onClick={() => setModal(false)}>Annuler</button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="field-stack">
                <label className="field-label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={modalDate}
                  onChange={(e) => { setModalDate(e.target.value); }}
                />
              </div>
              <div className="field-stack">
                <label className="field-label">Jour</label>
                <input
                  className="input bg-slate-50"
                  readOnly
                  value={modalDate ? (DAYS[getDayOfWeek(modalDate) - 1] ?? '—') : '—'}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field-stack">
                <label className="field-label">Heure début</label>
                <select className="input" value={modalStart} onChange={(e) => setModalStart(e.target.value)}>
                  {HOURS.map((h) => <option key={h} value={`${String(h).padStart(2, '0')}:00`}>{String(h).padStart(2, '0')}h00</option>)}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Heure fin</label>
                <select className="input" value={modalEnd} onChange={(e) => setModalEnd(e.target.value)}>
                  {HOURS.slice(1).map((h) => <option key={h} value={`${String(h).padStart(2, '0')}:00`}>{String(h).padStart(2, '0')}h00</option>)}
                </select>
              </div>
            </div>
            <div className="field-stack">
              <label className="field-label">Réservé par <span className="text-red-500">*</span></label>
              <input
                className="input"
                placeholder="Pr. Alaoui, Direction, Secrétariat..."
                value={modalBy}
                onChange={(e) => setModalBy(e.target.value)}
              />
            </div>
            <div className="field-stack">
              <label className="field-label">Classe (optionnel)</label>
              <select
                className="input"
                value={modalClassId}
                onChange={(e) => setModalClassId(e.target.value)}
              >
                <option value="">Aucune classe liée</option>
                {modalClassOptions.map((academicClass) => (
                  <option key={academicClass.id} value={String(academicClass.id)}>
                    {academicClass.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-stack">
              <label className="field-label">Objet</label>
              <div className="flex gap-2 flex-wrap">
                {PURPOSES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setModalPurpose(p)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      modalPurpose === p
                        ? PURPOSE_BADGE[p] + ' border-current'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {PURPOSE_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
            <div className="field-stack">
              <label className="field-label">Notes (optionnel)</label>
              <input
                className="input"
                placeholder="Examen Agronomie IAG2, Réunion pédagogique..."
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
              />
            </div>
          </div>
        </ModalShell>

        {/* ── Detail / delete modal ── */}
        <ModalShell
          open={!!detailRes}
          title="Réservation"
          description={detailRes ? `${toDate(detailRes.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })} · ${detailRes.startTime}–${detailRes.endTime}` : ''}
          onClose={() => setDetailRes(null)}
          footer={
            <>
              {detailRes?.status === 'pending' && canApprove(detailRes) && (
                <>
                  <button
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                    type="button"
                    onClick={() => detailRes && approveReservation(detailRes.id)}
                  >
                    <CheckCircle size={13} /> Approuver
                  </button>
                  <button
                    className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    type="button"
                    onClick={() => detailRes && rejectReservation(detailRes.id)}
                  >
                    <XCircle size={13} /> Rejeter
                  </button>
                </>
              )}
              {isAdmin && (
                <button
                  className="btn-outline flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                  type="button"
                  onClick={() => detailRes && deleteReservation(detailRes.id)}
                >
                  <Trash2 size={13} /> Supprimer
                </button>
              )}
              <button className="btn-outline" type="button" onClick={() => setDetailRes(null)}>Fermer</button>
            </>
          }
        >
          {detailRes && (
            <div className="space-y-3">
              <div className={`rounded-xl border-l-4 p-4 ${PURPOSE_STYLE[detailRes.purpose]}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-800">{detailRes.reservedBy}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[detailRes.status]}`}>
                    {STATUS_LABELS[detailRes.status]}
                  </span>
                </div>
                <span className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium ${PURPOSE_BADGE[detailRes.purpose]}`}>
                  {PURPOSE_LABELS[detailRes.purpose]}
                </span>
                {detailRes.notes && <p className="mt-2 text-sm text-slate-600">{detailRes.notes}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Salle</p>
                  <p className="font-medium">{rooms.find((r) => r.id === detailRes.roomId)?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Créneau</p>
                  <p className="font-medium">{detailRes.startTime} – {detailRes.endTime}</p>
                </div>
                {detailRes.requestedBy && (
                  <div>
                    <p className="text-xs text-slate-400">Demandé par</p>
                    <p className="font-medium">{detailRes.requestedBy.fullName}</p>
                  </div>
                )}
                {detailRes.approvedBy && (
                  <div>
                    <p className="text-xs text-slate-400">{detailRes.status === 'rejected' ? 'Rejeté par' : 'Approuvé par'}</p>
                    <p className="font-medium">{detailRes.approvedBy.fullName}</p>
                  </div>
                )}
                {detailRes.approvalNote && (
                  <div className="col-span-2">
                    <p className="text-xs text-slate-400">Motif</p>
                    <p className="font-medium">{detailRes.approvalNote}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-xs text-slate-400">Classe liée</p>
                  <p className="font-medium">{detailRes.academicClass?.name ?? 'Aucune classe'}</p>
                </div>
              </div>
            </div>
          )}
        </ModalShell>
      </div>
    </>
  );
}
