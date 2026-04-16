'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type UIEvent,
} from 'react';
import {
  BookOpen,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Download,
  GraduationCap,
  Search,
  Users,
} from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, fetchRef, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type AcademicClass = {
  id: number;
  name: string;
  year: number;
  classType?: string | null;
  cycleId?: number | null;
  optionId?: number | null;
  filiereId?: number | null;
  createdAt: string;
  updatedAt: string;
  filiere?: {
    id?: number;
    name: string;
    department?: { id: number; name: string };
  } | null;
  academicOption?: { id: number; name: string } | null;
  cycle?: { id: number; name: string; code?: string | null } | null;
  _count: { students: number; teachers: number; cours: number };
};

type Filiere = { id: number; name: string; departmentId?: number };
type Department = { id: number; name: string };
type AcademicOption = { id: number; name: string; filiereId: number };
type Cycle = { id: number; name: string; code?: string | null };
type Student = {
  id: number;
  fullName: string;
  codeMassar: string;
  anneeAcademique?: string;
  firstYearEntry?: number;
  filiere?: { id: number; name: string } | null;
};
type GradeRow = {
  id: number;
  subject: string;
  semester?: string | null;
  assessmentType?: string | null;
  score: number;
  maxScore: number;
  academicYear: string;
  comment?: string | null;
  createdAt: string;
  student: { id: number; fullName: string; codeMassar: string };
  teacher?: { id: number; firstName: string; lastName: string } | null;
  module?: { id: number; name: string; semestre?: string | null } | null;
  elementModule?: { id: number; name: string; type: string } | null;
};
type PageMeta = PaginatedResponse<unknown>['meta'];
type RosterState = {
  data: Student[];
  meta: PageMeta;
  loading: boolean;
  error: string | null;
};
type StudentGradesState = {
  data: GradeRow[];
  meta: PageMeta;
  loading: boolean;
  error: string | null;
};

const CLASS_PAGE_SIZE = 50;
const ROSTER_PAGE_SIZE = 50;
const GRADE_PAGE_SIZE = 50;
const CURRENT_YEAR = new Date().getFullYear();

const initialMeta = (limit: number): PageMeta => ({
  page: 0,
  limit,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
});

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: Array<Array<unknown>>) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ClassesPage() {
  return <ClassesPageInner />;
}

