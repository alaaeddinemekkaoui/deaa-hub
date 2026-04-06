'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BookOpen, CalendarRange, Clock } from 'lucide-react';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type AcademicClass = { id: number; name: string; year: number };
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

// Returns Monday of the given date's week in YYYY-MM-DD
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
  return h - 8; // row index (0 = 08h)
}

function rowSpan(start: string, end: string): number {
  const [sh] = start.split(':').map(Number);
  const [eh] = end.split(':').map(Number);
  return eh - sh;
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

  const weekStart = useMemo(() => getWeekStart(toLocalDate(selectedDate)), [selectedDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 4), [weekStart]);

  // Unscheduled: elements not in any session this week for selected class
  const scheduledElementIds = useMemo(() => new Set(sessions.map((s) => s.element.id)), [sessions]);
  const unscheduled = useMemo(
    () => elements.filter((e) => !scheduledElementIds.has(e.id)),
    [elements, scheduledElementIds],
  );

  // Conflict session ids
  const conflictSessionIds = useMemo(() => new Set(conflicts.flatMap((c) => c.sessionIds)), [conflicts]);

  // Session add modal
  const [addModal, setAddModal] = useState(false);
  const [addDay, setAddDay] = useState('1');
  const [addStart, setAddStart] = useState('08:00');
  const [addEnd, setAddEnd] = useState('10:00');
  const [addElementId, setAddElementId] = useState('');
  const [addTeacherId, setAddTeacherId] = useState('');
  const [addRoomId, setAddRoomId] = useState('');
  const [saving, setSaving] = useState(false);

  // Session move modal
  const [moveModal, setMoveModal] = useState(false);
  const [movingSession, setMovingSession] = useState<Session | null>(null);
  const [moveDate, setMoveDate] = useState('');
  const [moveStart, setMoveStart] = useState('08:00');
  const [moveEnd, setMoveEnd] = useState('10:00');
  const [moveTeacherId, setMoveTeacherId] = useState('');
  const [moveRoomId, setMoveRoomId] = useState('');
  const [savingMove, setSavingMove] = useState(false);

  // Load reference data once
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

  // Load elements when class is selected
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

  // Load timetable
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
      toast.error(getApiErrorMessage(err, 'Impossible de charger l\'emploi du temps'));
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, weekStart]);

  useEffect(() => {
    if (!selectedClassId) {
      setSessions([]);
      setConflicts([]);
      return;
    }
    void loadTimetable();
  }, [loadTimetable, selectedClassId]);

  // Build the grid: grid[day][startRow] = session
  const grid = useMemo(() => {
    const g: Record<number, Record<number, Session>> = {};
    for (let d = 1; d <= 5; d++) g[d] = {};
    for (const s of sessions) {
      const row = timeToRow(s.startTime);
      if (row >= 0 && row < 11) g[s.dayOfWeek][row] = s;
    }
    return g;
  }, [sessions]);

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
        weekStart: weekStart,
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

  const openAddModal = (day?: number, hour?: number) => {
    setAddDay(String(day ?? 1));
    setAddStart(hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : '08:00');
    setAddEnd(hour !== undefined ? `${String(hour + 2).padStart(2, '0')}:00` : '10:00');
    setAddElementId('');
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Emploi du temps"
        title="Générateur d'emploi du temps"
        description="Planifiez les cours par classe et semaine. Les conflits (même enseignant, même salle ou même classe en simultané) sont signalés automatiquement."
      />

      {/* ── Toolbar ── */}
      <section className="surface-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="field-stack">
            <label className="field-label">Classe</label>
            <select className="input xl:min-w-52" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} disabled={loadingMeta}>
              <option value="">Sélectionner une classe</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} — Année {c.year}</option>)}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Date de référence</label>
            <input type="date" className="input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
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
          <button className="btn-primary self-end" type="button" onClick={loadTimetable} disabled={!selectedClassId || loading}>
            {loading ? 'Chargement...' : 'Générer'}
          </button>
          {selectedClassId && (
            <button className="btn-outline self-end" type="button" onClick={() => openAddModal()}>
              + Session
            </button>
          )}
        </div>

        {/* Week nav */}
        <div className="mt-3 flex items-center gap-3">
          <button type="button" className="btn-outline text-xs" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>← Semaine préc.</button>
          <span className="text-sm font-medium text-slate-600">
            Semaine du {toLocalDate(weekStart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            {' '}au {toLocalDate(weekEnd).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          <button type="button" className="btn-outline text-xs" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>Semaine suiv. →</button>
        </div>
      </section>

      {/* ── Stats bar ── */}
      {sessions.length > 0 && (
        <section className="surface-card flex items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <CalendarRange size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{sessions.length} session{sessions.length !== 1 ? 's' : ''} planifiée{sessions.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex-1 rounded-full bg-slate-100 h-2">
            <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (sessions.length / Math.max(1, sessions.length + unscheduled.length)) * 100)}%` }} />
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
        <div className="surface-card empty-note">Sélectionnez une classe et cliquez sur Générer pour afficher l’emploi du temps.</div>
      ) : (
        <section className="flex gap-4">
          {/* ── Weekly grid ── */}
          <div className="surface-card flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th className="w-16 border-b border-r border-slate-100 bg-slate-50 py-3 text-center text-xs font-medium text-slate-400">Heure</th>
                  {DAYS.map((day, i) => {
                    const date = new Date(weekStart);
                    date.setDate(date.getDate() + i);
                    return (
                      <th key={day} className="border-b border-r border-slate-100 bg-slate-50 py-3 text-center text-xs font-semibold text-slate-700">
                        <span className="block">{day}</span>
                        <span className="block font-normal text-slate-400">{date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
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

                      // Skip cells that are spanned by a session starting earlier
                      const coveredByAbove = !session && HOURS.slice(0, hour - 8).some((h) => {
                        const s = grid[day]?.[h - 8];
                        return s && timeToRow(s.startTime) < hour - 8 && timeToRow(s.startTime) + rowSpan(s.startTime, s.endTime) > hour - 8;
                      });

                      if (coveredByAbove) return null;

                      const span = session ? rowSpan(session.startTime, session.endTime) : 1;

                      return (
                        <td
                          key={day}
                          rowSpan={span > 1 ? span : undefined}
                          className={`border-b border-r border-slate-100 p-1 align-top ${!session ? 'cursor-pointer hover:bg-slate-50' : ''}`}
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
                              <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${TYPE_BADGE[session.element.type]}`}>{session.element.type}</span>
                              {session.teacher && <p className="mt-1 text-[10px] text-slate-500">{session.teacher.firstName} {session.teacher.lastName}</p>}
                              {session.room && <p className="inline-block rounded-full bg-white/60 px-1.5 py-0.5 text-[10px] text-slate-600">{session.room.name}</p>}
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

          {/* ── Unscheduled panel ── */}
          <div className="w-72 shrink-0">
            <div className="surface-card sticky top-4 overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3">
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
                      onClick={() => { setAddElementId(String(el.id)); openAddModal(); }}
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
                <p className="text-[11px] text-slate-400">Cliquez sur une carte ou une cellule vide du calendrier pour planifier</p>
              </div>
            </div>

            {/* Conflict list */}
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
          <div className="field-stack">
            <label className="field-label">Élément / Cours</label>
            <select className="input" value={addElementId} onChange={(e) => setAddElementId(e.target.value)}>
              <option value="">Sélectionner un cours</option>
              {elements.map((el) => (
                <option key={el.id} value={el.id}>{el.name} ({el.type}) — {el.module.name}</option>
              ))}
            </select>
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
                {HOURS.map((h) => <option key={h} value={`${String(h).padStart(2,'0')}:00`}>{String(h).padStart(2,'0')}h00</option>)}
              </select>
            </div>
            <div className="field-stack">
              <label className="field-label">Fin</label>
              <select className="input" value={addEnd} onChange={(e) => setAddEnd(e.target.value)}>
                {HOURS.slice(1).map((h) => <option key={h} value={`${String(h).padStart(2,'0')}:00`}>{String(h).padStart(2,'0')}h00</option>)}
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
  );
}
