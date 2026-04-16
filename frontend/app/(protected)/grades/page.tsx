'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Save,
  Upload,
} from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { MetricCard } from '@/components/admin/metric-card';
import { PageHeader } from '@/components/admin/page-header';
import { useAuth } from '@/features/auth/auth-context';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type Department = { id: number; name: string };
type Filiere = { id: number; name: string; departmentId: number };
type AcademicOption = { id: number; name: string; filiereId: number };
type Teacher = { id: number; firstName: string; lastName: string };

type AcademicClass = {
  id: number;
  name: string;
  year: number;
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
  student: { id: number };
};

type GradeInput = {
  id?: number;
  score: string;
  comment: string;
};

const DEFAULT_ACADEMIC_YEAR = '2025/2026';
const DEFAULT_EPReUVE = 'Contrôle continu';

export default function EpreuvesPage() {
  const { user } = useAuth();
  const canEdit = user?.role !== 'viewer';
  const restrictedToOwnDepartments =
    user?.role === 'user' || user?.role === 'viewer';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [options, setOptions] = useState<AcademicOption[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [elementModules, setElementModules] = useState<ElementModule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [gradeInputs, setGradeInputs] = useState<Record<number, GradeInput>>({});

  const [departmentId, setDepartmentId] = useState('');
  const [filiereId, setFiliereId] = useState('');
  const [optionId, setOptionId] = useState('');
  const [classId, setClassId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [elementModuleId, setElementModuleId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [academicYear, setAcademicYear] = useState(DEFAULT_ACADEMIC_YEAR);
  const [semester, setSemester] = useState('');
  const [assessmentType, setAssessmentType] = useState(DEFAULT_EPReUVE);
  const [maxScore, setMaxScore] = useState('20');
  const [importFile, setImportFile] = useState<File | null>(null);

  const [loadingReference, setLoadingReference] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [savingGrades, setSavingGrades] = useState(false);
  const [importingGrades, setImportingGrades] = useState(false);

  const visibleDepartments = useMemo(() => {
    if (!restrictedToOwnDepartments) {
      return departments;
    }

    const allowed = new Set((user?.departments ?? []).map((item) => item.id));
    return departments.filter((item) => allowed.has(item.id));
  }, [departments, restrictedToOwnDepartments, user?.departments]);

  const visibleFilieres = useMemo(() => {
    const allowedDepartmentIds = new Set(visibleDepartments.map((item) => item.id));
    return filieres.filter((item) => {
      if (!allowedDepartmentIds.has(item.departmentId)) {
        return false;
      }
      if (departmentId && String(item.departmentId) !== departmentId) {
        return false;
      }
      return true;
    });
  }, [departmentId, filieres, visibleDepartments]);

  const visibleOptions = useMemo(() => {
    if (!filiereId) {
      return [];
    }
    return options.filter((item) => String(item.filiereId) === filiereId);
  }, [filiereId, options]);

  const visibleClasses = useMemo(() => {
    return classes.filter((item) => {
      const currentDepartmentId = item.filiere?.department?.id;
      if (departmentId && String(currentDepartmentId ?? '') !== departmentId) {
        return false;
      }
      if (filiereId && String(item.filiereId ?? '') !== filiereId) {
        return false;
      }
      if (optionId && String(item.optionId ?? '') !== optionId) {
        return false;
      }
      return true;
    });
  }, [classes, departmentId, filiereId, optionId]);

  const selectedClass = useMemo(
    () => visibleClasses.find((item) => String(item.id) === classId) ?? null,
    [classId, visibleClasses],
  );

  const selectedModule = useMemo(
    () => modules.find((item) => String(item.id) === moduleId) ?? null,
    [moduleId, modules],
  );

  const selectedElementModule = useMemo(
    () =>
      elementModules.find((item) => String(item.id) === elementModuleId) ?? null,
    [elementModuleId, elementModules],
  );

  const enteredGradesCount = useMemo(
    () =>
      Object.values(gradeInputs).filter((item) => item.score.trim() !== '').length,
    [gradeInputs],
  );

  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setLoadingReference(true);
        const [depsRes, filieresRes, optionsRes, classesRes, teachersRes] =
          await Promise.all([
            api.get<PaginatedResponse<Department>>('/departments', {
              params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' },
            }),
            api.get<PaginatedResponse<Filiere>>('/filieres', {
              params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' },
            }),
            api.get<PaginatedResponse<AcademicOption>>('/options', {
              params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' },
            }),
            api.get<PaginatedResponse<AcademicClass>>('/classes', {
              params: { page: 1, limit: 500, sortBy: 'name', sortOrder: 'asc' },
            }),
            api.get<PaginatedResponse<Teacher>>('/teachers', {
              params: { page: 1, limit: 500, sortBy: 'lastName', sortOrder: 'asc' },
            }),
          ]);

        setDepartments(depsRes.data.data);
        setFilieres(filieresRes.data.data);
        setOptions(optionsRes.data.data);
        setClasses(classesRes.data.data);
        setTeachers(teachersRes.data.data);
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Impossible de charger les données de référence.'),
        );
      } finally {
        setLoadingReference(false);
      }
    };

    void loadReferenceData();
  }, []);

  useEffect(() => {
    if (
      restrictedToOwnDepartments &&
      user?.departments &&
      user.departments.length === 1 &&
      !departmentId
    ) {
      setDepartmentId(String(user.departments[0].id));
    }
  }, [departmentId, restrictedToOwnDepartments, user?.departments]);

  useEffect(() => {
    if (!departmentId) {
      return;
    }
    const stillValid = visibleFilieres.some((item) => String(item.id) === filiereId);
    if (!stillValid) {
      setFiliereId('');
    }
  }, [departmentId, filiereId, visibleFilieres]);

  useEffect(() => {
    if (!filiereId) {
      setOptionId('');
      return;
    }
    const stillValid = visibleOptions.some((item) => String(item.id) === optionId);
    if (!stillValid) {
      setOptionId('');
    }
  }, [filiereId, optionId, visibleOptions]);

  useEffect(() => {
    if (!classId) {
      setModuleId('');
      setElementModuleId('');
      setStudents([]);
      setModules([]);
      setElementModules([]);
      setGradeInputs({});
      return;
    }

    const loadClassContext = async () => {
      if (!selectedClass) {
        return;
      }

      try {
        setLoadingStudents(true);
        setModuleId('');
        setElementModuleId('');
        setElementModules([]);
        setGradeInputs({});

        const [studentsRes, modulesRes] = await Promise.all([
          api.get<Student[]>(`/students/by-class/${selectedClass.id}`),
          api.get<PaginatedResponse<ModuleRow>>('/academic-modules', {
            params: {
              page: 1,
              limit: 500,
              filiereId: selectedClass.filiereId || undefined,
              optionId: selectedClass.optionId || undefined,
              classYear: selectedClass.year,
            },
          }),
        ]);

        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
        setModules(
          modulesRes.data.data.filter((item) =>
            item.classes.some(
              (assignment) => assignment.class.id === selectedClass.id,
            ),
          ),
        );
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Impossible de charger la classe sélectionnée.'),
        );
        setStudents([]);
        setModules([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    void loadClassContext();
  }, [classId, selectedClass]);

  useEffect(() => {
    if (!moduleId) {
      setElementModules([]);
      setElementModuleId('');
      setGradeInputs({});
      return;
    }

    const loadElements = async () => {
      try {
        const response = await api.get<PaginatedResponse<ElementModule>>(
          '/element-modules',
          {
            params: {
              page: 1,
              limit: 500,
              moduleId,
              sortBy: 'name',
              sortOrder: 'asc',
            },
          },
        );
        setElementModules(response.data.data);
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Impossible de charger les éléments de module.'),
        );
        setElementModules([]);
      }
    };

    void loadElements();
  }, [moduleId]);

  useEffect(() => {
    const hasContext =
      selectedClass && selectedModule && selectedElementModule && assessmentType.trim();

    if (!hasContext) {
      setGradeInputs((current) => {
        if (students.length === 0) {
          return {};
        }
        const resetEntries = students.reduce<Record<number, GradeInput>>(
          (accumulator, student) => {
            accumulator[student.id] = {
              score: current[student.id]?.score ?? '',
              comment: current[student.id]?.comment ?? '',
            };
            return accumulator;
          },
          {},
        );
        return resetEntries;
      });
      return;
    }

    const loadExistingGrades = async () => {
      try {
        setLoadingGrades(true);
        const response = await api.get<PaginatedResponse<GradeRow>>('/grades', {
          params: {
            page: 1,
            limit: 200,
            classId: selectedClass.id,
            moduleId: selectedModule.id,
            elementModuleId: selectedElementModule.id,
            academicYear: academicYear.trim(),
            semester: semester.trim() || undefined,
            assessmentType: assessmentType.trim(),
          },
        });

        const byStudentId = new Map<number, GradeRow>();
        response.data.data.forEach((item) => {
          if (!byStudentId.has(item.student.id)) {
            byStudentId.set(item.student.id, item);
          }
        });

        const nextInputs = students.reduce<Record<number, GradeInput>>(
          (accumulator, student) => {
            const existing = byStudentId.get(student.id);
            accumulator[student.id] = {
              id: existing?.id,
              score: existing ? String(existing.score) : '',
              comment: existing?.comment ?? '',
            };
            return accumulator;
          },
          {},
        );

        setGradeInputs(nextInputs);
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Impossible de charger les notes existantes.'),
        );
      } finally {
        setLoadingGrades(false);
      }
    };

    void loadExistingGrades();
  }, [
    academicYear,
    assessmentType,
    elementModuleId,
    semester,
    selectedClass,
    selectedElementModule,
    selectedModule,
    students,
  ]);

  const updateGradeInput = (
    studentIdValue: number,
    field: keyof GradeInput,
    value: string,
  ) => {
    setGradeInputs((current) => ({
      ...current,
      [studentIdValue]: {
        ...current[studentIdValue],
        [field]: value,
      },
    }));
  };

  const saveGrades = async () => {
    if (!selectedClass || !selectedModule || !selectedElementModule) {
      toast.error('Choisissez la classe, le module et l’élément de module.');
      return;
    }

    if (!assessmentType.trim()) {
      toast.error('Le nom de l’épreuve est requis.');
      return;
    }

    const grades = students
      .map((student) => {
        const entry = gradeInputs[student.id];
        if (!entry || entry.score.trim() === '') {
          return null;
        }

        return {
          id: entry.id,
          studentId: student.id,
          score: Number(entry.score),
          comment: entry.comment.trim() || undefined,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (grades.length === 0) {
      toast.error('Saisissez au moins une note avant d’enregistrer.');
      return;
    }

    if (grades.some((item) => Number.isNaN(item.score))) {
      toast.error('Chaque note doit être un nombre valide.');
      return;
    }

    try {
      setSavingGrades(true);
      const response = await api.post('/grades/bulk-upsert', {
        classId: selectedClass.id,
        teacherId: teacherId ? Number(teacherId) : undefined,
        moduleId: selectedModule.id,
        elementModuleId: selectedElementModule.id,
        academicYear: academicYear.trim(),
        semester: semester.trim() || undefined,
        assessmentType: assessmentType.trim(),
        maxScore: Number(maxScore) || 20,
        grades,
      });

      const data = response.data as { created: number; updated: number; total: number };
      toast.success(
        `${data.total} note(s) enregistrée(s) (${data.created} créée(s), ${data.updated} mise(s) à jour)`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Échec de l’enregistrement des notes.'));
    } finally {
      setSavingGrades(false);
    }
  };

  const uploadGrades = async () => {
    if (!selectedClass || !selectedModule || !selectedElementModule) {
      toast.error('Choisissez la classe, le module et l’élément de module.');
      return;
    }
    if (!assessmentType.trim()) {
      toast.error('Le nom de l’épreuve est requis.');
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
      formData.append('assessmentType', assessmentType.trim());
      formData.append('maxScore', String(Number(maxScore) || 20));
      if (teacherId) formData.append('teacherId', teacherId);
      if (semester.trim()) formData.append('semester', semester.trim());

      const response = await api.post('/grades/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data as {
        importedRows: number;
        skippedRows: number;
        created: number;
        updated: number;
      };

      toast.success(
        `Import terminé: ${data.importedRows} ligne(s) prise(s) en compte, ${data.skippedRows} ignorée(s)`,
      );
      setImportFile(null);

      const refreshed = await api.get<PaginatedResponse<GradeRow>>('/grades', {
        params: {
          page: 1,
          limit: 1000,
          classId: selectedClass.id,
          moduleId: selectedModule.id,
          elementModuleId: selectedElementModule.id,
          academicYear: academicYear.trim(),
          semester: semester.trim() || undefined,
          assessmentType: assessmentType.trim(),
        },
      });
      const byStudentId = new Map<number, GradeRow>();
      refreshed.data.data.forEach((item) => {
        if (!byStudentId.has(item.student.id)) {
          byStudentId.set(item.student.id, item);
        }
      });
      const nextInputs = students.reduce<Record<number, GradeInput>>(
        (accumulator, student) => {
          const existing = byStudentId.get(student.id);
          accumulator[student.id] = {
            id: existing?.id,
            score: existing ? String(existing.score) : '',
            comment: existing?.comment ?? '',
          };
          return accumulator;
        },
        {},
      );
      setGradeInputs(nextInputs);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Échec de l’import des notes.'));
    } finally {
      setImportingGrades(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Évaluations"
        title="Épreuves et notes"
        description="Choisissez une classe, puis le module et l’élément de module avant de saisir ou d’importer les notes des étudiants."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Classes visibles"
          value={visibleClasses.length}
          hint="Selon votre rôle et vos filtres"
          icon={GraduationCap}
        />
        <MetricCard
          label="Modules"
          value={modules.length}
          hint="Dans la classe choisie"
          icon={BookOpen}
        />
        <MetricCard
          label="Éléments"
          value={elementModules.length}
          hint="Dans le module choisi"
          icon={Layers}
        />
        <MetricCard
          label="Notes remplies"
          value={enteredGradesCount}
          hint="Prêtes à être enregistrées"
          icon={FileSpreadsheet}
        />
      </section>

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Chemin académique</h2>
            <p className="panel-copy">
              Sélectionnez département, filière, option, classe, module et élément de module.
            </p>
          </div>
        </div>

        {loadingReference ? (
          <div className="empty-note">Chargement des filtres académiques...</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="field-stack">
              <label className="field-label">Département</label>
              <select
                className="input"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                disabled={restrictedToOwnDepartments && visibleDepartments.length <= 1}
              >
                <option value="">Tous</option>
                {visibleDepartments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Filière</label>
              <select
                className="input"
                value={filiereId}
                onChange={(event) => setFiliereId(event.target.value)}
              >
                <option value="">Toutes</option>
                {visibleFilieres.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Option</label>
              <select
                className="input"
                value={optionId}
                onChange={(event) => setOptionId(event.target.value)}
                disabled={!filiereId}
              >
                <option value="">Toutes</option>
                {visibleOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Classe</label>
              <select
                className="input"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
              >
                <option value="">Choisir</option>
                {visibleClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.year})
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Module</label>
              <select
                className="input"
                value={moduleId}
                onChange={(event) => setModuleId(event.target.value)}
                disabled={!classId || loadingStudents}
              >
                <option value="">Choisir</option>
                {modules.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-stack">
              <label className="field-label">Élément</label>
              <select
                className="input"
                value={elementModuleId}
                onChange={(event) => setElementModuleId(event.target.value)}
                disabled={!moduleId}
              >
                <option value="">Choisir</option>
                {elementModules.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Paramètres de l’épreuve</h2>
            <p className="panel-copy">
              Ces informations définissent l’épreuve à laquelle les notes appartiennent.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="field-stack">
            <label className="field-label">Épreuve</label>
            <input
              className="input"
              value={assessmentType}
              onChange={(event) => setAssessmentType(event.target.value)}
              placeholder="Examen final, TP 1..."
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Année académique</label>
            <input
              className="input"
              value={academicYear}
              onChange={(event) => setAcademicYear(event.target.value)}
              placeholder="2025/2026"
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Semestre</label>
            <input
              className="input"
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
              placeholder="S1, S2..."
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Barème max</label>
            <input
              className="input"
              value={maxScore}
              onChange={(event) => setMaxScore(event.target.value)}
              inputMode="decimal"
              placeholder="20"
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Enseignant</label>
            <select
              className="input"
              value={teacherId}
              onChange={(event) => setTeacherId(event.target.value)}
            >
              <option value="">Non renseigné</option>
              {teachers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.firstName} {item.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Liste des étudiants</h2>
            <p className="panel-copy">
              Une fois l’élément choisi, saisissez la note par étudiant ou importez un fichier.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              disabled={!canEdit || savingGrades}
            >
              <Save size={14} />
              {savingGrades ? 'Enregistrement...' : 'Enregistrer les notes'}
            </button>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-dashed border-slate-200 p-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="field-stack">
            <label className="field-label">Fichier d’import</label>
            <input
              className="input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              disabled={!canEdit}
            />
            <p className="text-xs text-slate-500">
              Colonnes reconnues: `codeMassar`, `studentId` ou `fullName`, puis `score` et `comment`.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {selectedClass && selectedModule && selectedElementModule ? (
              <>
                <p className="font-semibold text-slate-900">{selectedClass.name}</p>
                <p>{selectedModule.name}</p>
                <p>{selectedElementModule.name}</p>
              </>
            ) : (
              <p>Sélectionnez d’abord la classe, le module et l’élément.</p>
            )}
          </div>
        </div>

        {!classId ? (
          <EmptyState
            title="Choisissez une classe"
            description="Commencez par sélectionner le chemin académique de l’épreuve."
          />
        ) : loadingStudents ? (
          <div className="empty-note">Chargement des étudiants et modules...</div>
        ) : !moduleId || !elementModuleId ? (
          <EmptyState
            title="Complétez la sélection"
            description="Choisissez le module puis l’élément de module pour afficher la liste des étudiants."
          />
        ) : students.length === 0 ? (
          <EmptyState
            title="Aucun étudiant trouvé"
            description="La classe sélectionnée ne contient pas encore d’étudiants."
          />
        ) : loadingGrades ? (
          <div className="empty-note">Chargement des notes existantes...</div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Étudiant</th>
                    <th>Code Massar</th>
                    <th>Note</th>
                    <th>Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const entry = gradeInputs[student.id] ?? {
                      score: '',
                      comment: '',
                    };
                    return (
                      <tr key={student.id}>
                        <td className="font-medium text-slate-900">{student.fullName}</td>
                        <td className="text-slate-500">{student.codeMassar}</td>
                        <td className="min-w-36">
                          <input
                            className="input"
                            value={entry.score}
                            onChange={(event) =>
                              updateGradeInput(student.id, 'score', event.target.value)
                            }
                            inputMode="decimal"
                            placeholder={`/${maxScore || '20'}`}
                            disabled={!canEdit}
                          />
                        </td>
                        <td className="min-w-72">
                          <input
                            className="input"
                            value={entry.comment}
                            onChange={(event) =>
                              updateGradeInput(student.id, 'comment', event.target.value)
                            }
                            placeholder="Observation facultative"
                            disabled={!canEdit}
                          />
                        </td>
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
          </div>
        )}
      </section>
    </div>
  );
}