function ClassesPageInner() {
  const [rows, setRows] = useState<AcademicClass[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [options, setOptions] = useState<AcademicOption[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);

  const [name, setName] = useState('');
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [classType, setClassType] = useState('');
  const [cycleId, setCycleId] = useState('');
  const [optionId, setOptionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [filiereId, setFiliereId] = useState('');

  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [filterFiliereId, setFilterFiliereId] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'name' | 'year' | 'updatedAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PageMeta>(initialMeta(CLASS_PAGE_SIZE));
  const [refreshKey, setRefreshKey] = useState(0);

  const [transferClass, setTransferClass] = useState<AcademicClass | null>(null);
  const [targetYear, setTargetYear] = useState('');
  const [transferring, setTransferring] = useState(false);

  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [rosters, setRosters] = useState<Record<number, RosterState>>({});
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);
  const [studentGrades, setStudentGrades] = useState<Record<string, StudentGradesState>>({});
  const [exportingClassId, setExportingClassId] = useState<number | null>(null);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const gradePanelKey = useCallback(
    (classId: number, studentId: number) => `${classId}:${studentId}`,
    [],
  );

  const totalStudents = useMemo(
    () => rows.reduce((sum, item) => sum + item._count.students, 0),
    [rows],
  );
  const totalTeachers = useMemo(
    () => rows.reduce((sum, item) => sum + item._count.teachers, 0),
    [rows],
  );
  const filieresByDepartment = useMemo(
    () =>
      departmentId
        ? filieres.filter(
            (filiere) => String(filiere.departmentId ?? '') === departmentId,
          )
        : filieres,
    [departmentId, filieres],
  );
  const optionsByFiliere = useMemo(
    () =>
      filiereId
        ? options.filter((option) => String(option.filiereId) === filiereId)
        : [],
    [filiereId, options],
  );
  const filterFilieresByDepartment = useMemo(
    () =>
      filterDepartmentId
        ? filieres.filter(
            (filiere) =>
              String(filiere.departmentId ?? '') === filterDepartmentId,
          )
        : filieres,
    [filterDepartmentId, filieres],
  );
  const availableYears = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => row.year))).sort((a, b) => b - a),
    [rows],
  );

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setYear(String(CURRENT_YEAR));
    setClassType('');
    setCycleId('');
    setOptionId('');
    setDepartmentId('');
    setFiliereId('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const resetClassList = useCallback(() => {
    setRows([]);
    setMeta(initialMeta(CLASS_PAGE_SIZE));
    setPage(1);
    setExpandedClassId(null);
    setExpandedStudentId(null);
  }, []);

  useEffect(() => {
    const loadRef = async () => {
      try {
        const [filieresData, depsData, optsData, cyclesData] = await Promise.all([
          fetchRef<PaginatedResponse<Filiere>>(
            '/filieres?page=1&limit=100&sortBy=name&sortOrder=asc',
          ),
          fetchRef<PaginatedResponse<Department>>(
            '/departments?page=1&limit=100&sortBy=name&sortOrder=asc',
          ),
          fetchRef<PaginatedResponse<AcademicOption>>(
            '/options?page=1&limit=200&sortBy=name&sortOrder=asc',
          ),
          fetchRef<Cycle[]>('/cycles'),
        ]);
        setFilieres(filieresData.data);
        setDepartments(depsData.data);
        setOptions(optsData.data);
        setCycles(Array.isArray(cyclesData) ? cyclesData : []);
      } catch {
        // Reference dropdowns are helpful but not required to render the class list.
      }
    };
    void loadRef();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const classesRes = await api.get<PaginatedResponse<AcademicClass>>(
          '/classes',
          {
            params: {
              page,
              limit: CLASS_PAGE_SIZE,
              search: query || undefined,
              departmentId: filterDepartmentId || undefined,
              filiereId: filterFiliereId || undefined,
              year: filterYear || undefined,
              sortBy,
              sortOrder,
            },
          },
        );

        setRows((current) => {
          if (page === 1) return classesRes.data.data;
          const seen = new Set(current.map((item) => item.id));
          return [
            ...current,
            ...classesRes.data.data.filter((item) => !seen.has(item.id)),
          ];
        });
        setMeta(classesRes.data.meta);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Impossible de charger les classes.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [
    filterDepartmentId,
    filterFiliereId,
    filterYear,
    page,
    query,
    refreshKey,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && !loading && meta.hasNextPage) {
          setPage((current) => current + 1);
        }
      },
      { rootMargin: '260px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loading, meta.hasNextPage]);

  useEffect(() => {
    if (!departmentId) return;
    const valid = filieres.some(
      (filiere) =>
        String(filiere.id) === filiereId &&
        String(filiere.departmentId ?? '') === departmentId,
    );
    if (!valid) setFiliereId('');
  }, [departmentId, filiereId, filieres]);

  useEffect(() => {
    if (!filterDepartmentId) return;
    const valid = filieres.some(
      (filiere) =>
        String(filiere.id) === filterFiliereId &&
        String(filiere.departmentId ?? '') === filterDepartmentId,
    );
    if (!valid) setFilterFiliereId('');
  }, [filterDepartmentId, filterFiliereId, filieres]);

  useEffect(() => {
    setOptionId('');
  }, [filiereId]);

  const loadRosterPage = useCallback(
    async (classId: number, nextPage: number) => {
      const current = rosters[classId];
      if (current?.loading) return;

      setRosters((state) => ({
        ...state,
        [classId]: {
          data: nextPage === 1 ? [] : (state[classId]?.data ?? []),
          meta: state[classId]?.meta ?? initialMeta(ROSTER_PAGE_SIZE),
          loading: true,
          error: null,
        },
      }));

      try {
        const response = await api.get<PaginatedResponse<Student> | Student[]>(
          `/students/by-class/${classId}`,
          { params: { page: nextPage, limit: ROSTER_PAGE_SIZE } },
        );
        const responseRows = Array.isArray(response.data)
          ? response.data
          : response.data.data;
        const responseMeta = Array.isArray(response.data)
          ? {
              page: nextPage,
              limit: ROSTER_PAGE_SIZE,
              total: responseRows.length,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: nextPage > 1,
            }
          : response.data.meta;

        setRosters((state) => {
          const existing = nextPage === 1 ? [] : (state[classId]?.data ?? []);
          const seen = new Set(existing.map((student) => student.id));
          const fresh = responseRows.filter((student) => !seen.has(student.id));
          return {
            ...state,
            [classId]: {
              data: [...existing, ...fresh],
              meta: responseMeta,
              loading: false,
              error: null,
            },
          };
        });
      } catch (err) {
        setRosters((state) => ({
          ...state,
          [classId]: {
            data: state[classId]?.data ?? [],
            meta: state[classId]?.meta ?? initialMeta(ROSTER_PAGE_SIZE),
            loading: false,
            error: getApiErrorMessage(
              err,
              'Impossible de charger les étudiants de cette classe.',
            ),
          },
        }));
      }
    },
    [rosters],
  );

  const loadStudentGradePage = useCallback(
    async (classId: number, studentId: number, nextPage: number) => {
      const key = gradePanelKey(classId, studentId);
      const current = studentGrades[key];
      if (current?.loading) return;

      setStudentGrades((state) => ({
        ...state,
        [key]: {
          data: nextPage === 1 ? [] : (state[key]?.data ?? []),
          meta: state[key]?.meta ?? initialMeta(GRADE_PAGE_SIZE),
          loading: true,
          error: null,
        },
      }));

      try {
        const response = await api.get<PaginatedResponse<GradeRow> | GradeRow[]>(
          '/grades',
          {
          params: {
            page: nextPage,
            limit: GRADE_PAGE_SIZE,
            studentId,
            classId,
          },
        });
        const responseRows = Array.isArray(response.data)
          ? response.data
          : response.data.data;
        const responseMeta = Array.isArray(response.data)
          ? {
              page: nextPage,
              limit: GRADE_PAGE_SIZE,
              total: responseRows.length,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: nextPage > 1,
            }
          : response.data.meta;
        setStudentGrades((state) => {
          const existing = nextPage === 1 ? [] : (state[key]?.data ?? []);
          const seen = new Set(existing.map((grade) => grade.id));
          const fresh = responseRows.filter((grade) => !seen.has(grade.id));
          return {
            ...state,
            [key]: {
              data: [...existing, ...fresh],
              meta: responseMeta,
              loading: false,
              error: null,
            },
          };
        });
      } catch (err) {
        setStudentGrades((state) => ({
          ...state,
          [key]: {
            data: state[key]?.data ?? [],
            meta: state[key]?.meta ?? initialMeta(GRADE_PAGE_SIZE),
            loading: false,
            error: getApiErrorMessage(err, 'Impossible de charger les notes.'),
          },
        }));
      }
    },
    [gradePanelKey, studentGrades],
  );

  const toggleClassRoster = (classId: number) => {
    setExpandedStudentId(null);
    setExpandedClassId((current) => {
      const next = current === classId ? null : classId;
      if (next && !rosters[classId]) {
        void loadRosterPage(classId, 1);
      }
      return next;
    });
  };

  const toggleStudentGrades = (classId: number, studentId: number) => {
    const key = gradePanelKey(classId, studentId);
    setExpandedStudentId((current) => {
      const next = current === studentId ? null : studentId;
      if (next && !studentGrades[key]) {
        void loadStudentGradePage(classId, studentId, 1);
      }
      return next;
    });
  };

  const handleRosterScroll = (
    classId: number,
    event: UIEvent<HTMLDivElement>,
  ) => {
    const roster = rosters[classId];
    if (!roster || roster.loading || !roster.meta.hasNextPage) return;
    const target = event.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 160) {
      void loadRosterPage(classId, roster.meta.page + 1);
    }
  };

  const handleStudentGradesScroll = (
    classId: number,
    studentId: number,
    event: UIEvent<HTMLDivElement>,
  ) => {
    const key = gradePanelKey(classId, studentId);
    const grades = studentGrades[key];
    if (!grades || grades.loading || !grades.meta.hasNextPage) return;
    const target = event.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 120) {
      void loadStudentGradePage(classId, studentId, grades.meta.page + 1);
    }
  };

  const exportClassGrades = async (item: AcademicClass) => {
    try {
      setExportingClassId(item.id);
      const allGrades: GradeRow[] = [];
      let nextPage = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await api.get<PaginatedResponse<GradeRow>>('/grades', {
          params: {
            classId: item.id,
            page: nextPage,
            limit: GRADE_PAGE_SIZE,
          },
        });
        allGrades.push(...response.data.data);
        hasNextPage = response.data.meta.hasNextPage;
        nextPage += 1;
      }

      if (allGrades.length === 0) {
        toast.info('Aucune note à exporter pour cette classe.');
        return;
      }

      downloadCsv(`notes-${item.name}-${item.year}.csv`, [
        [
          'Classe',
          'Année classe',
          'Étudiant',
          'Code Massar',
          'Module',
          'Élément',
          'Épreuve',
          'Semestre',
          'Note',
          'Barème',
          'Année académique',
          'Enseignant',
          'Commentaire',
        ],
        ...allGrades.map((grade) => [
          item.name,
          item.year,
          grade.student.fullName,
          grade.student.codeMassar,
          grade.module?.name ?? '',
          grade.elementModule?.name ?? grade.subject,
          grade.assessmentType ?? '',
          grade.semester ?? '',
          grade.score,
          grade.maxScore,
          grade.academicYear,
          grade.teacher
            ? `${grade.teacher.firstName} ${grade.teacher.lastName}`
            : '',
          grade.comment ?? '',
        ]),
      ]);

      toast.success(`${allGrades.length} note(s) exportée(s).`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'export des notes."));
    } finally {
      setExportingClassId(null);
    }
  };

  const onSubmit = async () => {
    if (!name.trim()) return;
    if (!year || Number.isNaN(Number(year))) {
      toast.error("L'année est requise");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        year: Number(year),
        classType: classType.trim() || null,
        cycleId: cycleId ? Number(cycleId) : null,
        optionId: optionId ? Number(optionId) : null,
        filiereId: filiereId ? Number(filiereId) : null,
      };
      if (editingId) {
        await api.patch(`/classes/${editingId}`, payload);
        toast.success('Classe mise à jour avec succès');
      } else {
        await api.post('/classes', payload);
        toast.success('Classe créée avec succès');
      }
      closeModal();
      resetClassList();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Échec de l'enregistrement de la classe"),
      );
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette classe ?')) return;
    try {
      await api.delete(`/classes/${id}`);
      toast.success('Classe supprimée avec succès');
      if (editingId === id) closeModal();
      resetClassList();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la suppression de la classe'));
    }
  };

  const openTransferModal = (item: AcademicClass) => {
    setTransferClass(item);
    setTargetYear(String(item.year + 1));
  };

  const closeTransferModal = () => {
    setTransferClass(null);
    setTargetYear('');
  };

  const onTransfer = async () => {
    if (!transferClass) return;
    const target = Number(targetYear);
    if (!targetYear || Number.isNaN(target) || target < 1 || target > 2100) {
      toast.error('Année cible invalide');
      return;
    }
    setTransferring(true);
    try {
      await api.post(`/classes/${transferClass.id}/transfer`, {
        targetYear: target,
      });
      toast.success(`Classe transférée vers ${target} avec succès`);
      closeTransferModal();
      resetClassList();
      setRefreshKey((value) => value + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec du transfert de la classe'));
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cohortes"
        title="Administration des classes"
        description="Gérez les classes par année académique. Ouvrez une classe pour consulter son roster, les notes des étudiants, et exporter les notes sans charger tout le registre d’un coup."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Total des classes"
          value={meta.total}
          hint="Registre actuel"
          icon={CalendarRange}
        />
        <MetricCard
          label="Étudiants chargés"
          value={totalStudents}
          hint="Classes chargées à l’écran"
          icon={GraduationCap}
        />
        <MetricCard
          label="Enseignants visibles"
          value={totalTeachers}
          hint="Classes chargées à l’écran"
          icon={Users}
        />
        <MetricCard
          label="Filières disponibles"
          value={filieres.length}
          hint="Programmes avec classes"
          icon={BookOpen}
        />
      </section>

      <section className="flex justify-end gap-2">
        <ImportDataButton onSuccess={() => setRefreshKey((key) => key + 1)} />
        <ExportDataButton />
        <button className="btn-primary" type="button" onClick={openCreateModal}>
          Ajouter une classe
        </button>
      </section>

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Registre des classes</h2>
            <p className="panel-copy">
              Les classes sont chargées par pages de 50. Défilez vers le bas pour
              charger la page suivante.
            </p>
          </div>
        </div>

        <div className="toolbar-shell">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="input pl-10"
                  placeholder="Rechercher par nom de classe ou type..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      resetClassList();
                      setQuery(search.trim());
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="btn-outline"
                  type="button"
                  onClick={() => {
                    resetClassList();
                    setQuery(search.trim());
                  }}
                >
                  Appliquer
                </button>
                <button
                  className="btn-outline"
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setQuery('');
                    setFilterDepartmentId('');
                    setFilterFiliereId('');
                    setFilterYear('');
                    setSortBy('name');
                    setSortOrder('asc');
                    resetClassList();
                  }}
                >
                  Réinitialiser
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <select
                className="input xl:max-w-48"
                value={filterYear}
                onChange={(event) => {
                  setFilterYear(event.target.value);
                  resetClassList();
                }}
              >
                <option value="">Toutes les années</option>
                {availableYears.map((availableYear) => (
                  <option key={availableYear} value={availableYear}>
                    {availableYear}
                  </option>
                ))}
              </select>
              <select
                className="input xl:max-w-56"
                value={filterDepartmentId}
                onChange={(event) => {
                  setFilterDepartmentId(event.target.value);
                  resetClassList();
                }}
              >
                <option value="">Tous les départements ({departments.length})</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              <select
                className="input xl:max-w-56"
                value={filterFiliereId}
                onChange={(event) => {
                  setFilterFiliereId(event.target.value);
                  resetClassList();
                }}
              >
                <option value="">
                  Toutes les filières ({filterFilieresByDepartment.length})
                </option>
                {filterFilieresByDepartment.map((filiere) => (
                  <option key={filiere.id} value={filiere.id}>
                    {filiere.name}
                  </option>
                ))}
              </select>
              <select
                className="input xl:max-w-52"
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value as 'name' | 'year' | 'updatedAt');
                  resetClassList();
                }}
              >
                <option value="name">Trier par nom</option>
                <option value="year">Trier par année</option>
                <option value="updatedAt">Trier par date de mise à jour</option>
              </select>
              <select
                className="input xl:max-w-44"
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value as 'asc' | 'desc');
                  resetClassList();
                }}
              >
                <option value="asc">Croissant</option>
                <option value="desc">Décroissant</option>
              </select>
            </div>
          </div>
        </div>

        <ClassesTable
          rows={rows}
          loading={loading}
          error={error}
          meta={meta}
          loadMoreRef={loadMoreRef}
          expandedClassId={expandedClassId}
          rosters={rosters}
          expandedStudentId={expandedStudentId}
          studentGrades={studentGrades}
          exportingClassId={exportingClassId}
          onToggleClass={toggleClassRoster}
          onExportClass={exportClassGrades}
          onEditClass={(item) => {
            setEditingId(item.id);
            setName(item.name);
            setYear(String(item.year));
            setClassType(item.classType ?? '');
            setCycleId(String(item.cycleId ?? ''));
            setOptionId(String(item.optionId ?? ''));
            setDepartmentId(String(item.filiere?.department?.id ?? ''));
            setFiliereId(String(item.filiereId ?? ''));
            setIsModalOpen(true);
          }}
          onTransferClass={openTransferModal}
          onDeleteClass={onDelete}
          onRosterScroll={handleRosterScroll}
          onToggleStudent={toggleStudentGrades}
          onGradesScroll={handleStudentGradesScroll}
        />
      </section>

      <ClassFormModal
        open={isModalOpen}
        editing={!!editingId}
        saving={saving}
        name={name}
        year={year}
        classType={classType}
        cycleId={cycleId}
        departmentId={departmentId}
        filiereId={filiereId}
        optionId={optionId}
        cycles={cycles}
        departments={departments}
        filieres={filieresByDepartment}
        options={optionsByFiliere}
        onClose={closeModal}
        onSubmit={onSubmit}
        onNameChange={setName}
        onYearChange={setYear}
        onClassTypeChange={setClassType}
        onCycleChange={setCycleId}
        onDepartmentChange={setDepartmentId}
        onFiliereChange={setFiliereId}
        onOptionChange={setOptionId}
      />

      <TransferModal
        transferClass={transferClass}
        targetYear={targetYear}
        transferring={transferring}
        onTargetYearChange={setTargetYear}
        onClose={closeTransferModal}
        onTransfer={onTransfer}
      />
    </div>
  );
}

