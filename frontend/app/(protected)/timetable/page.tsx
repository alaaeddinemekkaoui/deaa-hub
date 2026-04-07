'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Department = { id: number; name: string };
type Filiere = { id: number; name: string; department: Department };
type AcademicOption = { id: number; name: string; code: string };
type AcademicClass = {
  id: number;
  name: string;
  year: number;
  filiereId: number | null;
  optionId: number | null;
  filiere?: Filiere | null;
  academicOption?: AcademicOption | null;
};
type Room = { id: number; name: string };
type Teacher = { id: number; firstName: string; lastName: string };
type ElementModule = { id: number; name: string; type: 'CM' | 'TD' | 'TP'; volumeHoraire?: number | null; module: { name: string } };

type Session = {
  id: number;
  elementId: number;
  classId: number;
  teacherId: number | null;
  roomId: number | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  weekStart: string | null;
  element: { id: number; name: string; type: 'CM' | 'TD' | 'TP'; module: { name: string } };
  class: { id: number; name: string; year: number };
  teacher?: { id: number; firstName: string; lastName: string } | null;
  room?: { id: number; name: string } | null;
};

type Conflict = { sessionIds: number[]; reason: string };

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8h to 18h

const TYPE_STYLE: Record<string, string> = {
  CM: 'bg-blue-50 border-blue-300 text-blue-900',
  TD: 'bg-teal-50 border-teal-300 text-teal-900',
  TP: 'bg-amber-50 border-amber-300 text-amber-900',
};

const TYPE_BADGE: Record<string, string> = {
  CM: 'bg-blue-100 text-blue-700',
  TD: 'bg-teal-100 text-teal-700',
  TP: 'bg-amber-100 text-amber-700',
};

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getWeekStart(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return formatDateInput(d);
}

function addDays(dateValue: string, n: number): string {
  const d = toLocalDate(dateValue);
  d.setDate(d.getDate() + n);
  return formatDateInput(d);
}

