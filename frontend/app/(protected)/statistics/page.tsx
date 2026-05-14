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
import { Activity, AlertTriangle, Download, FileSpreadsheet, FileText, GraduationCap, Users } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { exportRecords, ExportFormat } from '@/lib/export';
import { api, fetchCollectionRef, getApiErrorMessage } from '@/services/api';

type Analytics = {
  metrics: {
    totalStudents: number;
    teachersCount: number;
    classesCount: number;
    filieresCount: number;
    departmentsCount: number;
    attendanceRate: number;
    present: number;
    absent: number;
    pending: number;
  };
  studentsPerDepartment: Array<{ department: string; total: number }>;
  studentsPerFiliere: Array<{ filiere: string; total: number }>;
  studentsPerClass: Array<{ className: string; total: number }>;
  studentsByBirthYear: Array<{ birthYear: string; total: number }>;
  studentsByAge: Array<{ age: string; total: number }>;
  genderDistribution: Array<{ gender: string; total: number }>;
  teacherGenderDistribution: Array<{ gender: string; total: number }>;
  teachersPerDepartment: Array<{ department: string; total: number }>;
  teachersPerFiliere: Array<{ filiere: string; total: number }>;
  teacherClassLoad: Array<{ teacherId: number; name: string; department: string; filiere: string; classes: number; classNames: string }>;
  classTeacherCounts: Array<{ classId: number; name: string; filiere: string; department: string; teachers: number }>;
  classesPerFiliere: Array<{ filiere: string; total: number }>;
  classesPerDepartment: Array<{ department: string; total: number }>;
  coursByFiliere: Array<{ filiere: string; department: string; totalCourses: number; totalClasses: number; courses: string }>;
  attendanceByStatus: Array<{ status: string; total: number }>;
  attendanceByClass: Array<{ name: string; present: number; absent: number; pending: number; rate: number }>;
  attendanceByCourse: Array<{ name: string; present: number; absent: number; pending: number; rate: number }>;
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
type StatsExportMode = 'filteredStats' | 'allStats' | 'filteredStudents' | 'allStudents' | 'filteredTeachers' | 'allTeachers';
type DetailsModalState = {
  title: string;
  rows: Array<{
    id: string | number;
    title: string;
    subtitle?: string;
    chip?: string;
    detail?: string;
  }>;
} | null;

const COLORS = ['#1b5e3b', '#256f9f', '#c97b2f', '#b71c1c', '#64748b'];

const STUDENT_EXPORT_FIELDS = [
  { key: 'fullName', label: 'Nom complet' },
  { key: 'email', label: 'Email' },
  { key: 'telephone', label: 'Téléphone' },
  { key: 'sex', label: 'Sexe' },
  { key: 'cin', label: 'CIN' },
  { key: 'codeMassar', label: 'Code Massar' },
  { key: 'filiere.name', label: 'Filière' },
  { key: 'academicClass.name', label: 'Classe' },
  { key: 'anneeAcademique', label: 'Année académique' },
];

const TEACHER_EXPORT_FIELDS = [
  { key: 'firstName', label: 'Prénom' },
  { key: 'lastName', label: 'Nom' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Téléphone' },
  { key: 'sex', label: 'Sexe' },
  { key: 'department.name', label: 'Département' },
  { key: 'filiere.name', label: 'Filière' },
  { key: 'role.name', label: 'Rôle' },
  { key: 'grade.name', label: 'Grade' },
];

export default function StatisticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'global' | 'presence'>('global');
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
    birthYear: '',
    startDate: '',
    endDate: '',
  });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [statsExportMode, setStatsExportMode] = useState<StatsExportMode>('filteredStats');
  const [statsExportFormat, setStatsExportFormat] = useState<ExportFormat>('csv');
  const [statsExporting, setStatsExporting] = useState(false);
  const [studentExportFields, setStudentExportFields] = useState(STUDENT_EXPORT_FIELDS.map((field) => field.key));
  const [teacherExportFields, setTeacherExportFields] = useState(TEACHER_EXPORT_FIELDS.map((field) => field.key));
  const [detailsModal, setDetailsModal] = useState<DetailsModalState>(null);

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

  const getFilterLabel = (key: keyof typeof filters, value: string) => {
    if (!value) return 'Tous';
    if (key === 'departmentId') return departments.find((item) => String(item.id) === value)?.name ?? value;
    if (key === 'filiereId') return filieres.find((item) => String(item.id) === value)?.name ?? value;
    if (key === 'classId') return classes.find((item) => String(item.id) === value)?.name ?? value;
    if (key === 'courseId') return courses.find((item) => String(item.id) === value)?.name ?? value;
    if (key === 'gender') return value === 'male' ? 'Homme' : 'Femme';
    if (key === 'status') {
      const labels: Record<string, string> = { present: 'Présent', absent: 'Absent', pending: 'Pending' };
      return labels[value] ?? value;
    }
    if (key === 'birthYear') return value;
    return value;
  };

  const activeFilterParams = () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value));

  const buildStatisticsRows = (analytics: Analytics, title: string) => {
    const generatedAt = new Date().toLocaleString('fr-FR');
    const filterRows = Object.entries(filters).map(([key, value]) => ({
      section: 'Filtres',
      item: key,
      value: getFilterLabel(key as keyof typeof filters, value),
      detail: '',
    }));
    return [
      { section: 'Export', item: title, value: generatedAt, detail: '' },
      ...filterRows,
      { section: 'Indicateurs', item: 'Étudiants', value: analytics.metrics.totalStudents, detail: '' },
      { section: 'Indicateurs', item: 'Enseignants', value: analytics.metrics.teachersCount, detail: '' },
      { section: 'Indicateurs', item: 'Classes', value: analytics.metrics.classesCount, detail: '' },
      { section: 'Indicateurs', item: 'Filières', value: analytics.metrics.filieresCount, detail: '' },
      { section: 'Indicateurs', item: 'Départements', value: analytics.metrics.departmentsCount, detail: '' },
      { section: 'Présence', item: 'Taux présence', value: `${analytics.metrics.attendanceRate}%`, detail: '' },
      { section: 'Présence', item: 'Présents', value: analytics.metrics.present, detail: '' },
      { section: 'Présence', item: 'Absents', value: analytics.metrics.absent, detail: '' },
      { section: 'Présence', item: 'En attente', value: analytics.metrics.pending, detail: '' },
      ...analytics.studentsPerDepartment.map((item) => ({ section: 'Étudiants par département', item: item.department, value: item.total, detail: '' })),
      ...analytics.studentsPerFiliere.map((item) => ({ section: 'Étudiants par filière', item: item.filiere, value: item.total, detail: '' })),
      ...analytics.studentsPerClass.map((item) => ({ section: 'Étudiants par classe', item: item.className, value: item.total, detail: '' })),
      ...analytics.genderDistribution.map((item) => ({ section: 'Sexe étudiants', item: item.gender, value: item.total, detail: '' })),
      ...analytics.teacherGenderDistribution.map((item) => ({ section: 'Sexe enseignants', item: item.gender, value: item.total, detail: '' })),
      ...analytics.teachersPerDepartment.map((item) => ({ section: 'Enseignants par département', item: item.department, value: item.total, detail: '' })),
      ...analytics.teachersPerFiliere.map((item) => ({ section: 'Enseignants par filière', item: item.filiere, value: item.total, detail: '' })),
      ...analytics.classesPerDepartment.map((item) => ({ section: 'Classes par département', item: item.department, value: item.total, detail: '' })),
      ...analytics.classesPerFiliere.map((item) => ({ section: 'Classes par filière', item: item.filiere, value: item.total, detail: '' })),
      ...analytics.coursByFiliere.map((item) => ({ section: 'Cours par filière', item: item.filiere, value: item.totalCourses, detail: item.courses })),
      ...analytics.attendanceByClass.map((item) => ({ section: 'Présence par classe', item: item.name, value: `${item.rate}%`, detail: `${item.present} P / ${item.absent} A / ${item.pending} pending` })),
      ...analytics.attendanceByCourse.map((item) => ({ section: 'Présence par cours', item: item.name, value: `${item.rate}%`, detail: `${item.present} P / ${item.absent} A / ${item.pending} pending` })),
    ];
  };

  const fetchPaginatedExportRows = async (endpoint: string, params: Record<string, unknown>) => {
    const rows: Array<Record<string, unknown>> = [];
    let page = 1;
    let hasNextPage = true;
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );
    while (hasNextPage) {
      const response = await api.get<{ data: Array<Record<string, unknown>>; meta: { hasNextPage: boolean } }>(endpoint, {
        params: { ...cleanParams, page, limit: 200 },
      });
      rows.push(...response.data.data);
      hasNextPage = response.data.meta.hasNextPage;
      page += 1;
      if (page > 100) break;
    }
    return rows;
  };

  const handleStatisticsExport = async () => {
    if (!data || statsExporting) return;
    setStatsExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      if (statsExportMode === 'filteredStats' || statsExportMode === 'allStats') {
        const analytics =
          statsExportMode === 'filteredStats'
            ? data
            : (await api.get<Analytics>('/analytics/overview')).data;
        exportRecords({
          rows: buildStatisticsRows(analytics, statsExportMode === 'filteredStats' ? 'Statistiques filtrées' : 'Statistiques globales'),
          fileName: `statistiques-${statsExportMode}-${timestamp}`,
          format: statsExportFormat,
        });
      } else {
        const isStudentExport = statsExportMode.includes('Students');
        const isFiltered = statsExportMode.startsWith('filtered');
        const currentParams = activeFilterParams();
        const params = isFiltered
          ? isStudentExport
            ? {
                search: undefined,
                departmentId: currentParams.departmentId,
                filiereId: currentParams.filiereId,
                classId: currentParams.classId,
                gender: currentParams.gender,
                birthYear: currentParams.birthYear,
              }
            : {
                departmentId: currentParams.departmentId,
                filiereId: currentParams.filiereId,
                sex: currentParams.gender,
              }
          : {};
        const rows = await fetchPaginatedExportRows(isStudentExport ? '/students' : '/teachers', params);
        const fields = isStudentExport
          ? STUDENT_EXPORT_FIELDS.filter((field) => studentExportFields.includes(field.key))
          : TEACHER_EXPORT_FIELDS.filter((field) => teacherExportFields.includes(field.key));
        exportRecords({
          rows,
          columns: fields,
          fileName: `${isStudentExport ? 'etudiants' : 'enseignants'}-${isFiltered ? 'filtres' : 'tout'}-${timestamp}`,
          format: statsExportFormat,
        });
      }
      setIsExportModalOpen(false);
    } finally {
      setStatsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="Statistiques dynamiques"
        description="Analysez les effectifs avec filtres progressifs. La présence est isolée dans son propre onglet."
      />

      <section className="surface-card space-y-4">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Filtres progressifs</h2>
            <p className="panel-copy">Global par défaut, puis département, filière, classe et cours si nécessaire.</p>
          </div>
          <button
            className="btn-outline flex items-center gap-2"
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            disabled={loading || !data}
          >
            <Download size={14} />
            Exporter
          </button>
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
          <input
            className="input"
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            placeholder="Année naissance"
            value={filters.birthYear}
            onChange={(event) => setFilter('birthYear', event.target.value)}
          />
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
          <section className="flex gap-2">
            <button
              type="button"
              className={activeTab === 'global' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setActiveTab('global')}
            >
              Global
            </button>
            <button
              type="button"
              className={activeTab === 'presence' ? 'btn-primary' : 'btn-outline'}
              onClick={() => setActiveTab('presence')}
            >
              Présence
            </button>
          </section>

          {activeTab === 'global' ? (
          <>
          <section className="grid gap-4 md:grid-cols-5">
            <MetricCard label="Étudiants" value={data.metrics.totalStudents} hint="Après filtres" icon={GraduationCap} />
            <MetricCard label="Enseignants" value={data.metrics.teachersCount} hint="Personnel enregistré" icon={Users} />
            <MetricCard label="Classes" value={data.metrics.classesCount} hint="Classes filtrées" icon={Users} />
            <MetricCard label="Filières" value={data.metrics.filieresCount} hint="Avec étudiants" icon={GraduationCap} />
            <MetricCard label="Départements" value={data.metrics.departmentsCount} hint="Avec étudiants" icon={Users} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="surface-card space-y-4">
              <h2 className="panel-title">Étudiants par département</h2>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.studentsPerDepartment.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e4dc" />
                    <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#1b5e3b" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="surface-card space-y-4">
              <h2 className="panel-title">Répartition par âge</h2>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.studentsByAge}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e4dc" />
                    <XAxis dataKey="age" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#256f9f" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="surface-card space-y-4">
              <h2 className="panel-title">Étudiants par filière</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.studentsPerFiliere.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e4dc" />
                    <XAxis dataKey="filiere" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#1b5e3b" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="surface-card space-y-4">
              <h2 className="panel-title">Étudiants par classe</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.studentsPerClass.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d8e4dc" />
                    <XAxis dataKey="className" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="#256f9f" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <TeacherLoadCard
              title="Classes par enseignant"
              rows={data.teacherClassLoad}
              onShowMore={() =>
                setDetailsModal({
                  title: 'Classes par enseignant',
                  rows: data.teacherClassLoad.map((item) => ({
                    id: item.teacherId,
                    title: item.name,
                    chip: `${item.classes} classe(s)`,
                    detail: item.classNames || 'Aucune classe affectée',
                  })),
                })
              }
            />
            <div className="surface-card space-y-3">
              <CardTitleWithTotal title="Enseignants par classe" total={data.classTeacherCounts.length} />
              {data.classTeacherCounts.length === 0 ? <p className="empty-note">Aucune classe disponible.</p> : data.classTeacherCounts.slice(0, 3).map((item) => (
                <div key={item.classId} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="status-chip status-chip--ok">{item.teachers} enseignant(s)</span>
                </div>
              ))}
              <ShowMoreButton
                count={data.classTeacherCounts.length}
                onClick={() =>
                  setDetailsModal({
                    title: 'Enseignants par classe',
                    rows: data.classTeacherCounts.map((item) => ({
                      id: item.classId,
                      title: item.name,
                      subtitle: [item.filiere, item.department].filter(Boolean).join(' · '),
                      chip: `${item.teachers} enseignant(s)`,
                    })),
                  })
                }
              />
            </div>
            <div className="surface-card space-y-3">
              <h2 className="panel-title">Filtres appliqués</h2>
              <div className="grid gap-2 text-sm text-slate-700">
                <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span>Étudiants filtrés</span>
                  <strong>{data.metrics.totalStudents}</strong>
                </div>
                <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span>Enseignants filtrés</span>
                  <strong>{data.metrics.teachersCount}</strong>
                </div>
                <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span>Classes filtrées</span>
                  <strong>{data.metrics.classesCount}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-3">
            <SimpleCountCard
              title="Classes par filière"
              rows={data.classesPerFiliere.map((item) => ({ name: item.filiere, total: item.total }))}
              valueLabel="classe(s)"
              onShowMore={(rows) =>
                setDetailsModal({
                  title: 'Classes par filière',
                  rows: rows.map((item) => ({
                    id: item.name,
                    title: item.name,
                    chip: `${item.total} classe(s)`,
                  })),
                })
              }
            />
            <SimpleCountCard
              title="Classes par département"
              rows={data.classesPerDepartment.map((item) => ({ name: item.department, total: item.total }))}
              valueLabel="classe(s)"
              onShowMore={(rows) =>
                setDetailsModal({
                  title: 'Classes par département',
                  rows: rows.map((item) => ({
                    id: item.name,
                    title: item.name,
                    chip: `${item.total} classe(s)`,
                  })),
                })
              }
            />
            <div className="surface-card space-y-3">
              <CardTitleWithTotal title="Cours regroupés par filière" total={data.coursByFiliere.length} />
              {data.coursByFiliere.length === 0 ? <p className="empty-note">Aucun cours affecté.</p> : data.coursByFiliere.slice(0, 3).map((item) => (
                <div key={item.filiere} className="rounded-2xl border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-slate-800">{item.filiere}</span>
                    <span className="status-chip status-chip--muted">{item.totalCourses} cours</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.courses || 'Aucun cours'}</p>
                </div>
              ))}
              <ShowMoreButton
                count={data.coursByFiliere.length}
                onClick={() =>
                  setDetailsModal({
                    title: 'Cours regroupés par filière',
                    rows: data.coursByFiliere.map((item) => ({
                      id: item.filiere,
                      title: item.filiere,
                      subtitle: item.department,
                      chip: `${item.totalCourses} cours`,
                      detail: item.courses || 'Aucun cours',
                    })),
                  })
                }
              />
            </div>
          </section>
          </>
          ) : (
          <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Taux présence" value={`${data.metrics.attendanceRate}%`} hint={`${data.metrics.present} présents`} icon={Activity} />
            <MetricCard label="Présents" value={data.metrics.present} hint="Pointages présents" icon={Users} />
            <MetricCard label="Absents" value={data.metrics.absent} hint="Pointages absents" icon={AlertTriangle} />
            <MetricCard label="En attente" value={data.metrics.pending} hint="Pointages non validés" icon={Activity} />
          </section>

          <section className="grid gap-5 xl:grid-cols-2">
            <div className="surface-card space-y-4">
              <h2 className="panel-title">Tendances de présence</h2>
              <div className="h-[280px]">
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
              <h2 className="panel-title">Genre et présence</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.genderDistribution} dataKey="total" nameKey="gender" innerRadius={52} outerRadius={92} paddingAngle={4}>
                        {data.genderDistribution.map((item, index) => <Cell key={item.gender} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.attendanceByStatus} dataKey="total" nameKey="status" innerRadius={52} outerRadius={92} paddingAngle={4}>
                        {data.attendanceByStatus.map((item, index) => <Cell key={item.status} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>
          <section className="grid gap-5 xl:grid-cols-3">
            <RankCard
              title="Étudiants les plus absents"
              rows={data.mostAbsentStudents}
              valueLabel="absence(s)"
              onShowMore={(rows) =>
                setDetailsModal({
                  title: 'Étudiants les plus absents',
                  rows: rows.map((item) => ({
                    id: item.studentId,
                    title: item.name,
                    chip: `${item.total} absence(s)`,
                  })),
                })
              }
            />
            <RankCard
              title="Étudiants les plus actifs"
              rows={data.mostActiveStudents}
              valueLabel="présence(s)"
              onShowMore={(rows) =>
                setDetailsModal({
                  title: 'Étudiants les plus actifs',
                  rows: rows.map((item) => ({
                    id: item.studentId,
                    title: item.name,
                    chip: `${item.total} présence(s)`,
                  })),
                })
              }
            />
            <div className="surface-card space-y-3">
              <CardTitleWithTotal title="Conformité enseignants" total={data.teacherCompliance.length} />
              {data.teacherCompliance.length === 0 ? <p className="empty-note">Aucune présence enregistrée.</p> : data.teacherCompliance.slice(0, 3).map((item) => (
                <div key={item.teacherId} className="flex items-center justify-between rounded-2xl border px-4 py-3">
                  <span className="font-medium text-slate-800">{item.name}</span>
                  <span className="status-chip status-chip--ok">{item.records} pointages</span>
                </div>
              ))}
              <ShowMoreButton
                count={data.teacherCompliance.length}
                onClick={() =>
                  setDetailsModal({
                    title: 'Conformité enseignants',
                    rows: data.teacherCompliance.map((item) => ({
                      id: item.teacherId,
                      title: item.name,
                      chip: `${item.records} pointages`,
                    })),
                  })
                }
              />
            </div>
          </section>
          <section className="grid gap-5 xl:grid-cols-2">
            <PresenceCard
              title="Présence par cours"
              rows={data.attendanceByCourse}
              onShowMore={(rows) =>
                setDetailsModal({
                  title: 'Présence par cours',
                  rows: rows.map((item) => ({
                    id: item.name,
                    title: item.name,
                    chip: `${item.rate}%`,
                    detail: `${item.present} présents / ${item.absent} absents / ${item.pending} en attente`,
                  })),
                })
              }
            />
            <div className="surface-card space-y-4">
              <h2 className="panel-title">Sexe des enseignants</h2>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.teacherGenderDistribution} dataKey="total" nameKey="gender" innerRadius={52} outerRadius={92} paddingAngle={4}>
                      {data.teacherGenderDistribution.map((item, index) => <Cell key={item.gender} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
          </>
          )}
        </>
      )}

      <ModalShell
        open={isExportModalOpen}
        title="Exporter"
        description="Choisissez entre les nombres calculés et les données détaillées, puis sélectionnez les champs utiles."
        onClose={() => setIsExportModalOpen(false)}
        footer={
          <>
            <button
              className="btn-primary"
              type="button"
              onClick={handleStatisticsExport}
              disabled={
                statsExporting ||
                (statsExportMode.includes('Students') && studentExportFields.length === 0) ||
                (statsExportMode.includes('Teachers') && teacherExportFields.length === 0)
              }
            >
              {statsExporting ? 'Export...' : 'Exporter maintenant'}
            </button>
            <button className="btn-outline" type="button" onClick={() => setIsExportModalOpen(false)}>
              Annuler
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['filteredStats', 'Statistiques filtrées', 'Nombres selon les filtres actuels.'],
              ['allStats', 'Toutes les statistiques', 'Nombres globaux sans filtres.'],
              ['filteredStudents', 'Étudiants filtrés', 'Données étudiants selon les filtres compatibles.'],
              ['allStudents', 'Tous les étudiants', 'Toute la table étudiants.'],
              ['filteredTeachers', 'Enseignants filtrés', 'Données enseignants selon département, filière et sexe.'],
              ['allTeachers', 'Tous les enseignants', 'Toute la table enseignants.'],
            ] as Array<[StatsExportMode, string, string]>).map(([mode, title, description]) => (
              <button
                key={mode}
                type="button"
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  statsExportMode === mode
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-emerald-200'
                }`}
                onClick={() => setStatsExportMode(mode)}
              >
                <p className="font-medium text-slate-900">{title}</p>
                <p className="text-sm text-slate-500">{description}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                statsExportFormat === 'csv' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
              }`}
              onClick={() => setStatsExportFormat('csv')}
            >
              <FileText size={16} />
              <p className="mt-2 font-medium text-slate-900">CSV</p>
            </button>
            <button
              type="button"
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                statsExportFormat === 'excel' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'
              }`}
              onClick={() => setStatsExportFormat('excel')}
            >
              <FileSpreadsheet size={16} />
              <p className="mt-2 font-medium text-slate-900">Excel</p>
            </button>
          </div>

          {statsExportMode.includes('Students') ? (
            <FieldPicker
              fields={STUDENT_EXPORT_FIELDS}
              selected={studentExportFields}
              onChange={setStudentExportFields}
            />
          ) : null}
          {statsExportMode.includes('Teachers') ? (
            <FieldPicker
              fields={TEACHER_EXPORT_FIELDS}
              selected={teacherExportFields}
              onChange={setTeacherExportFields}
            />
          ) : null}
        </div>
      </ModalShell>

      <ModalShell
        open={!!detailsModal}
        title={detailsModal?.title ?? ''}
        description="Liste complète"
        onClose={() => setDetailsModal(null)}
        footer={
          <button className="btn-outline" type="button" onClick={() => setDetailsModal(null)}>
            Fermer
          </button>
        }
      >
        <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
          {detailsModal?.rows.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{item.title}</p>
                  {item.subtitle ? <p className="mt-0.5 text-xs text-slate-500">{item.subtitle}</p> : null}
                </div>
                {item.chip ? <span className="status-chip status-chip--muted shrink-0">{item.chip}</span> : null}
              </div>
              {item.detail ? <p className="mt-2 text-xs text-slate-500">{item.detail}</p> : null}
            </div>
          ))}
        </div>
      </ModalShell>
    </div>
  );
}

function FieldPicker({
  fields,
  selected,
  onChange,
}: {
  fields: Array<{ key: string; label: string }>;
  selected: string[];
  onChange: (keys: string[]) => void;
}) {
  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">Champs à exporter</p>
        <div className="flex gap-2">
          <button className="btn-outline px-3 py-1 text-xs" type="button" onClick={() => onChange(fields.map((field) => field.key))}>
            Tout
          </button>
          <button className="btn-outline px-3 py-1 text-xs" type="button" onClick={() => onChange([])}>
            Aucun
          </button>
        </div>
      </div>
      <div className="grid max-h-72 gap-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={selected.includes(field.key)} onChange={() => toggle(field.key)} />
            {field.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function RankCard({
  title,
  rows,
  valueLabel,
  onShowMore,
}: {
  title: string;
  rows: Array<{ studentId: number; name: string; total: number }>;
  valueLabel: string;
  onShowMore: (rows: Array<{ studentId: number; name: string; total: number }>) => void;
}) {
  return (
    <div className="surface-card space-y-3">
      <CardTitleWithTotal title={title} total={rows.length} />
      {rows.length === 0 ? (
        <p className="empty-note">Aucune donnée disponible.</p>
      ) : (
        rows.slice(0, 3).map((item) => (
          <div key={item.studentId} className="flex items-center justify-between rounded-2xl border px-4 py-3">
            <span className="font-medium text-slate-800">{item.name}</span>
            <span className="status-chip status-chip--muted">{item.total} {valueLabel}</span>
          </div>
        ))
      )}
      <ShowMoreButton count={rows.length} onClick={() => onShowMore(rows)} />
    </div>
  );
}

function SimpleCountCard({
  title,
  rows,
  valueLabel,
  onShowMore,
}: {
  title: string;
  rows: Array<{ name: string; total: number }>;
  valueLabel: string;
  onShowMore: (rows: Array<{ name: string; total: number }>) => void;
}) {
  return (
    <div className="surface-card space-y-3">
      <CardTitleWithTotal title={title} total={rows.length} />
      {rows.length === 0 ? (
        <p className="empty-note">Aucune donnée disponible.</p>
      ) : (
        rows.slice(0, 3).map((item) => (
          <div key={item.name} className="flex items-center justify-between rounded-2xl border px-4 py-3">
            <span className="font-medium text-slate-800">{item.name}</span>
            <span className="status-chip status-chip--muted">{item.total} {valueLabel}</span>
          </div>
        ))
      )}
      <ShowMoreButton count={rows.length} onClick={() => onShowMore(rows)} />
    </div>
  );
}

function PresenceCard({
  title,
  rows,
  onShowMore,
}: {
  title: string;
  rows: Array<{ name: string; present: number; absent: number; pending: number; rate: number }>;
  onShowMore: (rows: Array<{ name: string; present: number; absent: number; pending: number; rate: number }>) => void;
}) {
  return (
    <div className="surface-card space-y-3">
      <CardTitleWithTotal title={title} total={rows.length} />
      {rows.length === 0 ? (
        <p className="empty-note">Aucune présence enregistrée.</p>
      ) : (
        rows.slice(0, 3).map((item) => (
          <div key={item.name} className="rounded-2xl border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-800">{item.name}</span>
              <span className="status-chip status-chip--ok">{item.rate}%</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {item.present} présents / {item.absent} absents / {item.pending} en attente
            </p>
          </div>
        ))
      )}
      <ShowMoreButton count={rows.length} onClick={() => onShowMore(rows)} />
    </div>
  );
}

function TeacherLoadCard({
  title,
  rows,
  onShowMore,
}: {
  title: string;
  rows: Array<{ teacherId: number; name: string; classes: number; classNames: string }>;
  onShowMore: (rows: Array<{ teacherId: number; name: string; classes: number; classNames: string }>) => void;
}) {
  return (
    <div className="surface-card space-y-3">
      <CardTitleWithTotal title={title} total={rows.length} />
      {rows.length === 0 ? (
        <p className="empty-note">Aucune donnée disponible.</p>
      ) : (
        rows.slice(0, 3).map((item) => (
          <div key={item.teacherId} className="rounded-2xl border px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-800">{item.name}</span>
              <span className="status-chip status-chip--muted">{item.classes} classe(s)</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">{item.classNames || 'Aucune classe affectée'}</p>
          </div>
        ))
      )}
      <ShowMoreButton count={rows.length} onClick={() => onShowMore(rows)} />
    </div>
  );
}

function ShowMoreButton({ count, onClick }: { count: number; onClick: () => void }) {
  if (count <= 3) return null;
  return (
    <button className="btn-outline w-full justify-center text-xs" type="button" onClick={onClick}>
      Voir plus ({count - 3})
    </button>
  );
}

function CardTitleWithTotal({ title, total }: { title: string; total: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="panel-title">{title}</h2>
      <span className="status-chip status-chip--muted">{total}</span>
    </div>
  );
}