type ClassesTableProps = {
  rows: AcademicClass[];
  loading: boolean;
  error: string | null;
  meta: PageMeta;
  loadMoreRef: RefObject<HTMLDivElement | null>;
  expandedClassId: number | null;
  rosters: Record<number, RosterState>;
  expandedStudentId: number | null;
  studentGrades: Record<string, StudentGradesState>;
  exportingClassId: number | null;
  onToggleClass: (classId: number) => void;
  onExportClass: (item: AcademicClass) => Promise<void>;
  onEditClass: (item: AcademicClass) => void;
  onTransferClass: (item: AcademicClass) => void;
  onDeleteClass: (id: number) => Promise<void>;
  onRosterScroll: (classId: number, event: UIEvent<HTMLDivElement>) => void;
  onToggleStudent: (classId: number, studentId: number) => void;
  onGradesScroll: (
    classId: number,
    studentId: number,
    event: UIEvent<HTMLDivElement>,
  ) => void;
};

function ClassesTable({
  rows,
  loading,
  error,
  meta,
  loadMoreRef,
  expandedClassId,
  rosters,
  expandedStudentId,
  studentGrades,
  exportingClassId,
  onToggleClass,
  onExportClass,
  onEditClass,
  onTransferClass,
  onDeleteClass,
  onRosterScroll,
  onToggleStudent,
  onGradesScroll,
}: ClassesTableProps) {
  if (loading && rows.length === 0) {
    return <div className="empty-note">Chargement des classes...</div>;
  }

  if (error) {
    return <div className="empty-note">{error}</div>;
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Aucune classe ne correspond"
        description="Ajustez vos filtres ou créez une classe."
      />
    );
  }

  return (
    <>
      <div className="data-table-wrap">
        <div className="table-scroll">
          <table className="table-base">
            <thead>
              <tr>
                <th>Classe</th>
                <th>Année</th>
                <th>Filière</th>
                <th>Département</th>
                <th>Étudiants</th>
                <th>Enseignants</th>
                <th>Cours</th>
                <th>État</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <ClassTableRows
                  key={item.id}
                  item={item}
                  expanded={expandedClassId === item.id}
                  roster={rosters[item.id]}
                  expandedStudentId={expandedStudentId}
                  studentGrades={studentGrades}
                  exporting={exportingClassId === item.id}
                  onToggleClass={onToggleClass}
                  onExportClass={onExportClass}
                  onEditClass={onEditClass}
                  onTransferClass={onTransferClass}
                  onDeleteClass={onDeleteClass}
                  onRosterScroll={onRosterScroll}
                  onToggleStudent={onToggleStudent}
                  onGradesScroll={onGradesScroll}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div ref={loadMoreRef} className="py-4 text-center text-sm text-slate-500">
        {loading
          ? 'Chargement de la page suivante...'
          : meta.hasNextPage
            ? 'Défilez pour charger plus de classes'
            : `${rows.length} classe(s) chargée(s) sur ${meta.total}`}
      </div>
    </>
  );
}

