'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Lock,
  Send,
  Save,
  Upload,
} from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import {
  AcademicYearSelect,
  sortAcademicYearsCurrentFirst,
} from '@/components/academic/academic-year-select';
import { SemesterSelect } from '@/components/academic/semester-select';
import { MetricCard } from '@/components/admin/metric-card';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import {
  api,
  fetchRef,
  getApiErrorMessage,
  PaginatedResponse,
} from '@/services/api';
import { toast } from 'sonner';
import { StudentReleve } from '@/components/grades/student-releve';

// ─── Types ────────────────────────────────────────────────────────────────────

type AcademicYear = { id: number; label: string; isCurrent: boolean };
type PublicationStatus = 'draft' | 'published' | 'modified_after_publication';
type Department = { id: number; name: string };
type Filiere = { id: number; name: string; departmentId: number };
type AcademicOption = { id: number; name: string; filiereId: number };

type AcademicClass = {
  id: number;
  name: string;
  year: number;
  academicYear?: string | null;
  filiereId?: number | null;
  optionId?: number | null;
  filiere?: {
    id: number;
    name: string;
    department?: { id: number; name: string };
  } | null;
  academicOption?: { id: number; name: string } | null;
};

type ModuleRow = {
  id: number;
  name: string;
  semestre?: string | null;
  classes: Array<{
    class: { id: number; name: string; year: number };
  }>;
};

type ElementModule = {
  id: number;
  name: string;
  type: 'CM' | 'TD' | 'TP';
  volumeHoraire?: number | null;
  ponderation?: number | null;
  coefficient?: number | null;
};

type Student = {
  id: number;
  fullName: string;
  codeMassar: string;
  classId?: number | null;
};

type GradeRow = {
  id: number;
  score: number;
  comment?: string | null;
  publicationStatus?: PublicationStatus;
  publishedAt?: string | null;
  lockedAt?: string | null;
  student: { id: number };
};

type GradeInput = {
  id?: number;
  score: string;
  comment: string;
  publicationStatus?: PublicationStatus;
  lockedAt?: string | null;
};

type StudentGradeView = {
  id: number;
  score: number;
  maxScore: number;
  academicYear: string;
  semester?: string | null;
  comment?: string | null;
  publicationStatus?: PublicationStatus;
  publishedAt?: string | null;
  module?: { id: number; name: string; semestre?: string | null } | null;
  elementModule?: { id: number; name: string; type: 'CM' | 'TD' | 'TP' } | null;
  teacher?: { id: number; firstName: string; lastName: string } | null;
  academicClass?: { id: number; name: string; year: number } | null;
};

const publicationLabels: Record<PublicationStatus, string> = {
  draft: 'Brouillon',
  published: 'Publié',
  modified_after_publication: 'Modifié après publication',
};

