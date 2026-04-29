'use client';

import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Camera, CheckCircle2, Clock3, QrCode, RefreshCw, ShieldCheck, Timer, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { api, getApiErrorMessage } from '@/services/api';
import { useAuth } from '@/features/auth/auth-context';
import { toast } from 'sonner';

type AttendanceStatus = 'present' | 'absent' | 'pending';

type Session = {
  id: number;
  startTime: string;
  endTime: string;
  attendanceEnabled: boolean;
  attendanceDeadline?: string | null;
  attendanceClosedAt?: string | null;
  class: { id: number; name: string; year: number };
  element: { id: number; name: string; type: string; module: { name: string } };
  course?: { id: number; name: string } | null;
  room?: { id: number; name: string } | null;
  teacher?: { id: number; firstName: string; lastName: string } | null;
  qrToken?: string;
};

type RecordRow = {
  id: number;
  status: AttendanceStatus;
  timestamp?: string | null;
  method: 'qr' | 'manual';
  student: {
    id: number;
    fullName: string;
    codeMassar: string;
    codeEtudiant?: string | null;
    sex: 'male' | 'female';
  };
};

type AttendanceOption = { id: number; name: string; year?: number; startTime?: string; endTime?: string; class?: { name: string } };

type SessionOverview = Session & {
  summary: { present: number; absent: number; pending: number };
  students: RecordRow[];
};

type StudentAttendanceHistory = {
  id: number;
  status: AttendanceStatus;
  method: 'qr' | 'manual';
  timestamp?: string | null;
  className: string;
  courseName: string;
  moduleName: string;
  startTime: string;
  endTime: string;
  weekStart?: string | null;
  dayOfWeek: number;
};

function secondsUntil(date?: string | null) {
  if (!date) return 0;
  return Math.max(0, Math.floor((new Date(date).getTime() - Date.now()) / 1000));
}