type ClassTableRowsProps = {
  item: AcademicClass;
  expanded: boolean;
  roster?: RosterState;
  expandedStudentId: number | null;
  studentGrades: Record<string, StudentGradesState>;
  exporting: boolean;
  onToggleClass: (classId: number) => void;
  onExportClass: (item: AcademicClass) => Promise<void>;
  onEditClass: (item: AcademicClass) => void;
  onTransferClass: (item: AcademicClass) => void;
  onDeleteClass: (id: number) => Promise<void>;
  onRosterScroll: (classId: number, event: UIEvent<HTMLDivElement>) => void;
  onToggleStudent: (classId: number, studentId: number) => void;
  onGradesScroll: (
    classId: number,
    studentId: number,
    event: UIEvent<HTMLDivElement>,
  ) => void;
};

function ClassTableRows({
  item,
  expanded,
  roster,
  expandedStudentId,
  studentGrades,
  exporting,
  onToggleClass,
  onExportClass,
  onEditClass,
  onTransferClass,
  onDeleteClass,
  onRosterScroll,
  onToggleStudent,
  onGradesScroll,
}: ClassTableRowsProps) {
  return (
    <>
      <tr>
        <td>
          <button
            className="flex items-start gap-2 text-left"
            type="button"
            onClick={() => onToggleClass(item.id)}
          >
            {expanded ? (
              <ChevronDown className="mt-1 shrink-0 text-slate-500" size={16} />
            ) : (
              <ChevronRight className="mt-1 shrink-0 text-slate-500" size={16} />
            )}
            <span>
              <span className="block font-medium text-slate-950">{item.name}</span>
              <span className="block text-xs uppercase tracking-[0.16em] text-slate-500">
                {[item.classType, item.cycle?.name, item.academicOption?.name]
                  .filter(Boolean)
                  .join(' • ') || '—'}
              </span>
            </span>
          </button>
        </td>
        <td>
          <span className="status-chip status-chip--ok">{item.year}</span>
        </td>
        <td>{item.filiere?.name ?? 'Non assignée'}</td>
        <td>{item.filiere?.department?.name ?? '-'}</td>
        <td>{item._count.students}</td>
        <td>{item._count.teachers}</td>
        <td>
          <span
            className={`status-chip ${
              item._count.cours > 0 ? 'status-chip--ok' : 'status-chip--warn'
            }`}
          >
            {item._count.cours}
          </span>
        </td>
        <td>
          <span
            className={`status-chip ${
              item.filiere ? 'status-chip--ok' : 'status-chip--warn'
            }`}
          >
            {item.filiere ? 'Assignée' : 'Sans filière'}
          </span>
        </td>
        <td>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-outline"
              onClick={() => void onExportClass(item)}
              disabled={exporting}
            >
              <Download size={14} />
              {exporting ? 'Export...' : 'Notes CSV'}
            </button>
            <button type="button" className="btn-outline" onClick={() => onEditClass(item)}>
              Modifier
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => onTransferClass(item)}
            >
              Transférer
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={() => void onDeleteClass(item.id)}
            >
              Supprimer
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={9}>
            <ClassRosterPanel
              classId={item.id}
              roster={roster}
              expandedStudentId={expandedStudentId}
              studentGrades={studentGrades}
              onScroll={onRosterScroll}
              onToggleStudent={onToggleStudent}
              onGradesScroll={onGradesScroll}
            />
          </td>
        </tr>
      )}
    </>
  );
}