function publicationChip(status?: PublicationStatus, lockedAt?: string | null) {
  const normalized = status ?? 'draft';
  const color =
    normalized === 'published'
      ? 'status-chip status-chip--ok'
      : normalized === 'modified_after_publication'
        ? 'status-chip status-chip--warning'
        : 'status-chip status-chip--muted';
  return (
    <span className={color}>
      {publicationLabels[normalized]}
      {lockedAt ? ' · verrouillé' : ''}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EpreuvesPage() {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const canEdit = !isStudent && user?.role !== 'viewer';
  const canManagePublication = user?.role === 'admin' || user?.role === 'inspector';
  const restrictedToOwnDepartments =
    user?.role === 'user' || user?.role === 'viewer';
  const [myGrades, setMyGrades] = useState<StudentGradeView[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string | null>(null);
  const [gradeHistory, setGradeHistory] = useState<Array<{ year: string; grades: StudentGradeView[] }>>([]);
  const [myStudent, setMyStudent] = useState<{
    id: number;
    fullName: string;
    codeMassar: string;
    codeEtudiant?: string | null;
    academicClass?: { id: number; name: string; year: number } | null;
  } | null>(null);

  // Reference data
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [options, setOptions] = useState<AcademicOption[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);

  // Academic path state
  const [departmentId, setDepartmentId] = useState('');
  const [filiereId, setFiliereId] = useState('');
  const [optionId, setOptionId] = useState('');
  const [classId, setClassId] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [elementModuleId, setElementModuleId] = useState('');

  // Loaded data
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [elementModules, setElementModules] = useState<ElementModule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [gradeInputs, setGradeInputs] = useState<Record<number, GradeInput>>({});
  const [importFile, setImportFile] = useState<File | null>(null);

  // Loading states
  const [loadingReference, setLoadingReference] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);
  const [publishingGrades, setPublishingGrades] = useState(false);
  const [unpublishingGrades, setUnpublishingGrades] = useState(false);
  const [reopeningGrades, setReopeningGrades] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [importingGrades, setImportingGrades] = useState(false);
  const [exportingReleve, setExportingReleve] = useState(false);

  // ─── Computed visibility ─────────────────────────────────────────────────

  const visibleDepartments = useMemo(() => {
    if (!restrictedToOwnDepartments) return departments;
    const allowed = new Set((user?.departments ?? []).map((d) => d.id));
    return departments.filter((d) => allowed.has(d.id));
  }, [departments, restrictedToOwnDepartments, user?.departments]);

  const visibleFilieres = useMemo(() => {
    const allowedDepts = new Set(visibleDepartments.map((d) => d.id));
    return filieres.filter((f) => {
      if (!allowedDepts.has(f.departmentId)) return false;
      if (departmentId && String(f.departmentId) !== departmentId) return false;
      return true;
    });
  }, [departmentId, filieres, visibleDepartments]);

  const visibleOptions = useMemo(() => {
    if (!filiereId) return [];
    return options.filter((o) => String(o.filiereId) === filiereId);
  }, [filiereId, options]);

  const visibleClasses = useMemo(() => {
    return classes.filter((c) => {
      const cDeptId = c.filiere?.department?.id;
      if (departmentId && String(cDeptId ?? '') !== departmentId) return false;
      if (filiereId && String(c.filiereId ?? '') !== filiereId) return false;
      if (optionId && String(c.optionId ?? '') !== optionId) return false;
      if (academicYear && c.academicYear && c.academicYear !== academicYear) return false;
      return true;
    });
  }, [academicYear, classes, departmentId, filiereId, optionId]);

  const selectedClass = useMemo(
    () => visibleClasses.find((c) => String(c.id) === classId) ?? null,
    [classId, visibleClasses],
  );

  // Semesters available from modules assigned to this class
  const availableSemesters = useMemo(() => {
    const values = modules.map((m) => m.semestre).filter((s): s is string => !!s);
    return [...new Set(values)].sort();
  }, [modules]);

  // Modules filtered by selected semester
  const filteredModules = useMemo(() => {
    if (!semester) return modules;
    return modules.filter((m) => !m.semestre || m.semestre === semester);
  }, [modules, semester]);

  const selectedModule = useMemo(
    () => filteredModules.find((m) => String(m.id) === moduleId) ?? null,
    [filteredModules, moduleId],
  );

  const selectedElementModule = useMemo(
    () => elementModules.find((e) => String(e.id) === elementModuleId) ?? null,
    [elementModuleId, elementModules],
  );

  const enteredGradesCount = useMemo(
    () => Object.values(gradeInputs).filter((g) => g.score.trim() !== '').length,
    [gradeInputs],
  );

  const publicationCounts = useMemo(() => {
    return Object.values(gradeInputs).reduce(
      (acc, item) => {
        const status = item.publicationStatus ?? 'draft';
        acc[status] += item.score.trim() ? 1 : 0;
        if (item.lockedAt) acc.locked += 1;
        return acc;
      },
      { draft: 0, published: 0, modified_after_publication: 0, locked: 0 },
    );
  }, [gradeInputs]);

  const notesLocked = publicationCounts.locked > 0;

  const simpleAverage = useMemo(
    () =>
      myGrades.length
        ? `${(myGrades.reduce((sum, item) => sum + (item.score / item.maxScore) * 20, 0) / myGrades.length).toFixed(2)}`
        : '-',
    [myGrades],
  );

  // ─── Load reference data ─────────────────────────────────────────────────

  useEffect(() => {
    if (isStudent) return;
    const load = async () => {
      try {
        setLoadingReference(true);
        const [yearsRes, depsRes, filRes, optRes, classRes] = await Promise.all([
          fetchRef<AcademicYear[]>('/academic-years'),
          fetchRef<PaginatedResponse<Department>>(
            '/departments?page=1&limit=200&sortBy=name&sortOrder=asc',
          ),
          fetchRef<PaginatedResponse<Filiere>>(
            '/filieres?page=1&limit=500&sortBy=name&sortOrder=asc',
          ),
          fetchRef<PaginatedResponse<AcademicOption>>(
            '/options?page=1&limit=500&sortBy=name&sortOrder=asc',
          ),
          fetchRef<PaginatedResponse<AcademicClass>>(
            '/classes?page=1&limit=500&sortBy=name&sortOrder=asc',
          ),
        ]);
        const years: AcademicYear[] = sortAcademicYearsCurrentFirst(Array.isArray(yearsRes) ? yearsRes : []);
        setAcademicYears(years);
        // Auto-select current year
        const current = years.find((y) => y.isCurrent) ?? years[0];
        if (current) setAcademicYear(current.label);
        setDepartments(depsRes.data);
        setFilieres(filRes.data);
        setOptions(optRes.data);
        setClasses(classRes.data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Impossible de charger les données de référence.'));
      } finally {
        setLoadingReference(false);
      }
    };
    void load();
  }, [isStudent]);

  useEffect(() => {
    setClassId('');
    setModuleId('');
    setElementModuleId('');
    setSemester('');
    setStudents([]);
    setModules([]);
    setElementModules([]);
    setGradeInputs({});
  }, [academicYear]);

  useEffect(() => {
    if (!isStudent) return;
    const loadMine = async () => {
      try {
        setLoadingReference(true);
        const res = await api.get<{
          student: typeof myStudent;
          currentAcademicYear: string | null;
          currentGrades: StudentGradeView[];
          historyByYear: Array<{ year: string; grades: StudentGradeView[] }>;
        }>('/grades/me');
        setMyStudent(res.data.student);
        setCurrentAcademicYear(res.data.currentAcademicYear);
        setMyGrades(res.data.currentGrades ?? []);
        setGradeHistory(res.data.historyByYear ?? []);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Impossible de charger vos notes.'));
      } finally {
        setLoadingReference(false);
      }
    };
    void loadMine();
  }, [isStudent]);

  // Auto-select single department
  useEffect(() => {
    if (restrictedToOwnDepartments && user?.departments?.length === 1 && !departmentId) {
      setDepartmentId(String(user.departments[0].id));
    }
  }, [departmentId, restrictedToOwnDepartments, user?.departments]);

  // Cascade: reset filière when dept changes
  useEffect(() => {
    const still = visibleFilieres.some((f) => String(f.id) === filiereId);
    if (!still) setFiliereId('');
  }, [departmentId, filiereId, visibleFilieres]);

  // Cascade: reset option when filière changes
  useEffect(() => {
    const still = visibleOptions.some((o) => String(o.id) === optionId);
    if (!still) setOptionId('');
  }, [filiereId, optionId, visibleOptions]);

  // Cascade: reset when class changes
  useEffect(() => {
    if (!classId) {
      setModuleId('');
      setElementModuleId('');
      setSemester('');
      setStudents([]);
      setModules([]);
      setElementModules([]);
      setGradeInputs({});
      return;
    }
    if (!selectedClass) return;

    const load = async () => {
      try {
        setLoadingStudents(true);
        setModuleId('');
        setElementModuleId('');
        setSemester('');
        setElementModules([]);
        setGradeInputs({});

        const [studentsRes, modulesRes] = await Promise.all([
          api.get<Student[]>(`/students/by-class/${selectedClass.id}`),
          api.get<PaginatedResponse<ModuleRow>>('/academic-modules', {
            params: {
              page: 1,
              limit: 200,
              classId: selectedClass.id,
            },
          }),
        ]);

        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
        setModules(modulesRes.data.data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Impossible de charger la classe sélectionnée.'));
        setStudents([]);
        setModules([]);
      } finally {
        setLoadingStudents(false);
      }
    };
    void load();
  }, [classId, selectedClass]);

  // Reset moduleId if no longer in filtered list after semester change
  useEffect(() => {
    if (moduleId && !filteredModules.some((m) => String(m.id) === moduleId)) {
      setModuleId('');
      setElementModuleId('');
      setGradeInputs({});
    }
  }, [filteredModules, moduleId]);

  // Load elements when module changes
  useEffect(() => {
    if (!moduleId) {
      setElementModules([]);
      setElementModuleId('');
      setGradeInputs({});
      return;
    }
    const load = async () => {
      try {
        const res = await api.get<PaginatedResponse<ElementModule>>('/element-modules', {
          params: { page: 1, limit: 500, moduleId, sortBy: 'name', sortOrder: 'asc' },
        });
        setElementModules(res.data.data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Impossible de charger les éléments de module.'));
        setElementModules([]);
      }
    };
    void load();
  }, [moduleId]);

  // Load existing grades
  useEffect(() => {
    const hasContext = selectedClass && selectedModule && selectedElementModule && academicYear.trim();
    if (!hasContext) {
      setGradeInputs(
        students.length === 0
          ? {}
          : students.reduce<Record<number, GradeInput>>((acc, s) => {
              acc[s.id] = { score: '', comment: '' };
              return acc;
            }, {}),
      );
      return;
    }

    const load = async () => {
      try {
        setLoadingGrades(true);
        const res = await api.get<PaginatedResponse<GradeRow>>('/grades', {
          params: {
            page: 1,
            limit: 200,
            classId: selectedClass.id,
            moduleId: selectedModule.id,
            elementModuleId: selectedElementModule.id,
            academicYear: academicYear.trim(),
            semester: semester.trim() || undefined,
          },
        });
        const byStudentId = new Map<number, GradeRow>();
        res.data.data.forEach((g) => {
          if (!byStudentId.has(g.student.id)) byStudentId.set(g.student.id, g);
        });
        setGradeInputs(
          students.reduce<Record<number, GradeInput>>((acc, s) => {
            const existing = byStudentId.get(s.id);
            acc[s.id] = {
              id: existing?.id,
              score: existing ? String(existing.score) : '',
              comment: existing?.comment ?? '',
              publicationStatus: existing?.publicationStatus ?? 'draft',
              lockedAt: existing?.lockedAt ?? null,
            };
            return acc;
          }, {}),
        );
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Impossible de charger les notes existantes.'));
      } finally {
        setLoadingGrades(false);
      }
    };
    void load();
  }, [academicYear, elementModuleId, semester, selectedClass, selectedElementModule, selectedModule, students]);

  // ─── Actions ─────────────────────────────────────────────────────────────

  const updateGradeInput = (studentId: number, field: keyof GradeInput, value: string) => {
    setGradeInputs((cur) => ({
      ...cur,
      [studentId]: { ...cur[studentId], [field]: value },
    }));
  };

  const saveGrades = async () => {
    if (!selectedClass || !selectedModule || !selectedElementModule) {
      toast.error('Choisissez la classe, le module et l\'élément de module.');
      return;
    }
    if (!academicYear.trim()) {
      toast.error('Choisissez une année académique.');
      return;
    }
    const grades = students
      .map((s) => {
        const entry = gradeInputs[s.id];
        if (!entry || entry.score.trim() === '') return null;
        return { id: entry.id, studentId: s.id, score: Number(entry.score), comment: entry.comment.trim() || undefined };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);

    if (grades.length === 0) {
      toast.error('Saisissez au moins une note avant d\'enregistrer.');
      return;
    }
    if (grades.some((g) => Number.isNaN(g.score))) {
      toast.error('Chaque note doit être un nombre valide.');
      return;
    }
    if (grades.some((g) => g.score < 0 || g.score > 20)) {
      toast.error('Chaque note doit être comprise entre 0 et 20.');
      return;
    }

    try {
      setSavingGrades(true);
      const res = await api.post('/grades/bulk-upsert', {
        classId: selectedClass.id,
        moduleId: selectedModule.id,
        elementModuleId: selectedElementModule.id,
        academicYear: academicYear.trim(),
        semester: semester.trim() || undefined,
        maxScore: 20,
        grades,
      });
      const data = res.data as { created: number; updated: number; total: number };
      toast.success(
        `${data.total} note(s) enregistrée(s) (${data.created} créée(s), ${data.updated} mise(s) à jour)`,
      );
      setLastSavedAt(new Date());
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Échec de l\'enregistrement des notes.'));
    } finally {
      setSavingGrades(false);
    }
  };

  const publishGrades = async () => {
    if (!selectedClass || !selectedModule || !selectedElementModule || !academicYear.trim()) {
      toast.error('Choisissez la classe, le module, l’élément et l’année académique.');
      return;
    }
    if (enteredGradesCount === 0) {
      toast.error('Enregistrez au moins une note avant publication.');
      return;
    }
    try {
      setPublishingGrades(true);
      const res = await api.post('/grades/publish', {
        classId: selectedClass.id,
        moduleId: selectedModule.id,
        elementModuleId: selectedElementModule.id,
        academicYear: academicYear.trim(),
        semester: semester.trim() || undefined,
      });
      const data = res.data as { published: number };
      setGradeInputs((cur) =>
        Object.fromEntries(
          Object.entries(cur).map(([studentId, entry]) => [
            studentId,
            entry.score.trim()
              ? { ...entry, publicationStatus: 'published', lockedAt: new Date().toISOString() }
              : entry,
          ]),
        ),
      );
      toast.success(`${data.published} note(s) publiée(s).`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Échec de la publication des notes.'));
    } finally {
      setPublishingGrades(false);
    }
  };

  const reopenGrades = async () => {
    if (!selectedClass || !academicYear.trim()) {
      toast.error('Choisissez la classe et l’année académique.');
      return;
    }
    try {
      setReopeningGrades(true);
      const res = await api.post('/grades/reopen', {
        classId: selectedClass.id,
        moduleId: selectedModule?.id,
        elementModuleId: selectedElementModule?.id,
        academicYear: academicYear.trim(),
        semester: semester.trim() || undefined,
      });
      const data = res.data as { reopened: number };
      setGradeInputs((cur) =>
        Object.fromEntries(
          Object.entries(cur).map(([studentId, entry]) => [
            studentId,
            { ...entry, lockedAt: null },
          ]),
        ),
      );
      toast.success(`${data.reopened} note(s) rouverte(s).`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Échec de la réouverture des notes.'));
    } finally {
      setReopeningGrades(false);
    }
  };

  const unpublishGrades = async () => {
    if (!selectedClass || !selectedModule || !selectedElementModule || !academicYear.trim()) {
      toast.error('Choisissez la classe, le module, l’élément et l’année académique.');
      return;
    }
    try {
      setUnpublishingGrades(true);
      const res = await api.post('/grades/unpublish', {
        classId: selectedClass.id,
        moduleId: selectedModule.id,
        elementModuleId: selectedElementModule.id,
        academicYear: academicYear.trim(),
        semester: semester.trim() || undefined,
      });
      const data = res.data as { unpublished: number };
      setGradeInputs((cur) =>
        Object.fromEntries(
          Object.entries(cur).map(([studentId, entry]) => [
            studentId,
            entry.score.trim()
              ? { ...entry, publicationStatus: 'draft', lockedAt: null }
              : entry,
          ]),
        ),
      );
      toast.success(`${data.unpublished} note(s) masquée(s). Les notes restent enregistrées.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Échec du retrait de publication.'));
    } finally {
      setUnpublishingGrades(false);
    }
  };

  const exportStudentList = () => {
    if (!students.length) { toast.error('Aucun étudiant à exporter.'); return; }
    const elementName = (selectedElementModule?.name ?? 'element').replace(/\s+/g, '_');
    const className   = (selectedClass?.name ?? 'classe').replace(/\s+/g, '_');
    const fileName    = `${elementName}_${className}.csv`;
    const csvEscape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);
    const header = 'codeMassar,fullName,score,comment';
    const rows   = students.map((s) => {
      const existing = gradeInputs[s.id];
      const score = existing?.score ?? '';
      const comment = existing?.comment ?? '';
      return `${s.codeMassar},${csvEscape(s.fullName)},${score},${csvEscape(comment)}`;
    });
    const blob   = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  };

  const exportReleve = async () => {
    if (!selectedClass) { toast.error('Choisissez une classe.'); return; }
    try {
      setExportingReleve(true);
      type DelibeStudent = {
        id: number; fullName: string; codeMassar: string;
        moduleAverages: Record<number, number | null>;
        overallAverage: number | null;
      };
      type DelibeModule = { id: number; name: string; semestre?: string | null };
      type DelibeResponse = { class: { name: string }; modules: DelibeModule[]; students: DelibeStudent[] };

      const res = await api.get<DelibeResponse>(`/grades/deliberation/class/${selectedClass.id}`, {
        params: {
          ...(academicYear.trim() ? { academicYear: academicYear.trim() } : {}),
          ...(semester.trim() ? { semester: semester.trim() } : {}),
        },
      });

      const { class: cls, modules, students: raw } = res.data;
      const csvEscape = (v: string) => (v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v);

      // Sort by overallAverage desc, nulls last
      const sorted = [...raw].sort((a, b) => {
        if (a.overallAverage === null && b.overallAverage === null) return 0;
        if (a.overallAverage === null) return 1;
        if (b.overallAverage === null) return -1;
        return b.overallAverage - a.overallAverage;
      });

      const moduleHeaders = modules.map((m) => csvEscape(`${m.name}${m.semestre ? ` (${m.semestre})` : ''}`));
      const header = ['Rang', 'Code Massar', 'Nom complet', ...moduleHeaders, 'Moyenne générale'].join(',');

      const rows = sorted.map((s, idx) => {
        const moduleCols = modules.map((m) => {
          const avg = s.moduleAverages[m.id];
          return avg !== null && avg !== undefined ? String(avg) : '';
        });
        const overall = s.overallAverage !== null && s.overallAverage !== undefined ? String(s.overallAverage) : '';
        return [String(idx + 1), s.codeMassar, csvEscape(s.fullName), ...moduleCols, overall].join(',');
      });

      const periodPart = [academicYear.trim(), semester.trim()].filter(Boolean).join(' — ');
      const titleRow = `Relevé de Notes — Classe: ${cls.name}${periodPart ? ` — ${periodPart}` : ''}`;
      const csvContent = [titleRow, header, ...rows].join('\n');

      const className = cls.name.replace(/\s+/g, '_');
      const yearPart = academicYear.trim().replace(/\//g, '-') || 'all';
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `releve_${className}_${yearPart}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de générer le relevé.'));
    } finally {
      setExportingReleve(false);
    }
  };

  const uploadGrades = async () => {
    if (!selectedClass || !selectedModule || !selectedElementModule) {
      toast.error('Choisissez la classe, le module et l\'élément de module.');
      return;
    }
    if (!academicYear.trim()) {
      toast.error('Choisissez une année académique.');
      return;
    }
    if (!importFile) {
      toast.error('Choisissez un fichier XLSX, XLS ou CSV.');
      return;
    }

    try {
      setImportingGrades(true);
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('classId', String(selectedClass.id));
      formData.append('moduleId', String(selectedModule.id));
      formData.append('elementModuleId', String(selectedElementModule.id));
      formData.append('academicYear', academicYear.trim());
      formData.append('maxScore', '20');
      if (semester.trim()) formData.append('semester', semester.trim());

      const res = await api.post('/grades/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data as { importedRows: number; skippedRows: number; created: number; updated: number };
      toast.success(`Import terminé : ${data.importedRows} ligne(s) prise(s) en compte, ${data.skippedRows} ignorée(s)`);
      setImportFile(null);

      // Refresh grades
      const refreshed = await api.get<PaginatedResponse<GradeRow>>('/grades', {
        params: {
          page: 1, limit: 1000,
          classId: selectedClass.id,
          moduleId: selectedModule.id,
          elementModuleId: selectedElementModule.id,
          academicYear: academicYear.trim(),
          semester: semester.trim() || undefined,
        },
      });
      const byStudentId = new Map<number, GradeRow>();
      refreshed.data.data.forEach((g) => {
        if (!byStudentId.has(g.student.id)) byStudentId.set(g.student.id, g);
      });
      setGradeInputs(
        students.reduce<Record<number, GradeInput>>((acc, s) => {
          const existing = byStudentId.get(s.id);
          acc[s.id] = {
            id: existing?.id,
            score: existing ? String(existing.score) : '',
            comment: existing?.comment ?? '',
            publicationStatus: existing?.publicationStatus ?? 'draft',
            lockedAt: existing?.lockedAt ?? null,
          };
          return acc;
        }, {}),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Échec de l\'import des notes.'));
    } finally {
      setImportingGrades(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Évaluations"
        title={isStudent ? 'Mes notes' : 'Épreuves et notes'}
        description={isStudent
          ? 'Consultez uniquement vos notes, sans filtres ni actions d’administration.'
          : "Choisissez la classe, le semestre, le module et l'élément avant de saisir ou d'importer les notes."}
      />

      {isStudent ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Étudiant" value={myStudent?.fullName ?? '-'} hint={myStudent?.academicClass ? `${myStudent.academicClass.name} · Année ${myStudent.academicClass.year}` : 'Classe non trouvée'} icon={GraduationCap} />
            <MetricCard label="Code" value={myStudent?.codeEtudiant ?? myStudent?.codeMassar ?? '-'} hint="Identifiant académique" icon={FileSpreadsheet} />
            <MetricCard label="Année courante" value={currentAcademicYear ?? '-'} hint="Résultats publiés pour cette année" icon={BookOpen} />
            <MetricCard label="Moyenne simple" value={simpleAverage} hint="Calcul indicatif sur l'année courante" icon={Layers} />
          </section>

          {loadingReference ? (
            <div className="empty-note">Chargement de vos notes...</div>
          ) : myGrades.length === 0 ? (
            <EmptyState title="Aucune note disponible" description={currentAcademicYear ? `Aucune note publiée pour ${currentAcademicYear}.` : 'Aucune note publiée pour l’année courante.'} />
          ) : (
            <section className="surface-card">
              <StudentReleve student={myStudent} grades={myGrades} />
            </section>
          )}

          {gradeHistory.length > 0 && (
            <section className="surface-card space-y-4">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Historique des années</h2>
                  <p className="panel-copy">Les années précédentes utilisent le même format de relevé.</p>
                </div>
              </div>
              <StudentReleve
                student={myStudent}
                grades={gradeHistory.flatMap((entry) => entry.grades)}
              />
            </section>
          )}
        </>
      ) : (
        <>

      {/* Metrics */}
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Classes visibles" value={visibleClasses.length} hint="Selon votre rôle et vos filtres" icon={GraduationCap} />
        <MetricCard label="Modules" value={filteredModules.length} hint="Dans la classe / semestre choisi" icon={BookOpen} />
        <MetricCard label="Éléments" value={elementModules.length} hint="Dans le module choisi" icon={Layers} />
        <MetricCard label="Notes remplies" value={enteredGradesCount} hint="Prêtes à être enregistrées" icon={FileSpreadsheet} />
      </section>
      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Brouillon" value={publicationCounts.draft} hint="Non visible côté étudiant" icon={FileText} />
        <MetricCard label="Publié" value={publicationCounts.published} hint="Visible dans le portail étudiant" icon={Send} />
        <MetricCard label="Modifié" value={publicationCounts.modified_after_publication} hint="À republier après contrôle" icon={Save} />
        <MetricCard label="Verrouillé" value={publicationCounts.locked} hint="Lecture seule après publication" icon={Lock} />
      </section>

      {/* Academic path */}
      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Chemin académique</h2>
            <p className="panel-copy">
              Sélectionnez l&apos;année, le département, la classe, le semestre, le module et l&apos;élément.
            </p>
          </div>
        </div>

        {loadingReference ? (
          <div className="empty-note">Chargement des filtres académiques...</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-7">
            {/* Année académique */}
            <AcademicYearSelect
              value={academicYear}
              years={academicYears}
              onChange={setAcademicYear}
              required
            />

            <div className="field-stack">
              <label className="field-label">Département</label>
              <select
                className="input"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={restrictedToOwnDepartments && visibleDepartments.length <= 1}
              >
                <option value="">Tous</option>
                {visibleDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Filière</label>
              <select className="input" value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
                <option value="">Toutes</option>
                {visibleFilieres.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Classe</label>
              <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Choisir</option>
                {visibleClasses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
                ))}
              </select>
            </div>

            <SemesterSelect
              value={semester}
              onChange={setSemester}
              emptyLabel="Tous"
              disabled={!classId || loadingStudents}
            />

            <div className="field-stack">
              <label className="field-label">Module</label>
              <select
                className="input"
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                disabled={!classId || loadingStudents}
              >
                <option value="">Choisir</option>
                {filteredModules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{m.semestre ? ` (${m.semestre})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Élément</label>
              <select
                className="input"
                value={elementModuleId}
                onChange={(e) => setElementModuleId(e.target.value)}
                disabled={!moduleId}
              >
                <option value="">Choisir</option>
                {elementModules.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.type}) — Pond. {e.ponderation ?? 1}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Grade entry */}
      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Liste des étudiants</h2>
            <p className="panel-copy">
              Saisissez la note par étudiant, enregistrez en brouillon, puis publiez quand le jury valide.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {savingGrades
                ? 'Enregistrement du brouillon...'
                : lastSavedAt
                  ? `Dernier enregistrement : ${lastSavedAt.toLocaleTimeString('fr-FR')}`
                  : 'Brouillon non enregistré'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-outline flex items-center gap-2"
              type="button"
              onClick={() => void exportReleve()}
              disabled={!classId || exportingReleve}
              title="Exporter le relevé de notes de toute la classe, classé par moyenne"
            >
              <FileText size={14} />
              {exportingReleve ? 'Export...' : 'Relevé de notes'}
            </button>
            <button
              className="btn-outline flex items-center gap-2"
              type="button"
              onClick={exportStudentList}
              disabled={!students.length}
              title="Exporter la liste des étudiants en CSV"
            >
              <Download size={14} />
              Liste étudiants
            </button>
            <button
              className="btn-outline flex items-center gap-2"
              type="button"
              onClick={uploadGrades}
              disabled={!canEdit || importingGrades}
            >
              <Upload size={14} />
              {importingGrades ? 'Import...' : 'Importer un fichier'}
            </button>
            <button
              className="btn-primary flex items-center gap-2"
              type="button"
              onClick={saveGrades}
              disabled={!canEdit || savingGrades || notesLocked}
            >
              <Save size={14} />
              {savingGrades ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            {canManagePublication && (
              <>
                <button
                  className="btn-primary flex items-center gap-2"
                  type="button"
                  onClick={publishGrades}
                  disabled={publishingGrades || enteredGradesCount === 0}
                >
                  <Send size={14} />
                  {publishingGrades ? 'Publication...' : 'Publier'}
                </button>
                <button
                  className="btn-outline flex items-center gap-2"
                  type="button"
                  onClick={unpublishGrades}
                  disabled={unpublishingGrades || enteredGradesCount === 0}
                >
                  <Lock size={14} />
                  {unpublishingGrades ? 'Masquage...' : 'Masquer'}
                </button>
                <button
                  className="btn-outline flex items-center gap-2"
                  type="button"
                  onClick={reopenGrades}
                  disabled={reopeningGrades || !notesLocked}
                >
                  <Lock size={14} />
                  {reopeningGrades ? 'Réouverture...' : 'Rouvrir'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* File import row */}
        <div className="grid gap-3 rounded-2xl border border-dashed border-slate-200 p-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="field-stack">
            <label className="field-label">Fichier d&apos;import</label>
            <input
              className="input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              disabled={!canEdit}
            />
            <p className="text-xs text-slate-500">
              Format attendu : <code>codeMassar</code>, <code>fullName</code>, <code>score</code>, <code>comment</code> — utilisez le bouton &quot;Liste étudiants&quot; pour obtenir le modèle.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {selectedClass && selectedModule && selectedElementModule ? (
              <>
                <p className="font-semibold text-slate-900">{selectedClass.name}</p>
                <p>{selectedModule.name}</p>
                <p>{selectedElementModule.name}</p>
                {academicYear && <p className="text-xs text-slate-400 mt-1">{academicYear}{semester ? ` · ${semester}` : ''}</p>}
              </>
            ) : (
              <p>Sélectionnez d&apos;abord la classe, le module et l&apos;élément.</p>
            )}
          </div>
        </div>

        {/* Student table */}
        {!classId ? (
          <EmptyState title="Choisissez une classe" description="Commencez par sélectionner le chemin académique de l&apos;épreuve." />
        ) : loadingStudents ? (
          <div className="empty-note">Chargement des étudiants et modules...</div>
        ) : !moduleId || !elementModuleId ? (
          <EmptyState title="Complétez la sélection" description="Choisissez le module puis l&apos;élément de module pour afficher la liste des étudiants." />
        ) : students.length === 0 ? (
          <EmptyState title="Aucun étudiant trouvé" description="La classe sélectionnée ne contient pas encore d'étudiants." />
        ) : loadingGrades ? (
          <div className="empty-note">Chargement des notes existantes...</div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr>
                    <th>Étudiant</th>
                    <th>Code Massar</th>
                    <th>Note</th>
                    <th>Commentaire</th>
                    <th>Publication</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const entry = gradeInputs[student.id] ?? { score: '', comment: '' };
                    return (
                      <tr key={student.id}>
                        <td className="font-medium text-slate-900">{student.fullName}</td>
                        <td className="text-slate-500">{student.codeMassar}</td>
                        <td className="min-w-36">
                          <input
                            className="input"
                            value={entry.score}
                            onChange={(e) => updateGradeInput(student.id, 'score', e.target.value)}
                            inputMode="decimal"
                            placeholder="0 à 20"
                            tabIndex={0}
                            disabled={!canEdit || Boolean(entry.lockedAt)}
                          />
                          {entry.score.trim() && (Number(entry.score) < 0 || Number(entry.score) > 20 || Number.isNaN(Number(entry.score))) ? (
                            <p className="mt-1 text-xs text-red-600">Valeur invalide</p>
                          ) : null}
                        </td>
                        <td className="min-w-72">
                          <input
                            className="input"
                            value={entry.comment}
                            onChange={(e) => updateGradeInput(student.id, 'comment', e.target.value)}
                            placeholder="Observation facultative"
                            tabIndex={0}
                            disabled={!canEdit || Boolean(entry.lockedAt)}
                          />
                        </td>
                        <td>{publicationChip(entry.publicationStatus, entry.lockedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!canEdit && (
              <p className="text-sm text-amber-700">
                Votre rôle permet la consultation, mais pas la modification depuis cette interface.
              </p>
            )}
            {notesLocked && (
              <p className="text-sm text-amber-700">
                Ces notes sont publiées et verrouillées. Un administrateur peut les rouvrir avant correction.
              </p>
            )}
          </div>
        )}
      </section>
        </>
      )}
    </div>
  );
}