function formatCountdown(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function statusClass(status: AttendanceStatus) {
  if (status === 'present') return 'status-chip status-chip--ok';
  if (status === 'absent') return 'status-chip status-chip--danger';
  return 'status-chip status-chip--warn';
}

function Scanner({ onToken }: { onToken: (token: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [manual, setManual] = useState('');
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let detector: { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } | null = null;

    const start = async () => {
      try {
        const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => typeof detector }).BarcodeDetector;
        if (!BarcodeDetectorCtor) {
          setSupported(false);
          return;
        }
        detector = new BarcodeDetectorCtor({ formats: ['qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const tick = async () => {
          if (stopped || !videoRef.current || !detector) return;
          const codes = await detector.detect(videoRef.current).catch(() => []);
          const raw = codes[0]?.rawValue;
          if (raw) {
            onToken(raw);
            setActive(false);
            return;
          }
          window.setTimeout(tick, 450);
        };
        void tick();
      } catch {
        setSupported(false);
      }
    };

    void start();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active, onToken]);

  return (
    <div className="surface-card space-y-4">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Scanner la présence</h2>
          <p className="panel-copy">La validation finale reste faite côté serveur: session, délai, classe et inscription.</p>
        </div>
      </div>
      {active && supported ? (
        <video ref={videoRef} className="aspect-video w-full rounded-2xl bg-black object-cover" muted playsInline />
      ) : (
        <button type="button" className="btn-primary" onClick={() => setActive(true)}>
          <Camera size={16} />
          Ouvrir la caméra
        </button>
      )}
      {!supported && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Scanner QR non disponible sur ce navigateur. Utilisez le champ manuel si nécessaire.
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className="input" placeholder="Coller le token QR (secours)" value={manual} onChange={(event) => setManual(event.target.value)} />
        <button type="button" className="btn-outline" onClick={() => manual.trim() && onToken(manual.trim())}>
          Valider
        </button>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const mode = ['admin', 'staff', 'teacher'].includes(user?.role ?? '') ? 'teacher' : 'student';
  const isTeacher = ['admin', 'staff', 'teacher'].includes(user?.role ?? '');
  const [session, setSession] = useState<Session | null>(null);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrImage, setQrImage] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [classes, setClasses] = useState<AttendanceOption[]>([]);
  const [courses, setCourses] = useState<AttendanceOption[]>([]);
  const [sessions, setSessions] = useState<SessionOverview[]>([]);
  const [historyClass, setHistoryClass] = useState<{ id: number; name: string; year: number } | null>(null);
  const [history, setHistory] = useState<StudentAttendanceHistory[]>([]);
  const [filters, setFilters] = useState({
    classId: searchParams.get('classId') ?? '',
    courseId: searchParams.get('courseId') ?? '',
    sessionId: searchParams.get('sessionId') ?? '',
    dateFrom: searchParams.get('dateFrom') ?? '',
    dateTo: searchParams.get('dateTo') ?? '',
  });

  const loadCurrent = useCallback(async () => {
    const res = await api.get<{ current: Session | null }>('/attendance/current', { params: { role: mode } });
    setSession(res.data.current);
  }, [mode]);

  const loadRecords = useCallback(async (sessionId: number) => {
    if (!isTeacher) return;
    const res = await api.get<RecordRow[]>(`/attendance/sessions/${sessionId}/records`);
    setRecords(res.data);
  }, [isTeacher]);

  const loadOptions = useCallback(async () => {
    if (!isTeacher) return;
    const res = await api.get<{ classes: AttendanceOption[]; courses: AttendanceOption[] }>(
      '/attendance/options',
      { params: { classId: filters.classId || undefined, courseId: filters.courseId || undefined, dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined } },
    );
    setClasses(res.data.classes);
    setCourses(res.data.courses);
  }, [filters.classId, filters.courseId, filters.dateFrom, filters.dateTo, isTeacher]);

  const loadOverview = useCallback(async () => {
    if (!isTeacher) return;
    const res = await api.get<SessionOverview[]>('/attendance/overview', {
      params: {
        classId: filters.classId || undefined,
        courseId: filters.courseId || undefined,
        sessionId: filters.sessionId || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      },
    });
    setSessions(res.data);
    if (filters.sessionId) {
      const selected = res.data.find((item) => String(item.id) === filters.sessionId);
      if (selected) {
        setSession(selected);
        setRecords(selected.students);
      }
    } else if (res.data.length > 0) {
      setSession(res.data[0]);
      setRecords(res.data[0].students);
    } else {
      setSession(null);
      setRecords([]);
    }
  }, [filters.classId, filters.courseId, filters.dateFrom, filters.dateTo, filters.sessionId, isTeacher]);

  const loadHistory = useCallback(async () => {
    if (isTeacher) return;
    const res = await api.get<{ class: { id: number; name: string; year: number } | null; history: StudentAttendanceHistory[] }>('/attendance/history');
    setHistoryClass(res.data.class);
    setHistory(res.data.history);
  }, [isTeacher]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (isTeacher) {
          await loadCurrent();
          await loadOptions();
          await loadOverview();
        } else {
          await loadHistory();
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Impossible de charger la séance courante.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isTeacher, loadCurrent, loadHistory, loadOptions, loadOverview]);

  useEffect(() => {
    if (!session?.id || !isTeacher) return;
    void loadRecords(session.id);
    const id = window.setInterval(() => void loadRecords(session.id), 2500);
    return () => window.clearInterval(id);
  }, [isTeacher, loadRecords, session?.id]);

  useEffect(() => {
    setRemaining(secondsUntil(session?.attendanceDeadline));
    const id = window.setInterval(() => setRemaining(secondsUntil(session?.attendanceDeadline)), 1000);
    return () => window.clearInterval(id);
  }, [session?.attendanceDeadline]);

  const counts = useMemo(() => ({
    present: records.filter((record) => record.status === 'present').length,
    absent: records.filter((record) => record.status === 'absent').length,
    pending: records.filter((record) => record.status === 'pending').length,
  }), [records]);

  const enable = async () => {
    if (!session) return;
    try {
      const res = await api.post<Session>(`/attendance/sessions/${session.id}/enable`, { minutes: 90 });
      setSession(res.data);
      if (res.data.qrToken) setQrImage(await QRCode.toDataURL(res.data.qrToken, { margin: 1, width: 320 }));
      await loadRecords(session.id);
      await loadOverview();
      toast.success('Présence activée');
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Impossible d'activer la présence."));
    }
  };

  const disable = async () => {
    if (!session) return;
    await api.post(`/attendance/sessions/${session.id}/disable`);
    await loadCurrent();
    await loadRecords(session.id);
    await loadOverview();
    setQrImage('');
    toast.success('Présence clôturée');
  };

  const extend = async () => {
    if (!session) return;
    const res = await api.post<Session>(`/attendance/sessions/${session.id}/extend`, { minutes: 15 });
    setSession(res.data);
    await loadOverview();
    toast.success('Délai prolongé de 15 minutes');
  };

  const manual = async (studentId: number, status: AttendanceStatus) => {
    if (!session) return;
    await api.post(`/attendance/sessions/${session.id}/manual`, { studentId, status });
    await loadRecords(session.id);
    await loadOverview();
  };

  const scan = async (token: string) => {
    try {
      await api.post('/attendance/scan', { token });
      toast.success('Présence enregistrée');
      await loadHistory();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'QR code invalide ou expiré.'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Présence QR"
        title={isTeacher ? 'Pointage de séance' : 'Scanner ma présence'}
        description={isTeacher
          ? "Détection du cours courant depuis l'emploi du temps, avec sélection manuelle et sauvegarde immédiate en base."
          : 'Ouvrez simplement la caméra pour scanner le QR puis consultez votre historique.'}
      />

      {isTeacher && (
        <section className="surface-card space-y-4">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Filtres de pointage</h2>
              <p className="panel-copy">Admin: tous les filtres. Inspecteur: classes/cours du département. Enseignant: seulement ses cours.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            <select className="input" value={filters.classId} onChange={(e) => setFilters((current) => ({ ...current, classId: e.target.value, sessionId: '' }))}>
              <option value="">Toutes les classes</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}{item.year ? ` (A${item.year})` : ''}</option>)}
            </select>
            <select className="input" value={filters.courseId} onChange={(e) => setFilters((current) => ({ ...current, courseId: e.target.value, sessionId: '' }))}>
              <option value="">Tous les cours</option>
              {courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <input className="input" type="date" value={filters.dateFrom} onChange={(e) => setFilters((current) => ({ ...current, dateFrom: e.target.value }))} />
            <input className="input" type="date" value={filters.dateTo} onChange={(e) => setFilters((current) => ({ ...current, dateTo: e.target.value }))} />
            <button type="button" className="btn-outline" onClick={() => void loadOverview()}>
              <RefreshCw size={14} />
              Charger
            </button>
          </div>
          {sessions.length > 0 && (
            <div className="grid gap-3">
              {sessions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`rounded-2xl border p-4 text-left transition ${session?.id === item.id ? 'border-emerald-400 bg-emerald-50' : 'bg-white hover:border-slate-300'}`}
                  onClick={() => {
                    setSession(item);
                    setRecords(item.students);
                    setFilters((current) => ({ ...current, sessionId: String(item.id) }));
                  }}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{item.course?.name ?? item.element.name}</p>
                      <p className="text-xs text-slate-500">{item.class.name} · {item.startTime} - {item.endTime} · {item.teacher ? `${item.teacher.firstName} ${item.teacher.lastName}` : 'Sans enseignant'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="status-chip status-chip--ok">Présents {item.summary.present}</span>
                      <span className="status-chip status-chip--danger">Absents {item.summary.absent}</span>
                      <span className="status-chip status-chip--warn">Pending {item.summary.pending}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {!isTeacher ? (
        <>
          <Scanner onToken={scan} />
          <section className="surface-card space-y-4">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Historique de présence</h2>
                <p className="panel-copy">
                  {historyClass ? `${historyClass.name} · Année ${historyClass.year}` : 'Historique de votre classe'}
                </p>
              </div>
            </div>
            {loading ? (
              <div className="empty-note">Chargement de votre historique...</div>
            ) : history.length === 0 ? (
              <EmptyState title="Aucun pointage" description="Vos validations de présence apparaîtront ici après chaque scan." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {history.map((item) => (
                  <article key={item.id} className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.moduleName}</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">{item.courseName}</h3>
                      </div>
                      <span className={statusClass(item.status)}>{item.status}</span>
                    </div>
                    <div className="mt-4 space-y-1 text-sm text-slate-600">
                      <p>{item.className}</p>
                      <p>{item.startTime} - {item.endTime}</p>
                      <p>{item.timestamp ? new Date(item.timestamp).toLocaleString('fr-FR') : 'Non scanné'}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : loading ? (
        <div className="empty-note">Recherche de la séance courante...</div>
      ) : !session ? (
        <EmptyState title="Aucune séance courante" description="Aucune séance planifiée n&apos;a été trouvée pour votre profil aujourd&apos;hui." />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
            <div className="surface-card space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{session.element.module.name}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-950">{session.course?.name ?? session.element.name}</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {session.class.name} · Salle {session.room?.name ?? '-'} · {session.startTime} - {session.endTime}
                  </p>
                </div>
                <span className={session.attendanceEnabled ? 'status-chip status-chip--ok' : 'status-chip status-chip--muted'}>
                  {session.attendanceEnabled ? 'Ouverte' : 'Fermée'}
                </span>
              </div>

              {isTeacher && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary" onClick={enable}>
                    <QrCode size={16} />
                    Activer la présence
                  </button>
                  <button type="button" className="btn-outline" onClick={extend} disabled={!session.attendanceEnabled}>
                    <Timer size={16} />
                    +15 minutes
                  </button>
                  <button type="button" className="btn-outline" onClick={disable}>
                    <XCircle size={16} />
                    Clôturer
                  </button>
                  <button type="button" className="btn-outline" onClick={() => void loadRecords(session.id)}>
                    <RefreshCw size={16} />
                    Actualiser
                  </button>
                </div>
              )}
            </div>

            <div className="surface-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Fenêtre de pointage</p>
                  <p className="text-xs text-slate-500">Expiration automatique du QR</p>
                </div>
                <Clock3 className="text-primary" size={22} />
              </div>
              <div className="text-4xl font-semibold tabular-nums text-slate-950">{formatCountdown(remaining)}</div>
              <p className="text-xs text-slate-500">
                Deadline: {session.attendanceDeadline ? new Date(session.attendanceDeadline).toLocaleString('fr-FR') : '-'}
              </p>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
            <div className="surface-card space-y-4 text-center">
              <h2 className="panel-title">QR dynamique</h2>
              {qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrImage} alt="QR code de présence" className="mx-auto rounded-3xl border bg-white p-3 shadow-sm" />
              ) : (
                <div className="empty-note">Activez la présence pour générer le QR.</div>
              )}
              <div className="grid grid-cols-3 gap-2 text-sm">
                <span className="status-chip status-chip--ok justify-center">Présents {counts.present}</span>
                <span className="status-chip status-chip--warn justify-center">Pending {counts.pending}</span>
                <span className="status-chip status-chip--danger justify-center">Absents {counts.absent}</span>
              </div>
            </div>

            <div className="surface-card space-y-4">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Étudiants en temps réel</h2>
                  <p className="panel-copy">Mise à jour par polling toutes les 2,5 secondes après chaque scan.</p>
                </div>
              </div>
              <div className="grid gap-3">
                {records.map((record) => (
                  <div key={record.id} className="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{record.student.fullName}</p>
                      <p className="text-xs text-slate-500">{record.student.codeEtudiant ?? record.student.codeMassar}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={statusClass(record.status)}>{record.status}</span>
                      <button className="btn-outline px-3 py-1.5 text-xs" type="button" onClick={() => manual(record.student.id, 'present')}>
                        <CheckCircle2 size={13} />
                        Présent
                      </button>
                      <button className="btn-outline px-3 py-1.5 text-xs" type="button" onClick={() => manual(record.student.id, 'absent')}>
                        Absent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          <div className="surface-card flex items-start gap-3">
            <ShieldCheck className="mt-0.5 text-primary" size={18} />
            <p className="text-sm leading-6 text-slate-600">
              Le QR ne contient pas l&apos;identité étudiant. Le serveur vérifie le token, la séance, le délai, la classe et l&apos;inscription avant d&apos;enregistrer une présence.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
