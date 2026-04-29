'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, AlertTriangle, GraduationCap, Users } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { MetricCard } from '@/components/admin/metric-card';
import { PageHeader } from '@/components/admin/page-header';
import { api, fetchCollectionRef, getApiErrorMessage } from '@/services/api';

type Analytics = {
  metrics: {
    totalStudents: number;
    teachersCount: number;
    classesCount: number;
    attendanceRate: number;
    present: number;
    absent: number;
    pending: number;
  };
  studentsPerFiliere: Array<{ filiere: string; total: number }>;
  studentsPerClass: Array<{ className: string; total: number }>;
  genderDistribution: Array<{ gender: string; total: number }>;
  attendanceByStatus: Array<{ status: string; total: number }>;
  attendanceByClass: Array<{ name: string; present: number; absent: number; pending: number; rate: number }>;
  attendanceTrends: Array<{ date: string; present: number; absent: number; pending: number }>;
  mostAbsentStudents: Array<{ studentId: number; name: string; total: number }>;
  mostActiveStudents: Array<{ studentId: number; name: string; total: number }>;
  teacherCompliance: Array<{ teacherId: number; name: string; records: number }>;
  insights: {
    highAbsenceStudents: Array<{ studentId: number; name: string; total: number }>;
    lowAttendanceClasses: Array<{ name: string; rate: number }>;
  };
};

type RefItem = { id: number; name: string; departmentId?: number | null; filiereId?: number | null };

const COLORS = ['#1b5e3b', '#256f9f', '#c97b2f', '#b71c1c', '#64748b'];