type ClassRosterPanelProps = {
  classId: number;
  roster?: RosterState;
  expandedStudentId: number | null;
  studentGrades: Record<string, StudentGradesState>;
  onScroll: (classId: number, event: UIEvent<HTMLDivElement>) => void;
  onToggleStudent: (classId: number, studentId: number) => void;
  onGradesScroll: (
    classId: number,
    studentId: number,
    event: UIEvent<HTMLDivElement>,
  ) => void;
};

function ClassRosterPanel({
  classId,
  roster,
  expandedStudentId,
  studentGrades,
  onScroll,
  onToggleStudent,
  onGradesScroll,
}: ClassRosterPanelProps) {
  if (!roster || (roster.loading && roster.data.length === 0)) {
    return <div className="empty-note">Chargement des étudiants...</div>;
  }

  if (roster.error) {
    return <div className="empty-note">{roster.error}</div>;
  }

  if (roster.data.length === 0) {
    return (
      <EmptyState
        title="Aucun étudiant dans cette classe"
        description="Le roster apparaîtra ici dès que des étudiants seront affectés."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">Roster de la classe</p>
          <p className="text-xs text-slate-500">
            {roster.data.length} étudiant(s) chargé(s) sur {roster.meta.total}
          </p>
        </div>
        {roster.loading && (
          <span className="text-xs text-slate-500">Chargement...</span>
        )}
      </div>

      <div
        className="max-h-[460px] space-y-2 overflow-y-auto pr-1"
        onScroll={(event) => onScroll(classId, event)}
      >
        {roster.data.map((student) => {
          const gradeKey = `${classId}:${student.id}`;
          const grades = studentGrades[gradeKey];
          const expanded = expandedStudentId === student.id;
          return (
            <div
              key={student.id}
              className="rounded-2xl border border-slate-200 bg-white p-3"
            >
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                type="button"
                onClick={() => onToggleStudent(classId, student.id)}
              >
                <span className="flex items-center gap-2">
                  {expanded ? (
                    <ChevronDown size={15} className="text-slate-500" />
                  ) : (
                    <ChevronRight size={15} className="text-slate-500" />
                  )}
                  <span>
                    <span className="block font-medium text-slate-950">
                      {student.fullName}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {student.codeMassar}
                      {student.anneeAcademique
                        ? ` · ${student.anneeAcademique}`
                        : ''}
                    </span>
                  </span>
                </span>
                <span className="status-chip">Notes</span>
              </button>

              {expanded && (
                <StudentGradePanel
                  classId={classId}
                  studentId={student.id}
                  grades={grades}
                  onScroll={onGradesScroll}
                />
              )}
            </div>
          );
        })}
        <div className="py-3 text-center text-xs text-slate-500">
          {roster.loading
            ? 'Chargement de la suite...'
            : roster.meta.hasNextPage
              ? 'Défilez pour charger plus d’étudiants'
              : 'Tous les étudiants de cette classe sont chargés'}
        </div>
      </div>
    </div>
  );
}

type StudentGradePanelProps = {
  classId: number;
  studentId: number;
  grades?: StudentGradesState;
  onScroll: (
    classId: number,
    studentId: number,
    event: UIEvent<HTMLDivElement>,
  ) => void;
};

function StudentGradePanel({
  classId,
  studentId,
  grades,
  onScroll,
}: StudentGradePanelProps) {
  if (!grades || (grades.loading && grades.data.length === 0)) {
    return <div className="mt-3 empty-note">Chargement des notes...</div>;
  }

  if (grades.error) {
    return <div className="mt-3 empty-note">{grades.error}</div>;
  }

  if (grades.data.length === 0) {
    return (
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
        Aucune note enregistrée pour cet étudiant.
      </div>
    );
  }

  return (
    <div
      className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-slate-200"
      onScroll={(event) => onScroll(classId, studentId, event)}
    >
      <table className="table-base">
        <thead>
          <tr>
            <th>Épreuve</th>
            <th>Module</th>
            <th>Note</th>
            <th>Année</th>
          </tr>
        </thead>
        <tbody>
          {grades.data.map((grade) => (
            <tr key={grade.id}>
              <td>
                <div className="font-medium text-slate-900">
                  {grade.assessmentType ?? grade.subject}
                </div>
                <div className="text-xs text-slate-500">
                  {grade.semester ?? 'Semestre non renseigné'}
                </div>
              </td>
              <td>
                <div>{grade.module?.name ?? '—'}</div>
                <div className="text-xs text-slate-500">
                  {grade.elementModule?.name ?? grade.subject}
                </div>
              </td>
              <td className="font-semibold text-slate-950">
                {grade.score}/{grade.maxScore}
              </td>
              <td>{grade.academicYear}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="py-3 text-center text-xs text-slate-500">
        {grades.loading
          ? 'Chargement de la suite...'
          : grades.meta.hasNextPage
            ? 'Défilez pour charger plus de notes'
            : 'Toutes les notes sont chargées'}
      </div>
    </div>
  );
}

type ClassFormModalProps = {
  open: boolean;
  editing: boolean;
  saving: boolean;
  name: string;
  year: string;
  classType: string;
  cycleId: string;
  departmentId: string;
  filiereId: string;
  optionId: string;
  cycles: Cycle[];
  departments: Department[];
  filieres: Filiere[];
  options: AcademicOption[];
  onClose: () => void;
  onSubmit: () => Promise<void>;
  onNameChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onClassTypeChange: (value: string) => void;
  onCycleChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onFiliereChange: (value: string) => void;
  onOptionChange: (value: string) => void;
};

function ClassFormModal({
  open,
  editing,
  saving,
  name,
  year,
  classType,
  cycleId,
  departmentId,
  filiereId,
  optionId,
  cycles,
  departments,
  filieres,
  options,
  onClose,
  onSubmit,
  onNameChange,
  onYearChange,
  onClassTypeChange,
  onCycleChange,
  onDepartmentChange,
  onFiliereChange,
  onOptionChange,
}: ClassFormModalProps) {
  return (
    <ModalShell
      open={open}
      title={editing ? 'Modifier la classe' : 'Ajouter une classe'}
      description="Chaque classe est identifiée par son nom et son année académique."
      onClose={onClose}
      footer={
        <>
          <button
            className="btn-primary"
            type="button"
            onClick={() => void onSubmit()}
            disabled={saving}
          >
            {editing ? 'Enregistrer les modifications' : 'Créer une classe'}
          </button>
          <button className="btn-outline" type="button" onClick={onClose}>
            Annuler
          </button>
        </>
      }
    >
      <div className="form-grid md:grid-cols-1 xl:grid-cols-1">
        <div className="field-stack">
          <label className="field-label">
            Nom de la classe <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="ex. GI-1, APESA-2"
          />
        </div>
        <div className="field-stack">
          <label className="field-label">
            Année académique <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            type="number"
            min={1900}
            max={2100}
            value={year}
            onChange={(event) => onYearChange(event.target.value)}
            placeholder="ex. 2026"
          />
        </div>
        <div className="field-stack">
          <label className="field-label">Type de classe</label>
          <input
            className="input"
            value={classType}
            onChange={(event) => onClassTypeChange(event.target.value)}
            placeholder="prépa / ingénieur"
          />
        </div>
        <div className="field-stack">
          <label className="field-label">Cycle</label>
          <select
            className="input"
            value={cycleId}
            onChange={(event) => onCycleChange(event.target.value)}
          >
            <option value="">— Aucun cycle —</option>
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
                {cycle.code ? ` (${cycle.code})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field-stack">
          <label className="field-label">Département</label>
          <select
            className="input"
            value={departmentId}
            onChange={(event) => onDepartmentChange(event.target.value)}
          >
            <option value="">Tous les départements</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-stack">
          <label className="field-label">Filière</label>
          <select
            className="input"
            value={filiereId}
            onChange={(event) => onFiliereChange(event.target.value)}
          >
            <option value="">Non assignée</option>
            {filieres.map((filiere) => (
              <option key={filiere.id} value={filiere.id}>
                {filiere.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field-stack">
          <label className="field-label">Option</label>
          <select
            className="input"
            value={optionId}
            onChange={(event) => onOptionChange(event.target.value)}
            disabled={!filiereId}
          >
            <option value="">
              {filiereId
                ? 'Aucune option'
                : "Sélectionner une filière d'abord"}
            </option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </ModalShell>
  );
}

type TransferModalProps = {
  transferClass: AcademicClass | null;
  targetYear: string;
  transferring: boolean;
  onTargetYearChange: (value: string) => void;
  onClose: () => void;
  onTransfer: () => Promise<void>;
};

function TransferModal({
  transferClass,
  targetYear,
  transferring,
  onTargetYearChange,
  onClose,
  onTransfer,
}: TransferModalProps) {
  return (
    <ModalShell
      open={!!transferClass}
      title="Transférer la classe vers une nouvelle année"
      description={
        transferClass
          ? `Cloner « ${transferClass.name} (${transferClass.year}) » avec tous ses modules, éléments et affectations d'enseignants.`
          : ''
      }
      onClose={onClose}
      footer={
        <>
          <button
            className="btn-primary"
            type="button"
            onClick={() => void onTransfer()}
            disabled={transferring}
          >
            {transferring ? 'Transfert en cours...' : 'Confirmer le transfert'}
          </button>
          <button className="btn-outline" type="button" onClick={onClose}>
            Annuler
          </button>
        </>
      }
    >
      <div className="form-grid md:grid-cols-1 xl:grid-cols-1">
        <div className="field-stack">
          <label className="field-label">
            Année cible <span className="text-red-500">*</span>
          </label>
          <input
            className="input"
            type="number"
            min={1900}
            max={2100}
            value={targetYear}
            onChange={(event) => onTargetYearChange(event.target.value)}
            placeholder="ex. 2027"
          />
          <p className="mt-1 text-xs text-slate-500">
            Une nouvelle classe «{transferClass?.name} ({targetYear || '…'})»
            sera créée avec des copies indépendantes de tous les modules et
            éléments.
          </p>
        </div>
      </div>
    </ModalShell>
  );
}