function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  return `${String(h + hours).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function getSessionDate(weekStart: string, dayOfWeek: number): string {
  return addDays(weekStart, dayOfWeek - 1);
}

function getDayOfWeekFromDate(dateValue: string): number {
  const day = toLocalDate(dateValue).getDay();
  return day === 0 ? 7 : day;
}

function timeToRow(time: string): number {
  const [h] = time.split(':').map(Number);
  return h - 8;
}

function rowSpan(start: string, end: string): number {
  const [sh] = start.split(':').map(Number);
  const [eh] = end.split(':').map(Number);
  return eh - sh;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TimetablePage() {
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [elements, setElements] = useState<ElementModule[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => formatDateInput(new Date()));
  const [filterRoomId, setFilterRoomId] = useState('');
  const [filterTeacherId, setFilterTeacherId] = useState('');

  // Class cascading filters (all client-side, derived from loaded classes)
  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterFiliereId, setFilterFiliereId] = useState('');
  const [filterOptionId, setFilterOptionId] = useState('');

  // Slide animation
  const [animClass, setAnimClass] = useState('');
  const touchStartX = useRef<number | null>(null);

  const weekStart = useMemo(() => getWeekStart(toLocalDate(selectedDate)), [selectedDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 4), [weekStart]);
  const todayStr = useMemo(() => formatDateInput(new Date()), []);
  const currentWeekStart = useMemo(() => getWeekStart(new Date()), []);
  const isCurrentWeek = weekStart === currentWeekStart;
  const weekNumber = useMemo(() => getWeekNumber(toLocalDate(weekStart)), [weekStart]);

  const scheduledElementIds = useMemo(() => new Set(sessions.map((s) => s.element.id)), [sessions]);
  const unscheduled = useMemo(
    () => elements.filter((e) => !scheduledElementIds.has(e.id)),
    [elements, scheduledElementIds],
  );
  const conflictSessionIds = useMemo(() => new Set(conflicts.flatMap((c) => c.sessionIds)), [conflicts]);

  // ── Class cascading filters (pure client-side, no extra requests) ────────────
  const departments = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of classes) {
      if (c.filiere?.department) map.set(c.filiere.department.id, c.filiere.department.name);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classes]);

  const filieres = useMemo(() => {
    const map = new Map<number, Filiere>();
    for (const c of classes) {
      if (!c.filiere) continue;
      if (filterDeptId && String(c.filiere.department.id) !== filterDeptId) continue;
      map.set(c.filiere.id, c.filiere);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [classes, filterDeptId]);

  const options = useMemo(() => {
    const map = new Map<number, AcademicOption>();
    for (const c of classes) {
      if (!c.academicOption) continue;
      if (filterDeptId && c.filiere?.department && String(c.filiere.department.id) !== filterDeptId) continue;
      if (filterFiliereId && String(c.filiereId) !== filterFiliereId) continue;
      map.set(c.academicOption.id, c.academicOption);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [classes, filterDeptId, filterFiliereId]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      if (filterDeptId && String(c.filiere?.department?.id) !== filterDeptId) return false;
      if (filterFiliereId && String(c.filiereId) !== filterFiliereId) return false;
      if (filterOptionId && String(c.optionId) !== filterOptionId) return false;
      return true;
    });
  }, [classes, filterDeptId, filterFiliereId, filterOptionId]);

  const changeDept = (id: string) => {
    setFilterDeptId(id);
    setFilterFiliereId('');
    setFilterOptionId('');
    setSelectedClassId('');
  };
  const changeFiliere = (id: string) => {
    setFilterFiliereId(id);
    setFilterOptionId('');
    setSelectedClassId('');
  };
  const changeOption = (id: string) => {
    setFilterOptionId(id);
    setSelectedClassId('');
  };

  // Session add modal
  const [addModal, setAddModal] = useState(false);
  const [addDay, setAddDay] = useState('1');
  const [addStart, setAddStart] = useState('08:00');
  const [addEnd, setAddEnd] = useState('10:00');
  const [addModuleFilter, setAddModuleFilter] = useState('');
  const [addElementId, setAddElementId] = useState('');
  const [addTeacherId, setAddTeacherId] = useState('');
  const [addRoomId, setAddRoomId] = useState('');
  const [saving, setSaving] = useState(false);

  // Unique module names from loaded elements — no extra request needed
  const moduleNames = useMemo(
    () => Array.from(new Set(elements.map((e) => e.module.name))).sort(),
    [elements],
  );

  // Elements filtered by selected module (client-side only)
  const filteredElements = useMemo(
    () => (addModuleFilter ? elements.filter((e) => e.module.name === addModuleFilter) : elements),
    [elements, addModuleFilter],
  );

  const handleModuleFilterChange = (moduleName: string) => {
    setAddModuleFilter(moduleName);
    // Clear element selection if it no longer belongs to the new module
    if (addElementId) {
      const el = elements.find((e) => String(e.id) === addElementId);
      if (el && el.module.name !== moduleName) setAddElementId('');
    }
  };

  // Session move modal
  const [moveModal, setMoveModal] = useState(false);
  const [movingSession, setMovingSession] = useState<Session | null>(null);
  const [moveDate, setMoveDate] = useState('');
  const [moveStart, setMoveStart] = useState('08:00');
  const [moveEnd, setMoveEnd] = useState('10:00');
  const [moveTeacherId, setMoveTeacherId] = useState('');
  const [moveRoomId, setMoveRoomId] = useState('');
  const [savingMove, setSavingMove] = useState(false);

  // ── Week navigation with animation ──────────────────────────────────────────

  const goWeek = useCallback((delta: number) => {
    setAnimClass(delta > 0 ? 'timetable-slide-from-right' : 'timetable-slide-from-left');
    setSelectedDate((prev) => addDays(prev, delta));
    setTimeout(() => setAnimClass(''), 320);
  }, []);

  const goToday = useCallback(() => {
    const todayWeek = getWeekStart(new Date());
    if (todayWeek === weekStart) return;
    const delta = toLocalDate(todayWeek) > toLocalDate(weekStart) ? 1 : -1;
    setAnimClass(delta > 0 ? 'timetable-slide-from-right' : 'timetable-slide-from-left');
    setSelectedDate(formatDateInput(new Date()));
    setTimeout(() => setAnimClass(''), 320);
  }, [weekStart]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); goWeek(-7); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goWeek(7); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goWeek]);

  // Touch / swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 60) goWeek(diff > 0 ? 7 : -7);
    touchStartX.current = null;
  };

  // ── Data loading ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingMeta(true);
        const [cRes, rRes, tRes] = await Promise.all([
          api.get<PaginatedResponse<AcademicClass>>('/classes', { params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' } }),
          api.get<Room[]>('/rooms'),
          api.get<PaginatedResponse<Teacher>>('/teachers', { params: { page: 1, limit: 200, sortBy: 'lastName', sortOrder: 'asc' } }),
        ]);
        setClasses(cRes.data.data ?? []);
        setRooms(Array.isArray(rRes.data) ? rRes.data : []);
        setTeachers(tRes.data.data ?? []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les données de référence'));
      } finally {
        setLoadingMeta(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!selectedClassId) { setElements([]); return; }
    const load = async () => {
      try {
        const res = await api.get<PaginatedResponse<ElementModule>>('/element-modules', { params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' } });
        setElements(res.data.data);
      } catch { /* silent */ }
    };
    void load();
  }, [selectedClassId]);

  const loadTimetable = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const res = await api.get<{ sessions: Session[]; conflicts: Conflict[] }>('/timetable/week', {
        params: { classId: selectedClassId, weekStart },
      });
      setSessions(res.data.sessions);
      setConflicts(res.data.conflicts);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de charger l'emploi du temps"));
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, weekStart]);

  useEffect(() => {
    if (!selectedClassId) { setSessions([]); setConflicts([]); return; }
    void loadTimetable();
  }, [loadTimetable, selectedClassId]);

  // ── Grid ─────────────────────────────────────────────────────────────────────

  const grid = useMemo(() => {
    const g: Record<number, Record<number, Session>> = {};
    for (let d = 1; d <= 5; d++) g[d] = {};
    for (const s of sessions) {
      const row = timeToRow(s.startTime);
      if (row >= 0 && row < 11) g[s.dayOfWeek][row] = s;
    }
    return g;
  }, [sessions]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const saveSession = async () => {
    if (!selectedClassId || !addElementId || !addDay || !addStart || !addEnd) return;
    setSaving(true);
    try {
      await api.post('/timetable', {
        elementId: Number(addElementId),
        classId: Number(selectedClassId),
        teacherId: addTeacherId ? Number(addTeacherId) : null,
        roomId: addRoomId ? Number(addRoomId) : null,
        dayOfWeek: Number(addDay),
        startTime: addStart,
        endTime: addEnd,
        weekStart,
      });
      toast.success('Session planifiée');
      setAddModal(false);
      await loadTimetable();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Erreur lors de la planification'));
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (id: number) => {
    if (!window.confirm('Supprimer cette session ?')) return;
    try {
      await api.delete(`/timetable/${id}`);
      toast.success('Session supprimée');
      await loadTimetable();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Erreur'));
    }
  };

  const openAddModal = (day?: number, hour?: number, elementId?: string) => {
    setAddDay(String(day ?? 1));
    setAddStart(hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : '08:00');
    setAddEnd(hour !== undefined ? `${String(hour + 2).padStart(2, '0')}:00` : '10:00');
    if (elementId) {
      const el = elements.find((e) => String(e.id) === elementId);
      setAddModuleFilter(el?.module.name ?? '');
      setAddElementId(elementId);
    } else {
      setAddModuleFilter('');
      setAddElementId('');
    }
    setAddTeacherId('');
    setAddRoomId('');
    setAddModal(true);
  };

  const openMoveModal = (session: Session) => {
    const sessionDate = getSessionDate(session.weekStart ?? weekStart, session.dayOfWeek);
    setMovingSession(session);
    setMoveDate(sessionDate);
    setMoveStart(session.startTime);
    setMoveEnd(addHoursToTime(session.startTime, 2));
    setMoveTeacherId(session.teacher?.id ? String(session.teacher.id) : '');
    setMoveRoomId(session.room?.id ? String(session.room.id) : '');
    setMoveModal(true);
  };

  const saveMoveSession = async () => {
    if (!movingSession || !moveDate) return;
    const dayOfWeek = getDayOfWeekFromDate(moveDate);
    if (dayOfWeek < 1 || dayOfWeek > 5) {
      toast.error('Choisissez une date entre lundi et vendredi');
      return;
    }
    setSavingMove(true);
    try {
      await api.patch(`/timetable/${movingSession.id}`, {
        elementId: movingSession.elementId,
        classId: movingSession.classId,
        teacherId: moveTeacherId ? Number(moveTeacherId) : null,
        roomId: moveRoomId ? Number(moveRoomId) : null,
        dayOfWeek,
        startTime: moveStart,
        endTime: moveEnd,
        weekStart: getWeekStart(toLocalDate(moveDate)),
      });
      toast.success('Session déplacée');
      setMoveModal(false);
      setMovingSession(null);
      await loadTimetable();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Erreur lors du déplacement'));
    } finally {
      setSavingMove(false);
    }
  };

  const selectedClass = classes.find((c) => String(c.id) === selectedClassId);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .timetable-slide-from-right {
          animation: timetableSlideFromRight 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        .timetable-slide-from-left {
          animation: timetableSlideFromLeft 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        @keyframes timetableSlideFromRight {
          from { transform: translateX(48px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes timetableSlideFromLeft {
          from { transform: translateX(-48px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
      `}</style>

      <div className="space-y-5">
        <PageHeader
          eyebrow="Emploi du temps"
          title="L'emploi du temps"
          description="Planifiez les cours par classe et semaine. Les conflits sont signalés automatiquement."
        />

        {/* ── Toolbar ── */}
        <section className="surface-card p-4 space-y-4">
          {/* Row 1 — class cascade: Département → Filière → Option → Classe */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sélection de la classe</p>
            <div className="flex flex-wrap items-end gap-3">
              {/* Département */}
              <div className="field-stack">
                <label className="field-label">Département</label>
                <select
                  className="input min-w-40"
                  value={filterDeptId}
                  onChange={(e) => changeDept(e.target.value)}
                  disabled={loadingMeta}
                >
                  <option value="">Tous ({departments.length})</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Filière — only shown once dept is picked or filieres exist */}
              {(filterDeptId || filieres.length > 0) && (
                <div className="field-stack">
                  <label className="field-label">Filière</label>
                  <select
                    className="input min-w-40"
                    value={filterFiliereId}
                    onChange={(e) => changeFiliere(e.target.value)}
                    disabled={loadingMeta || filieres.length === 0}
                  >
                    <option value="">Toutes ({filieres.length})</option>
                    {filieres.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Option — only shown if options exist at this level */}
              {options.length > 0 && (
                <div className="field-stack">
                  <label className="field-label">Option</label>
                  <select
                    className="input min-w-36"
                    value={filterOptionId}
                    onChange={(e) => changeOption(e.target.value)}
                    disabled={loadingMeta}
                  >
                    <option value="">Toutes ({options.length})</option>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Classe — filtered list */}
              <div className="field-stack">
                <label className="field-label">
                  Classe
                  {filteredClasses.length < classes.length && (
                    <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                      {filteredClasses.length}
                    </span>
                  )}
                </label>
                <select
                  className="input min-w-44"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  disabled={loadingMeta || filteredClasses.length === 0}
                >
                  <option value="">
                    {filteredClasses.length === 0
                      ? 'Aucune classe'
                      : `Sélectionner (${filteredClasses.length})`}
                  </option>
                  {filteredClasses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} — Année {c.year}</option>
                  ))}
                </select>
              </div>

              {selectedClassId && (
                <button className="btn-outline self-end" type="button" onClick={() => openAddModal()}>
                  + Session
                </button>
              )}
            </div>
          </div>

          {/* Row 2 — session filters */}
          <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-3">
            <div className="field-stack">
              <label className="field-label">Salle</label>
              <select className="input xl:max-w-44" value={filterRoomId} onChange={(e) => setFilterRoomId(e.target.value)}>
                <option value="">Toutes</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="field-stack">
              <label className="field-label">Enseignant</label>
              <select className="input xl:max-w-48" value={filterTeacherId} onChange={(e) => setFilterTeacherId(e.target.value)}>
                <option value="">Tous</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2 — week navigator */}
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
                    onClick={goToday}
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
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-500">
                  S{weekNumber}
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-800 tabular-nums">
                {toLocalDate(weekStart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                <span className="mx-1.5 text-slate-400">–</span>
                {toLocalDate(weekEnd).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                ← → pour naviguer · glisser sur le calendrier
              </span>
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

        {/* ── Stats bar ── */}
        {sessions.length > 0 && (
          <section className="surface-card flex items-center gap-4 p-4">
            <div className="flex items-center gap-2">
              <CalendarRange size={16} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} planifiée{sessions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex-1 rounded-full bg-slate-100 h-2">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min(100, (sessions.length / Math.max(1, sessions.length + unscheduled.length)) * 100)}%` }}
              />
            </div>
            {unscheduled.length > 0 && (
              <span className="text-sm text-amber-600 font-medium">{unscheduled.length} non planifié{unscheduled.length !== 1 ? 's' : ''}</span>
            )}
            {conflicts.length > 0 && (
              <span className="flex items-center gap-1 text-sm text-red-600 font-medium">
                <AlertTriangle size={14} />{conflicts.length} conflit{conflicts.length !== 1 ? 's' : ''}
              </span>
            )}
          </section>
        )}

        {!selectedClassId ? (
          <div className="surface-card empty-note">Sélectionnez une classe pour afficher l&apos;emploi du temps.</div>
        ) : (
          <section className="flex gap-4">
            {/* ── Weekly grid ── */}
            <div
              className="surface-card flex-1 overflow-auto"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {loading && (
                <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                  Chargement...
                </div>
              )}

              {!loading && (
                <div className={animClass}>
                  <table className="w-full border-collapse text-sm" style={{ minWidth: 700 }}>
                    <thead>
                      <tr>
                        <th className="w-14 border-b border-r border-slate-100 bg-slate-50 py-3 text-center text-xs font-medium text-slate-400">
                          Heure
                        </th>
                        {DAYS.map((day, i) => {
                          const date = toLocalDate(addDays(weekStart, i));
                          const dateStr = formatDateInput(date);
                          const isToday = dateStr === todayStr;
                          return (
                            <th
                              key={day}
                              className={`border-b border-r border-slate-100 py-3 text-center text-xs font-semibold transition-colors ${
                                isToday
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="block">{day}</span>
                              <span className={`block font-normal ${isToday ? 'text-blue-400 font-semibold' : 'text-slate-400'}`}>
                                {date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                              </span>
                              {isToday && (
                                <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {HOURS.map((hour) => (
                        <tr key={hour} className="group">
                          <td className="border-b border-r border-slate-100 bg-slate-50 py-2 text-center text-xs text-slate-400 align-top">
                            {String(hour).padStart(2, '0')}h
                          </td>
                          {[1, 2, 3, 4, 5].map((day) => {
                            const session = grid[day]?.[hour - 8];
                            const isConflict = session && conflictSessionIds.has(session.id);

                            const coveredByAbove = !session && HOURS.slice(0, hour - 8).some((h) => {
                              const s = grid[day]?.[h - 8];
                              return s && timeToRow(s.startTime) < hour - 8 && timeToRow(s.startTime) + rowSpan(s.startTime, s.endTime) > hour - 8;
                            });

                            if (coveredByAbove) return null;

                            const span = session ? rowSpan(session.startTime, session.endTime) : 1;
                            const dayDateStr = formatDateInput(toLocalDate(addDays(weekStart, day - 1)));
                            const isTodayCol = dayDateStr === todayStr;

                            return (
                              <td
                                key={day}
                                rowSpan={span > 1 ? span : undefined}
                                className={`border-b border-r border-slate-100 p-1 align-top transition-colors ${
                                  !session
                                    ? `cursor-pointer ${isTodayCol ? 'hover:bg-blue-50' : 'hover:bg-slate-50'}`
                                    : ''
                                } ${isTodayCol && !session ? 'bg-blue-50/30' : ''}`}
                                onClick={!session ? () => openAddModal(day, hour) : undefined}
                              >
                                {session && (
                                  <div
                                    className={`relative h-full rounded-lg border-l-4 p-2 ${TYPE_STYLE[session.element.type]} ${isConflict ? '!border-red-400 !bg-red-50' : ''}`}
                                    style={{ minHeight: `${span * 3}rem` }}
                                  >
                                    {isConflict && (
                                      <div className="absolute right-1 top-1">
                                        <AlertTriangle size={12} className="text-red-500" />
                                      </div>
                                    )}
                                    <p className="text-xs font-bold leading-tight">{session.element.name}</p>
                                    <p className="mt-0.5 text-[10px] text-slate-500">{session.element.module.name}</p>
                                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[session.element.type]}`}>
                                      {session.element.type}
                                    </span>
                                    {session.teacher && (
                                      <p className="mt-1 text-[10px] text-slate-500">{session.teacher.firstName} {session.teacher.lastName}</p>
                                    )}
                                    {session.room && (
                                      <p className="inline-block rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] text-slate-600">{session.room.name}</p>
                                    )}
                                    <div className="mt-2 flex items-center gap-2">
                                      <button
                                        type="button"
                                        className="rounded bg-white/70 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-white"
                                        onClick={(e) => { e.stopPropagation(); openMoveModal(session); }}
                                      >
                                        Déplacer
                                      </button>
                                      <button
                                        type="button"
                                        className="absolute bottom-1 right-1 text-[10px] text-slate-400 hover:text-red-500"
                                        onClick={(e) => { e.stopPropagation(); void deleteSession(session.id); }}
                                      >✕</button>
                                    </div>
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
              )}
            </div>

            {/* ── Unscheduled panel ── */}
            <div className="w-72 shrink-0">
              <div className="surface-card sticky top-4 overflow-hidden">
                <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                  <p className="font-semibold text-slate-800">Non planifiés</p>
                  {unscheduled.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{unscheduled.length}</span>
                  )}
                </div>
                {unscheduled.length === 0 ? (
                  <div className="empty-note text-sm text-emerald-600">Tous les éléments sont planifiés ✓</div>
                ) : (
                  <div className="divide-y divide-slate-50 overflow-y-auto" style={{ maxHeight: '65vh' }}>
                    {unscheduled.map((el) => (
                      <div
                        key={el.id}
                        className="flex cursor-pointer flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 mx-3 my-2 p-3 hover:border-amber-400"
                        onClick={() => openAddModal(undefined, undefined, String(el.id))}
                      >
                        <p className="text-sm font-medium text-slate-800">{el.name}</p>
                        <p className="text-xs text-slate-500">{el.module.name}</p>
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[el.type]}`}>{el.type}</span>
                          {el.volumeHoraire && <span className="text-[10px] text-slate-400">{el.volumeHoraire}h</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-slate-100 px-4 py-3">
                  <p className="text-[11px] text-slate-400">Cliquez sur une carte ou une cellule vide pour planifier</p>
                </div>
              </div>

              {conflicts.length > 0 && (
                <div className="surface-card mt-3 overflow-hidden">
                  <div className="border-b border-red-100 bg-red-50 px-4 py-3 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-500" />
                    <p className="text-sm font-semibold text-red-700">Conflits ({conflicts.length})</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {conflicts.map((c, i) => (
                      <div key={i} className="px-4 py-2">
                        <p className="text-xs text-red-600">{c.reason}</p>
                        <p className="text-[10px] text-slate-400">Sessions #{c.sessionIds.join(', #')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Add Session modal ── */}
        <ModalShell
          open={addModal}
          title="Planifier une session"
          description={selectedClass ? `Classe : ${selectedClass.name} · Semaine du ${toLocalDate(weekStart).toLocaleDateString('fr-FR')}` : ''}
          onClose={() => setAddModal(false)}
          footer={
            <>
              <button className="btn-primary" type="button" onClick={saveSession} disabled={saving || !addElementId}>
                {saving ? 'Planification...' : 'Planifier'}
              </button>
              <button className="btn-outline" type="button" onClick={() => setAddModal(false)}>Annuler</button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="field-stack">
                <label className="field-label">Module</label>
                <select
                  className="input"
                  value={addModuleFilter}
                  onChange={(e) => handleModuleFilterChange(e.target.value)}
                >
                  <option value="">Tous les modules</option>
                  {moduleNames.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Élément / Cours</label>
                <select
                  className="input"
                  value={addElementId}
                  onChange={(e) => setAddElementId(e.target.value)}
                  disabled={filteredElements.length === 0}
                >
                  <option value="">
                    {addModuleFilter
                      ? `${filteredElements.length} élément${filteredElements.length !== 1 ? 's' : ''}`
                      : 'Sélectionner un cours'}
                  </option>
                  {filteredElements.map((el) => (
                    <option key={el.id} value={el.id}>
                      {el.name} ({el.type}){el.volumeHoraire ? ` · ${el.volumeHoraire}h` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="field-stack">
                <label className="field-label">Jour</label>
                <select className="input" value={addDay} onChange={(e) => setAddDay(e.target.value)}>
                  {DAYS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Début</label>
                <select className="input" value={addStart} onChange={(e) => setAddStart(e.target.value)}>
                  {HOURS.map((h) => <option key={h} value={`${String(h).padStart(2, '0')}:00`}>{String(h).padStart(2, '0')}h00</option>)}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Fin</label>
                <select className="input" value={addEnd} onChange={(e) => setAddEnd(e.target.value)}>
                  {HOURS.slice(1).map((h) => <option key={h} value={`${String(h).padStart(2, '00')}:00`}>{String(h).padStart(2, '0')}h00</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field-stack">
                <label className="field-label">Enseignant (optionnel)</label>
                <select className="input" value={addTeacherId} onChange={(e) => setAddTeacherId(e.target.value)}>
                  <option value="">Aucun</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Salle (optionnel)</label>
                <select className="input" value={addRoomId} onChange={(e) => setAddRoomId(e.target.value)}>
                  <option value="">Aucune</option>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </ModalShell>

        {/* ── Move Session modal ── */}
        <ModalShell
          open={moveModal}
          title="Déplacer une session"
          description={movingSession ? `${movingSession.element.name} · ${movingSession.element.module.name}` : ''}
          onClose={() => setMoveModal(false)}
          footer={
            <>
              <button className="btn-primary" type="button" onClick={saveMoveSession} disabled={savingMove || !movingSession}>
                {savingMove ? 'Déplacement...' : 'Déplacer'}
              </button>
              <button className="btn-outline" type="button" onClick={() => setMoveModal(false)}>Annuler</button>
            </>
          }
        >
          <div className="space-y-3">
            <div className="field-stack">
              <label className="field-label">Date</label>
              <input type="date" className="input" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="field-stack">
                <label className="field-label">Début</label>
                <select
                  className="input"
                  value={moveStart}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setMoveStart(nextStart);
                    setMoveEnd(addHoursToTime(nextStart, 2));
                  }}
                >
                  {HOURS.map((h) => <option key={h} value={`${String(h).padStart(2, '0')}:00`}>{String(h).padStart(2, '0')}h00</option>)}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Fin</label>
                <select className="input" value={moveEnd} onChange={(e) => setMoveEnd(e.target.value)}>
                  {HOURS.slice(1).map((h) => <option key={h} value={`${String(h).padStart(2, '0')}:00`}>{String(h).padStart(2, '0')}h00</option>)}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Jour</label>
                <input
                  className="input"
                  value={moveDate ? ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][getDayOfWeekFromDate(moveDate) - 1] ?? '' : ''}
                  readOnly
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field-stack">
                <label className="field-label">Enseignant</label>
                <select className="input" value={moveTeacherId} onChange={(e) => setMoveTeacherId(e.target.value)}>
                  <option value="">Aucun</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
                </select>
              </div>
              <div className="field-stack">
                <label className="field-label">Salle</label>
                <select className="input" value={moveRoomId} onChange={(e) => setMoveRoomId(e.target.value)}>
                  <option value="">Aucune</option>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            <p className="text-xs text-slate-400">La durée est initialisée à 2h par défaut lors du déplacement.</p>
          </div>
        </ModalShell>
      </div>
    </>
  );
}