export default function StatisticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<RefItem[]>([]);
  const [filieres, setFilieres] = useState<RefItem[]>([]);
  const [classes, setClasses] = useState<RefItem[]>([]);
  const [courses, setCourses] = useState<RefItem[]>([]);
  const [filters, setFilters] = useState({
    departmentId: '',
    filiereId: '',
    classId: '',
    courseId: '',
    gender: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    const loadRefs = async () => {
      const [deps, fils, cls, crs] = await Promise.all([
        fetchCollectionRef<RefItem>('/departments?page=1&limit=500&sortBy=name&sortOrder=asc'),
        fetchCollectionRef<RefItem>('/filieres?page=1&limit=500&sortBy=name&sortOrder=asc'),
        fetchCollectionRef<RefItem>('/classes?page=1&limit=500&sortBy=name&sortOrder=asc'),
        fetchCollectionRef<RefItem>('/cours?page=1&limit=500&sortBy=name&sortOrder=asc'),
      ]);
      setDepartments(deps);
      setFilieres(fils);
      setClasses(cls);
      setCourses(crs);
    };
    void loadRefs().catch(() => undefined);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
        const res = await api.get<Analytics>('/analytics/overview', { params });
        setData(res.data);
      } catch (err) {
        setError(getApiErrorMessage(err, "Impossible de charger les statistiques."));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [filters]);

  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'departmentId' ? { filiereId: '', classId: '' } : {}),
      ...(key === 'filiereId' ? { classId: '' } : {}),
    }));
  };

  const filteredFilieres = filieres.filter((item) => !filters.departmentId || String(item.departmentId) === filters.departmentId);
  const filteredClasses = classes.filter((item) => !filters.filiereId || String(item.filiereId) === filters.filiereId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Statistiques dynamiques"
        description="Analysez les effectifs et la présence avec filtres progressifs, tendances et alertes d'absentéisme."
      />

      <section className="surface-card space-y-4">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Filtres progressifs</h2>
            <p className="panel-copy">Global par défaut, puis département, filière, classe et cours si nécessaire.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <select className="input" value={filters.departmentId} onChange={(event) => setFilter('departmentId', event.target.value)}>
            <option value="">Global</option>
            {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className="input" value={filters.filiereId} onChange={(event) => setFilter('filiereId', event.target.value)}>
            <option value="">Toutes les filières</option>
            {filteredFilieres.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className="input" value={filters.classId} onChange={(event) => setFilter('classId', event.target.value)}>
            <option value="">Toutes les classes</option>
            {filteredClasses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className="input" value={filters.courseId} onChange={(event) => setFilter('courseId', event.target.value)}>
            <option value="">Tous les cours</option>
            {courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className="input" value={filters.gender} onChange={(event) => setFilter('gender', event.target.value)}>
            <option value="">Tous genres</option>
            <option value="male">Homme</option>
            <option value="female">Femme</option>
          </select>
          <select className="input" value={filters.status} onChange={(event) => setFilter('status', event.target.value)}>
            <option value="">Tous statuts</option>
            <option value="present">Présent</option>
            <option value="absent">Absent</option>
            <option value="pending">Pending</option>
          </select>
          <input className="input" type="date" value={filters.startDate} onChange={(event) => setFilter('startDate', event.target.value)} />
          <input className="input" type="date" value={filters.endDate} onChange={(event) => setFilter('endDate', event.target.value)} />
        </div>
      </section>

      {loading ? (
        <div className="empty-note">Chargement des graphiques...</div>
      ) : error ? (
        <div className="empty-note">{error}</div>
      ) : !data ? (
        <EmptyState title="Aucune donnée" description="Les graphiques apparaîtront après chargement des données." />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Étudiants" value={data.metrics.totalStudents} hint="Après filtres" icon={GraduationCap} />
            <MetricCard label="Enseignants" value={data.metrics.teachersCount} hint="Personnel enregistré" icon={Users} />
            <MetricCard label="Taux présence" value={`${data.metrics.attendanceRate}%`} hint={`${data.metrics.present} présents`} icon={Activity} />
            <MetricCard label="Absences" value={data.metrics.absent} hint={`${data.metrics.pending} en attente`} icon={AlertTriangle} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="surface-card space-y-4">
              <h2 className="panel-title">Présence par classe</h2>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.attendanceByClass.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e4dc" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#1b5e3b" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="surface-card space-y-4">
              <h2 className="panel-title">Statuts de présence</h2>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.attendanceByStatus} dataKey="total" nameKey="status" innerRadius={72} outerRadius={112} paddingAngle={4}>
                      {data.attendanceByStatus.map((item, index) => <Cell key={item.status} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="surface-card space-y-4">
              <h2 className="panel-title">Tendances de présence</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.attendanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e4dc" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="present" stroke="#1b5e3b" strokeWidth={3} />
                    <Line type="monotone" dataKey="absent" stroke="#b71c1c" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="surface-card space-y-4">
              <h2 className="panel-title">Distribution genre</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.genderDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e4dc" />
                    <XAxis dataKey="gender" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#256f9f" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <RankCard title="Étudiants les plus absents" rows={data.mostAbsentStudents} valueLabel="absence(s)" />
            <RankCard title="Étudiants les plus actifs" rows={data.mostActiveStudents} valueLabel="présence(s)" />
            <div className="surface-card space-y-3">
              <h2 className="panel-title">Conformité enseignants</h2>
              {data.teacherCompliance.length === 0 ? <p className="empty-note">Aucune présence enregistrée.</p> : data.teacherCompliance.map((item) => (
                <div key={item.teacherId} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="status-chip status-chip--ok">{item.records} pointages</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function RankCard({ title, rows, valueLabel }: { title: string; rows: Array<{ studentId: number; name: string; total: number }>; valueLabel: string }) {
  return (
    <div className="surface-card space-y-3">
      <h2 className="panel-title">{title}</h2>
      {rows.length === 0 ? (
        <p className="empty-note">Aucune donnée disponible.</p>
      ) : (
        rows.map((item) => (
          <div key={item.studentId} className="flex items-center justify-between rounded-2xl border px-4 py-3">
            <span className="font-medium text-slate-800">{item.name}</span>
            <span className="status-chip status-chip--muted">{item.total} {valueLabel}</span>
          </div>
        ))
      )}
    </div>
  );
}
