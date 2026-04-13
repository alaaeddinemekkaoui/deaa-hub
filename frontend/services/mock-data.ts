/**
 * IAV Hassan II — demo/mock data
 * Used automatically when the backend is unreachable (network error).
 */

const NOW = new Date().toISOString();

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMeta(total: number, page = 1, limit = 200) {
  return {
    page, limit, total,
    totalPages: Math.ceil(total / limit) || 1,
    hasNextPage: page * limit < total,
    hasPreviousPage: page > 1,
  };
}

function paginate<T>(data: T[], params?: Record<string, unknown>) {
  const page = Number(params?.page ?? 1);
  const fallbackLimit = data.length || 200;
  const limit = Number(params?.limit ?? fallbackLimit);
  const start = Math.max(0, (page - 1) * limit);
  const end = start + limit;
  return {
    data: data.slice(start, end),
    meta: makeMeta(data.length, page, limit),
  };
}

// ── Departments ───────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { id: 1, name: 'Agronomie et Biotechnologies',       createdAt: NOW, updatedAt: NOW, _count: { filieres: 2, teachers: 12 } },
  { id: 2, name: 'Sciences Vétérinaires',              createdAt: NOW, updatedAt: NOW, _count: { filieres: 1, teachers: 8  } },
  { id: 3, name: 'Génie Rural, Eaux et Forêts',        createdAt: NOW, updatedAt: NOW, _count: { filieres: 3, teachers: 10 } },
  { id: 4, name: 'Horticulture et Viticulture',        createdAt: NOW, updatedAt: NOW, _count: { filieres: 1, teachers: 6  } },
  { id: 5, name: 'Économie et Développement Rural',    createdAt: NOW, updatedAt: NOW, _count: { filieres: 2, teachers: 7  } },
];

// ── Filieres ──────────────────────────────────────────────────────────────────

const FILIERES = [
  { id: 1, name: 'Ingénieur Agronome Général',             code: 'IAG',  departmentId: 1, filiereType: 'engineer',   createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[0], _count: { classes: 3, students: 150, teachers: 8  } },
  { id: 2, name: "Ingénieur des Eaux et Forêts",           code: 'IEF',  departmentId: 3, filiereType: 'engineer',   createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[2], _count: { classes: 3, students: 90,  teachers: 6  } },
  { id: 3, name: 'Ingénieur en Génie Rural',               code: 'IGR',  departmentId: 3, filiereType: 'engineer',   createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[2], _count: { classes: 2, students: 60,  teachers: 5  } },
  { id: 4, name: 'Ingénieur en Horticulture',              code: 'IH',   departmentId: 4, filiereType: 'engineer',   createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[3], _count: { classes: 2, students: 50,  teachers: 4  } },
  { id: 5, name: 'Médecin Vétérinaire',                    code: 'MV',   departmentId: 2, filiereType: 'veterinary', createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[1], _count: { classes: 5, students: 200, teachers: 8  } },
  { id: 6, name: 'Master Agroéconomie et Dev. Rural',      code: 'MAED', departmentId: 5, filiereType: 'master',     createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[4], _count: { classes: 2, students: 40,  teachers: 5  } },
  { id: 7, name: 'Master Gestion des Ressources Naturelles', code: 'MGRN', departmentId: 3, filiereType: 'master',  createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[2], _count: { classes: 1, students: 20,  teachers: 4  } },
];

const OPTIONS = [
  { id: 1, name: 'Agriculture de précision', code: 'AGP', filiereId: 1, _count: { classes: 1, modules: 2 } },
  { id: 2, name: 'Protection des cultures',  code: 'PDC', filiereId: 1, _count: { classes: 1, modules: 2 } },
  { id: 3, name: 'Gestion forestière',       code: 'GEF', filiereId: 2, _count: { classes: 1, modules: 1 } },
  { id: 4, name: 'Hydraulique agricole',     code: 'HYA', filiereId: 3, _count: { classes: 1, modules: 1 } },
  { id: 5, name: 'Économie des filières',    code: 'ECO', filiereId: 6, _count: { classes: 1, modules: 1 } },
];

const CYCLES = [
  { id: 1, name: 'Cycle ingénieur', code: 'ING', createdAt: NOW, _count: { classes: 9 } },
  { id: 2, name: 'Cycle vétérinaire', code: 'VET', createdAt: NOW, _count: { classes: 3 } },
  { id: 3, name: 'Cycle master', code: 'MAS', createdAt: NOW, _count: { classes: 2 } },
];

// ── Teacher roles & grades ────────────────────────────────────────────────────

const TEACHER_ROLES = [
  { id: 1, name: 'Professeur Habilité',  _count: { teachers: 5  } },
  { id: 2, name: 'Professeur Assistant', _count: { teachers: 7  } },
  { id: 3, name: 'Professeur',           _count: { teachers: 15 } },
  { id: 4, name: 'Vacataire',            _count: { teachers: 8  } },
];

const TEACHER_GRADES = [
  { id: 1, name: 'PH',  _count: { teachers: 5  } },
  { id: 2, name: 'PA',  _count: { teachers: 7  } },
  { id: 3, name: 'P',   _count: { teachers: 15 } },
  { id: 4, name: 'VAC', _count: { teachers: 8  } },
];

// ── Teachers ──────────────────────────────────────────────────────────────────

const TEACHERS = [
  { id:  1, firstName: 'Mohammed', lastName: 'Alaoui',    cin: 'BE123456', email: 'm.alaoui@iav.ac.ma',    phoneNumber: '0661234567', departmentId: 1, filiereId: 1, roleId: 1, gradeId: 1, createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[0], filiere: FILIERES[0], role: TEACHER_ROLES[0], grade: TEACHER_GRADES[0], taughtClasses: [{ classId: 1, class: { id: 1, name: 'IAG1', year: 1 } }] },
  { id:  2, firstName: 'Fatima',   lastName: 'Benali',    cin: 'BK456789', email: 'f.benali@iav.ac.ma',    phoneNumber: '0662345678', departmentId: 1, filiereId: 1, roleId: 2, gradeId: 2, createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[0], filiere: FILIERES[0], role: TEACHER_ROLES[1], grade: TEACHER_GRADES[1], taughtClasses: [] },
  { id:  3, firstName: 'Youssef',  lastName: 'Chakroun',  cin: 'CD789012', email: 'y.chakroun@iav.ac.ma',  phoneNumber: '0663456789', departmentId: 2, filiereId: 5, roleId: 3, gradeId: 3, createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[1], filiere: FILIERES[4], role: TEACHER_ROLES[2], grade: TEACHER_GRADES[2], taughtClasses: [{ classId: 10, class: { id: 10, name: 'MV1', year: 1 } }] },
  { id:  4, firstName: 'Nadia',    lastName: 'Drissi',    cin: 'EF012345', email: 'n.drissi@iav.ac.ma',    phoneNumber: '0664567890', departmentId: 3, filiereId: 2, roleId: 2, gradeId: 2, createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[2], filiere: FILIERES[1], role: TEACHER_ROLES[1], grade: TEACHER_GRADES[1], taughtClasses: [{ classId: 4, class: { id: 4, name: 'IEF1', year: 1 } }] },
  { id:  5, firstName: 'Hassan',   lastName: 'Fennich',   cin: 'GH234567', email: 'h.fennich@iav.ac.ma',   phoneNumber: '0665678901', departmentId: 3, filiereId: 3, roleId: 1, gradeId: 1, createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[2], filiere: FILIERES[2], role: TEACHER_ROLES[0], grade: TEACHER_GRADES[0], taughtClasses: [] },
  { id:  6, firstName: 'Laila',    lastName: 'Guennoun',  cin: 'IJ456789', email: 'l.guennoun@iav.ac.ma',  phoneNumber: '0666789012', departmentId: 4, filiereId: 4, roleId: 3, gradeId: 3, createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[3], filiere: FILIERES[3], role: TEACHER_ROLES[2], grade: TEACHER_GRADES[2], taughtClasses: [] },
  { id:  7, firstName: 'Omar',     lastName: 'Haddad',    cin: 'KL678901', email: 'o.haddad@iav.ac.ma',    phoneNumber: '0667890123', departmentId: 5, filiereId: 6, roleId: 3, gradeId: 3, createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[4], filiere: FILIERES[5], role: TEACHER_ROLES[2], grade: TEACHER_GRADES[2], taughtClasses: [] },
  { id:  8, firstName: 'Rachida',  lastName: 'Idrissi',   cin: 'MN890123', email: 'r.idrissi@iav.ac.ma',   phoneNumber: '0668901234', departmentId: 1, filiereId: 1, roleId: 4, gradeId: 4, createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[0], filiere: FILIERES[0], role: TEACHER_ROLES[3], grade: TEACHER_GRADES[3], taughtClasses: [] },
  { id:  9, firstName: 'Karim',    lastName: 'Jalal',     cin: 'OP012345', email: 'k.jalal@iav.ac.ma',     phoneNumber: '0669012345', departmentId: 2, filiereId: 5, roleId: 3, gradeId: 3, createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[1], filiere: FILIERES[4], role: TEACHER_ROLES[2], grade: TEACHER_GRADES[2], taughtClasses: [] },
  { id: 10, firstName: 'Souad',    lastName: 'Khattabi',  cin: 'QR234567', email: 's.khattabi@iav.ac.ma',  phoneNumber: '0660123456', departmentId: 3, filiereId: 2, roleId: 2, gradeId: 2, createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[2], filiere: FILIERES[1], role: TEACHER_ROLES[1], grade: TEACHER_GRADES[1], taughtClasses: [] },
  { id: 11, firstName: 'Zineb',    lastName: 'Lahlou',    cin: 'ST345678', email: 'z.lahlou@iav.ac.ma',    phoneNumber: '0661230001', departmentId: 1, filiereId: 1, roleId: 3, gradeId: 3, createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[0], filiere: FILIERES[0], role: TEACHER_ROLES[2], grade: TEACHER_GRADES[2], taughtClasses: [] },
  { id: 12, firstName: 'Ayoub',    lastName: 'Mansouri',  cin: 'UV567890', email: 'a.mansouri@iav.ac.ma',  phoneNumber: '0661230002', departmentId: 5, filiereId: 7, roleId: 2, gradeId: 2, createdAt: NOW, updatedAt: NOW, department: DEPARTMENTS[4], filiere: FILIERES[6], role: TEACHER_ROLES[1], grade: TEACHER_GRADES[1], taughtClasses: [] },
];

// ── Rooms ─────────────────────────────────────────────────────────────────────

const ROOMS = [
  { id:  1, name: 'Amphithéâtre A',           departmentId: 1, department: { id: 1, name: 'Agronomie et Biotechnologies' },    capacity: 200, availability: true,  equipment: ['projecteur', 'micro', 'tableau blanc'] },
  { id:  2, name: 'Amphithéâtre B',           departmentId: 1, department: { id: 1, name: 'Agronomie et Biotechnologies' },    capacity: 150, availability: true,  equipment: ['projecteur', 'micro'] },
  { id:  3, name: 'Salle 101',                departmentId: 3, department: { id: 3, name: 'Génie Rural, Eaux et Forêts' },     capacity:  40, availability: true,  equipment: ['tableau blanc', 'vidéoprojecteur'] },
  { id:  4, name: 'Salle 102',                departmentId: 3, department: { id: 3, name: 'Génie Rural, Eaux et Forêts' },     capacity:  40, availability: true,  equipment: ['tableau blanc'] },
  { id:  5, name: 'Salle 103',                departmentId: 4, department: { id: 4, name: 'Horticulture et Viticulture' },     capacity:  35, availability: true,  equipment: ['tableau blanc', 'vidéoprojecteur'] },
  { id:  6, name: 'Salle 201',                departmentId: 4, department: { id: 4, name: 'Horticulture et Viticulture' },     capacity:  30, availability: true,  equipment: ['tableau blanc'] },
  { id:  7, name: 'Laboratoire Informatique', departmentId: 1, department: { id: 1, name: 'Agronomie et Biotechnologies' },    capacity:  25, availability: true,  equipment: ['ordinateurs', 'vidéoprojecteur'] },
  { id:  8, name: 'Laboratoire Sciences Sol', departmentId: 2, department: { id: 2, name: 'Sciences Vétérinaires' },           capacity:  20, availability: true,  equipment: ['paillasses', 'hotte'] },
  { id:  9, name: 'Salle de Conférences',     departmentId: 5, department: { id: 5, name: 'Économie et Développement Rural' }, capacity:  60, availability: true,  equipment: ['écran', 'micro', 'visioconférence'] },
  { id: 10, name: 'TP Biotechnologies',       departmentId: 1, department: { id: 1, name: 'Agronomie et Biotechnologies' },    capacity:  20, availability: false, equipment: ['PCR', 'microscopes', 'paillasses'] },
];

const ROOM_RESERVATIONS = [
  {
    id: 1,
    roomId: 1,
    classId: 1,
    date: '2026-04-06',
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '10:00',
    reservedBy: 'Pr. Alaoui',
    purpose: 'cours',
    notes: 'CM Agronomie IAG1',
    room: { id: 1, name: 'Amphithéâtre A', capacity: 200, availability: true },
  },
  {
    id: 2,
    roomId: 1,
    classId: 2,
    date: '2026-04-08',
    dayOfWeek: 3,
    startTime: '14:00',
    endTime: '16:00',
    reservedBy: 'Secrétariat DEAA',
    purpose: 'examen',
    notes: 'Examen partiel IAG2',
    room: { id: 1, name: 'Amphithéâtre A', capacity: 200, availability: true },
  },
  {
    id: 3,
    roomId: 3,
    classId: 4,
    date: '2026-04-07',
    dayOfWeek: 2,
    startTime: '10:00',
    endTime: '12:00',
    reservedBy: 'Direction pédagogique',
    purpose: 'reunion',
    notes: 'Réunion coordination semestre',
    room: { id: 3, name: 'Salle 101', capacity: 40, availability: true },
  },
  {
    id: 4,
    roomId: 7,
    classId: null,
    date: '2026-04-10',
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '11:00',
    reservedBy: 'Lab informatique',
    purpose: 'autre',
    notes: 'Maintenance équipements',
    room: { id: 7, name: 'Laboratoire Informatique', capacity: 25, availability: true },
  },
];

// ── Classes ───────────────────────────────────────────────────────────────────

const CLASSES = [
  { id:  1, name: 'IAG1',  year: 1, filiereId: 1, optionId: null, cycleId: 1, cycle: CYCLES[0], filiere: { id: 1, name: 'Ingénieur Agronome Général', code: 'IAG', department: { id: 1, name: 'Agronomie et Biotechnologies' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 52, teachers: 6, cours: 8 } },
  { id:  2, name: 'IAG2',  year: 2, filiereId: 1, optionId: null, cycleId: 1, cycle: CYCLES[0], filiere: { id: 1, name: 'Ingénieur Agronome Général', code: 'IAG', department: { id: 1, name: 'Agronomie et Biotechnologies' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 48, teachers: 6, cours: 8 } },
  { id:  3, name: 'IAG3-PP', year: 3, filiereId: 1, optionId: 2, cycleId: 1, cycle: CYCLES[0], filiere: { id: 1, name: 'Ingénieur Agronome Général', code: 'IAG', department: { id: 1, name: 'Agronomie et Biotechnologies' } }, academicOption: { id: 2, name: 'Protection des cultures' }, createdAt: NOW, updatedAt: NOW, _count: { students: 50, teachers: 7, cours: 10 } },
  { id:  4, name: 'IEF1',  year: 1, filiereId: 2, optionId: null, cycleId: 1, cycle: CYCLES[0], filiere: { id: 2, name: "Ingénieur des Eaux et Forêts", code: 'IEF', department: { id: 3, name: 'Génie Rural, Eaux et Forêts' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 30, teachers: 5, cours: 7 } },
  { id:  5, name: 'IEF2',  year: 2, filiereId: 2, optionId: null, cycleId: 1, cycle: CYCLES[0], filiere: { id: 2, name: "Ingénieur des Eaux et Forêts", code: 'IEF', department: { id: 3, name: 'Génie Rural, Eaux et Forêts' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 32, teachers: 5, cours: 7 } },
  { id:  6, name: 'IEF3-GF', year: 3, filiereId: 2, optionId: 3, cycleId: 1, cycle: CYCLES[0], filiere: { id: 2, name: "Ingénieur des Eaux et Forêts", code: 'IEF', department: { id: 3, name: 'Génie Rural, Eaux et Forêts' } }, academicOption: { id: 3, name: 'Gestion forestière' }, createdAt: NOW, updatedAt: NOW, _count: { students: 28, teachers: 5, cours: 9 } },
  { id:  7, name: 'IGR1',  year: 1, filiereId: 3, optionId: null, cycleId: 1, cycle: CYCLES[0], filiere: { id: 3, name: 'Ingénieur en Génie Rural', code: 'IGR', department: { id: 3, name: 'Génie Rural, Eaux et Forêts' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 30, teachers: 4, cours: 6 } },
  { id:  8, name: 'IGR2-HA', year: 2, filiereId: 3, optionId: 4, cycleId: 1, cycle: CYCLES[0], filiere: { id: 3, name: 'Ingénieur en Génie Rural', code: 'IGR', department: { id: 3, name: 'Génie Rural, Eaux et Forêts' } }, academicOption: { id: 4, name: 'Hydraulique agricole' }, createdAt: NOW, updatedAt: NOW, _count: { students: 30, teachers: 4, cours: 6 } },
  { id:  9, name: 'IH1',   year: 1, filiereId: 4, optionId: null, cycleId: 1, cycle: CYCLES[0], filiere: { id: 4, name: 'Ingénieur en Horticulture', code: 'IH', department: { id: 4, name: 'Horticulture et Viticulture' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 25, teachers: 4, cours: 6 } },
  { id: 10, name: 'MV1',   year: 1, filiereId: 5, optionId: null, cycleId: 2, cycle: CYCLES[1], filiere: { id: 5, name: 'Médecin Vétérinaire', code: 'MV', department: { id: 2, name: 'Sciences Vétérinaires' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 40, teachers: 6, cours: 8 } },
  { id: 11, name: 'MV2',   year: 2, filiereId: 5, optionId: null, cycleId: 2, cycle: CYCLES[1], filiere: { id: 5, name: 'Médecin Vétérinaire', code: 'MV', department: { id: 2, name: 'Sciences Vétérinaires' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 42, teachers: 6, cours: 8 } },
  { id: 12, name: 'MV3',   year: 3, filiereId: 5, optionId: null, cycleId: 2, cycle: CYCLES[1], filiere: { id: 5, name: 'Médecin Vétérinaire', code: 'MV', department: { id: 2, name: 'Sciences Vétérinaires' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 38, teachers: 6, cours: 9 } },
  { id: 13, name: 'MAED1', year: 1, filiereId: 6, optionId: null, cycleId: 3, cycle: CYCLES[2], filiere: { id: 6, name: 'Master Agroéconomie et Dev. Rural', code: 'MAED', department: { id: 5, name: 'Économie et Développement Rural' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 20, teachers: 4, cours: 6 } },
  { id: 14, name: 'MAED2-ECO', year: 2, filiereId: 6, optionId: 5, cycleId: 3, cycle: CYCLES[2], filiere: { id: 6, name: 'Master Agroéconomie et Dev. Rural', code: 'MAED', department: { id: 5, name: 'Économie et Développement Rural' } }, academicOption: { id: 5, name: 'Économie des filières' }, createdAt: NOW, updatedAt: NOW, _count: { students: 20, teachers: 4, cours: 6 } },
];

// ── Students ──────────────────────────────────────────────────────────────────

const FM = ['Mohammed', 'Youssef', 'Omar', 'Khalid', 'Amine', 'Ayoub', 'Hamza', 'Mehdi', 'Rachid', 'Bilal'];
const FF = ['Fatima', 'Laila', 'Nadia', 'Sara', 'Zineb', 'Hind', 'Meryem', 'Salma', 'Imane', 'Hajar'];
const FL = ['Alaoui', 'Benali', 'Chakroun', 'Drissi', 'Fennich', 'Guennoun', 'Haddad', 'Idrissi', 'Jalal', 'Khattabi', 'Lahlou', 'Mansouri', 'Naji', 'Ouali', 'Raji', 'Saoudi'];

const STUDENTS = (() => {
  const list = [];
  let id = 1;
  for (const cls of CLASSES) {
    const count = Math.min(cls._count.students, 8);
    for (let i = 0; i < count; i++) {
      const female = i % 2 === 1;
      const fn = (female ? FF : FM)[i % 10];
      const ln = FL[(id * 3) % FL.length];
      list.push({
        id,
        firstName: fn,
        lastName: ln,
        fullName: `${fn} ${ln}`,
        sex: female ? 'female' : 'male',
        cin: `AA${String(100000 + id).slice(-5)}`,
        codeMassar: `K${String(13000000 + id).slice(-8)}`,
        dateNaissance: `${2000 + (id % 5)}-${String((id % 12) + 1).padStart(2, '0')}-15`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${id}@student.iav.ac.ma`,
        telephone: `0660${String(100000 + id).slice(-6)}`,
        cycle: cls.filiere.code.startsWith('M') ? 'master' : cls.filiere.code === 'MV' ? 'veterinary' : 'engineer',
        filiereId: cls.filiereId,
        classId: cls.id,
        firstYearEntry: 2022 + (cls.year > 2 ? 0 : 1),
        anneeAcademique: '2024-2025',
        dateInscription: '2024-09-01T00:00:00.000Z',
        createdAt: NOW, updatedAt: NOW,
        filiere: cls.filiere ? { id: cls.filiere.id, name: cls.filiere.name } : null,
        class: { id: cls.id, name: cls.name, year: cls.year },
        classHistories: [{ id, academicYear: '2024-2025', studyYear: cls.year, academicClass: { id: cls.id, name: cls.name, year: cls.year } }],
      });
      id++;
    }
  }
  return list;
})();

// ── Element Modules ───────────────────────────────────────────────────────────

const MOD = [
  { id: 1, name: 'Sciences Biologiques'      },
  { id: 2, name: 'Chimie'                    },
  { id: 3, name: 'Physique et Mathématiques' },
  { id: 4, name: 'Informatique Agricole'     },
  { id: 5, name: 'Agronomie Générale'        },
  { id: 6, name: 'Économie Rurale'           },
];

const ELEMENTS = [
  { id:  1, name: 'Biologie Végétale',        type: 'CM', volumeHoraire: 30, moduleId: 1, module: MOD[0] },
  { id:  2, name: 'Biologie Végétale',        type: 'TD', volumeHoraire: 15, moduleId: 1, module: MOD[0] },
  { id:  3, name: 'Biologie Végétale',        type: 'TP', volumeHoraire: 15, moduleId: 1, module: MOD[0] },
  { id:  4, name: 'Chimie Organique',         type: 'CM', volumeHoraire: 30, moduleId: 2, module: MOD[1] },
  { id:  5, name: 'Chimie Organique',         type: 'TD', volumeHoraire: 15, moduleId: 2, module: MOD[1] },
  { id:  6, name: 'Physique des Matériaux',   type: 'CM', volumeHoraire: 30, moduleId: 3, module: MOD[2] },
  { id:  7, name: 'Mathématiques Appliquées', type: 'CM', volumeHoraire: 30, moduleId: 3, module: MOD[2] },
  { id:  8, name: 'Mathématiques Appliquées', type: 'TD', volumeHoraire: 15, moduleId: 3, module: MOD[2] },
  { id:  9, name: 'Informatique Agricole',    type: 'CM', volumeHoraire: 20, moduleId: 4, module: MOD[3] },
  { id: 10, name: 'Informatique Agricole',    type: 'TP', volumeHoraire: 20, moduleId: 4, module: MOD[3] },
  { id: 11, name: 'Agronomie de Base',        type: 'CM', volumeHoraire: 40, moduleId: 5, module: MOD[4] },
  { id: 12, name: 'Agronomie de Base',        type: 'TD', volumeHoraire: 20, moduleId: 5, module: MOD[4] },
  { id: 13, name: 'Économie Agricole',        type: 'CM', volumeHoraire: 30, moduleId: 6, module: MOD[5] },
];

function findClass(classId: number) {
  return CLASSES.find((cls) => cls.id === classId) ?? CLASSES[0];
}

function findTeacher(teacherId: number) {
  return TEACHERS.find((teacher) => teacher.id === teacherId) ?? TEACHERS[0];
}

function mapModuleClasses(classIds: number[]) {
  return classIds.map((classId) => {
    const cls = findClass(classId);
    return { class: { id: cls.id, name: cls.name, year: cls.year } };
  });
}

const ACADEMIC_MODULES = [
  {
    id: 1,
    name: 'Sciences Biologiques',
    semestre: 'S1',
    filiereId: 1,
    optionId: null,
    filiere: { id: FILIERES[0].id, name: FILIERES[0].name },
    option: null,
    classes: mapModuleClasses([1, 2, 3]),
    _count: { elements: 3 },
  },
  {
    id: 2,
    name: 'Chimie',
    semestre: 'S1',
    filiereId: 1,
    optionId: null,
    filiere: { id: FILIERES[0].id, name: FILIERES[0].name },
    option: null,
    classes: mapModuleClasses([1, 2, 3]),
    _count: { elements: 2 },
  },
  {
    id: 3,
    name: 'Physique et Mathématiques',
    semestre: 'S2',
    filiereId: 2,
    optionId: 3,
    filiere: { id: FILIERES[1].id, name: FILIERES[1].name },
    option: { id: OPTIONS[2].id, name: OPTIONS[2].name },
    classes: mapModuleClasses([4, 5, 6]),
    _count: { elements: 3 },
  },
  {
    id: 4,
    name: 'Informatique Agricole',
    semestre: 'S2',
    filiereId: 3,
    optionId: 4,
    filiere: { id: FILIERES[2].id, name: FILIERES[2].name },
    option: { id: OPTIONS[3].id, name: OPTIONS[3].name },
    classes: mapModuleClasses([7, 8]),
    _count: { elements: 2 },
  },
  {
    id: 5,
    name: 'Agronomie Générale',
    semestre: 'S3',
    filiereId: 4,
    optionId: null,
    filiere: { id: FILIERES[3].id, name: FILIERES[3].name },
    option: null,
    classes: mapModuleClasses([3, 9]),
    _count: { elements: 2 },
  },
  {
    id: 6,
    name: 'Économie Rurale',
    semestre: 'S3',
    filiereId: 6,
    optionId: 5,
    filiere: { id: FILIERES[5].id, name: FILIERES[5].name },
    option: { id: OPTIONS[4].id, name: OPTIONS[4].name },
    classes: mapModuleClasses([13, 14]),
    _count: { elements: 1 },
  },
];

const COURS = [
  ...ELEMENTS.map((element) => ({
    id: element.id,
    name: `${element.name} ${element.type}`,
    type: element.type,
    elementModuleId: element.id,
    elementModule: {
      id: element.id,
      name: element.name,
      type: element.type,
      volumeHoraire: element.volumeHoraire,
    },
    _count: { classes: element.moduleId <= 2 ? 3 : 2 },
  })),
  {
    id: 101,
    name: 'Séminaire innovation agricole',
    type: 'CM',
    elementModuleId: null,
    elementModule: null,
    _count: { classes: 1 },
  },
];

function findCours(coursId: number) {
  return COURS.find((cours) => cours.id === coursId) ?? COURS[0];
}

function makeCoursAssignment(
  id: number,
  coursId: number,
  classId: number,
  teacherId: number | null,
  groupLabel: string | null = null,
  createdAt = NOW,
) {
  const cours = findCours(coursId);
  const cls = findClass(classId);
  const teacher = teacherId ? findTeacher(teacherId) : null;

  return {
    id,
    coursId,
    classId,
    teacherId,
    groupLabel,
    createdAt,
    cours: {
      id: cours.id,
      name: cours.name,
      type: cours.type,
      elementModuleId: cours.elementModuleId,
    },
    teacher: teacher
      ? { id: teacher.id, firstName: teacher.firstName, lastName: teacher.lastName }
      : null,
    class: {
      id: cls.id,
      name: cls.name,
      year: cls.year,
      filiere: cls.filiere ? { id: cls.filiere.id, name: cls.filiere.name } : null,
    },
  };
}

const COURS_ASSIGNMENTS = [
  makeCoursAssignment(1, 1, 1, 1),
  makeCoursAssignment(2, 2, 1, 2, 'Groupe A'),
  makeCoursAssignment(3, 3, 1, 8, 'Groupe B'),
  makeCoursAssignment(4, 4, 2, 2),
  makeCoursAssignment(5, 5, 2, 11, 'Groupe A'),
  makeCoursAssignment(6, 7, 3, 1),
  makeCoursAssignment(7, 11, 3, 4),
  makeCoursAssignment(8, 6, 4, 4),
  makeCoursAssignment(9, 7, 4, 10),
  makeCoursAssignment(10, 9, 7, 5),
  makeCoursAssignment(11, 10, 7, 5, 'TP-1'),
  makeCoursAssignment(12, 13, 13, 7),
  makeCoursAssignment(13, 13, 14, 12),
  makeCoursAssignment(14, 101, 14, 7),
  makeCoursAssignment(15, 1, 10, 3),
  makeCoursAssignment(16, 4, 10, 9),
];

const DOCUMENTS = [
  { id: 1, name: 'Relevé S1 - Mohammed Drissi.pdf', mimeType: 'application/pdf', studentId: 1, student: { fullName: STUDENTS[0].fullName } },
  { id: 2, name: 'Attestation d’inscription - Fatima Haddad.pdf', mimeType: 'application/pdf', studentId: 2, student: { fullName: STUDENTS[1].fullName } },
  { id: 3, name: 'Diplôme - Omar Khattabi.pdf', mimeType: 'application/pdf', studentId: 9, student: { fullName: STUDENTS[8].fullName } },
  { id: 4, name: 'Stage PFE - Zineb Mansouri.pdf', mimeType: 'application/pdf', studentId: 14, student: { fullName: STUDENTS[13].fullName } },
  { id: 5, name: 'Photo identité - Sara Jalal.jpg', mimeType: 'image/jpeg', studentId: 6, student: { fullName: STUDENTS[5].fullName } },
];

const LAUREATES = [
  {
    id: 1,
    studentId: STUDENTS[8].id,
    graduationYear: 2024,
    diplomaStatus: 'retrieved',
    proofDocumentId: 3,
    student: {
      fullName: STUDENTS[8].fullName,
      filiere: STUDENTS[8].filiere,
    },
  },
  {
    id: 2,
    studentId: STUDENTS[13].id,
    graduationYear: 2024,
    diplomaStatus: 'not_retrieved',
    proofDocumentId: 4,
    student: {
      fullName: STUDENTS[13].fullName,
      filiere: STUDENTS[13].filiere,
    },
  },
  {
    id: 3,
    studentId: STUDENTS[21].id,
    graduationYear: 2023,
    diplomaStatus: 'retrieved',
    proofDocumentId: null,
    student: {
      fullName: STUDENTS[21].fullName,
      filiere: STUDENTS[21].filiere,
    },
  },
];

const WORKFLOWS = [
  { id: 1, title: 'Validation de diplôme MAED2', description: 'Contrôler les pièces justificatives avant impression', status: 'pending', assignedToId: 1, studentId: STUDENTS[13].id },
  { id: 2, title: 'Suivi transfert IAG1 vers IAG2', description: 'Vérifier les notes et la régularité administrative', status: 'in_progress', assignedToId: 2, studentId: STUDENTS[0].id },
  { id: 3, title: 'Clôture dossier de soutenance', description: 'Archiver le PV et notifier la filière', status: 'completed', assignedToId: 1, studentId: STUDENTS[8].id },
  { id: 4, title: 'Préparer la campagne d’inscription 2026', description: 'Mettre à jour les modèles de documents', status: 'pending', assignedToId: 2, studentId: null },
];

const ACCREDITATION_PLANS = [
  { id: 1, name: 'Accréditation IAG 2024-2025', academicYear: '2024-2025', status: 'published', _count: { lines: 42, classAssignments: 3, derivedPlans: 1 } },
  { id: 2, name: 'Accréditation IEF 2024-2025', academicYear: '2024-2025', status: 'published', _count: { lines: 28, classAssignments: 3, derivedPlans: 0 } },
  { id: 3, name: 'Accréditation MAED 2025-2026', academicYear: '2025-2026', status: 'draft', _count: { lines: 18, classAssignments: 1, derivedPlans: 0 } },
  { id: 4, name: 'Accréditation MV 2025-2026', academicYear: '2025-2026', status: 'archived', _count: { lines: 36, classAssignments: 2, derivedPlans: 2 } },
];

const ACCREDITATION_DIFFS: Record<number, unknown> = {
  1: {
    sourcePlan: null,
    added: [{ cours: { name: 'Biologie Végétale CM' } }, { cours: { name: 'Chimie Organique TD' } }],
    removed: [],
    changed: [],
  },
  2: {
    sourcePlan: { id: 1, name: 'Accréditation IAG 2024-2025', academicYear: '2024-2025' },
    added: [{ cours: { name: 'Gestion forestière appliquée' } }],
    removed: [{ cours: { name: 'Économie Agricole CM' } }],
    changed: [{ cours: { name: 'Mathématiques Appliquées CM' } }],
  },
  3: {
    sourcePlan: { id: 1, name: 'Accréditation IAG 2024-2025', academicYear: '2024-2025' },
    added: [{ cours: { name: 'Séminaire innovation agricole' } }],
    removed: [],
    changed: [{ cours: { name: 'Agronomie de Base CM' } }],
  },
  4: {
    sourcePlan: { id: 2, name: 'Accréditation IEF 2024-2025', academicYear: '2024-2025' },
    added: [],
    removed: [{ cours: { name: 'Physique des Matériaux CM' } }],
    changed: [{ cours: { name: 'Biologie Végétale TP' } }],
  },
};

const STUDENT_OBSERVATIONS: Record<number, Array<{ id: number; text: string; createdAt: string }>> = {
  1: [
    { id: 101, text: 'Très bonne progression en travaux pratiques, participation régulière.', createdAt: NOW },
    { id: 102, text: 'À accompagner davantage sur la partie chimie organique.', createdAt: NOW },
  ],
  9: [
    { id: 103, text: 'Dossier de diplomation complet et validé.', createdAt: NOW },
  ],
};

// ── Timetable ─────────────────────────────────────────────────────────────────

function makeTimetable(classId: number) {
  const cls = CLASSES.find((c) => c.id === classId) ?? CLASSES[0];
  return {
    sessions: [
      { id: 1, elementId: 1,  classId: cls.id, teacherId: 1, roomId: 3, dayOfWeek: 1, startTime: '08:00', endTime: '10:00', weekStart: null, element: { ...ELEMENTS[0]  }, class: { id: cls.id, name: cls.name, year: cls.year }, teacher: { id: 1, firstName: 'Mohammed', lastName: 'Alaoui'  }, room: { id: 3, name: 'Salle 101' } },
      { id: 2, elementId: 4,  classId: cls.id, teacherId: 2, roomId: 4, dayOfWeek: 1, startTime: '10:00', endTime: '12:00', weekStart: null, element: { ...ELEMENTS[3]  }, class: { id: cls.id, name: cls.name, year: cls.year }, teacher: { id: 2, firstName: 'Fatima',   lastName: 'Benali'  }, room: { id: 4, name: 'Salle 102' } },
      { id: 3, elementId: 9,  classId: cls.id, teacherId: 5, roomId: 7, dayOfWeek: 2, startTime: '08:00', endTime: '10:00', weekStart: null, element: { ...ELEMENTS[8]  }, class: { id: cls.id, name: cls.name, year: cls.year }, teacher: { id: 5, firstName: 'Hassan',   lastName: 'Fennich' }, room: { id: 7, name: 'Laboratoire Informatique' } },
      { id: 4, elementId: 7,  classId: cls.id, teacherId: 1, roomId: 1, dayOfWeek: 3, startTime: '14:00', endTime: '16:00', weekStart: null, element: { ...ELEMENTS[6]  }, class: { id: cls.id, name: cls.name, year: cls.year }, teacher: { id: 1, firstName: 'Mohammed', lastName: 'Alaoui'  }, room: { id: 1, name: 'Amphithéâtre A' } },
      { id: 5, elementId: 11, classId: cls.id, teacherId: 4, roomId: 3, dayOfWeek: 4, startTime: '10:00', endTime: '12:00', weekStart: null, element: { ...ELEMENTS[10] }, class: { id: cls.id, name: cls.name, year: cls.year }, teacher: { id: 4, firstName: 'Nadia',    lastName: 'Drissi'  }, room: { id: 3, name: 'Salle 101' } },
      { id: 6, elementId: 6,  classId: cls.id, teacherId: 3, roomId: 5, dayOfWeek: 5, startTime: '08:00', endTime: '10:00', weekStart: null, element: { ...ELEMENTS[5]  }, class: { id: cls.id, name: cls.name, year: cls.year }, teacher: { id: 3, firstName: 'Youssef',  lastName: 'Chakroun'}, room: { id: 5, name: 'Salle 103' } },
    ],
    conflicts: [],
  };
}

// ── Dashboard overview ────────────────────────────────────────────────────────

const OVERVIEW = {
  stats: {
    totalStudents: 590,
    teachersCount: 43,
    departmentsCount: 5,
    filieresCount: 7,
    classesCount: 14,
    dossiersCount: 12,
  },
  studentsPerFiliere: [
    { filiere: 'IAG',  total: 150 },
    { filiere: 'IEF',  total:  90 },
    { filiere: 'MV',   total: 200 },
    { filiere: 'IGR',  total:  60 },
    { filiere: 'IH',   total:  50 },
    { filiere: 'MAED', total:  40 },
  ],
  studentsPerCycle: [
    { cycle: 'engineer',   total: 350 },
    { cycle: 'veterinary', total: 200 },
    { cycle: 'master',     total:  40 },
  ],
  laureatesPerYear: [
    { year: 2020, total: 120 },
    { year: 2021, total: 132 },
    { year: 2022, total: 115 },
    { year: 2023, total: 145 },
    { year: 2024, total: 138 },
  ],
  recentActivity: [
    { id: 1, action: 'Import de 52 étudiants — IAG1',              timestamp: NOW, user: { id: 1, fullName: 'Admin DEAA',  role: 'admin' } },
    { id: 2, action: 'Planification emploi du temps — Semaine 14', timestamp: NOW, user: { id: 2, fullName: 'Secrétariat', role: 'staff' } },
    { id: 3, action: 'Création filière Master MGRN',               timestamp: NOW, user: { id: 1, fullName: 'Admin DEAA',  role: 'admin' } },
  ],
};

// ── Activity Logs ─────────────────────────────────────────────────────────────

const ACTIVITY_LOGS = [
  { id: 1, userId: 1, action: 'Connexion au système',                        timestamp: NOW, user: { fullName: 'Admin DEAA'  } },
  { id: 2, userId: 1, action: 'Import de 52 étudiants — IAG1',               timestamp: NOW, user: { fullName: 'Admin DEAA'  } },
  { id: 3, userId: 2, action: 'Modification emploi du temps IAG1',           timestamp: NOW, user: { fullName: 'Secrétariat' } },
  { id: 4, userId: 1, action: 'Création département Agronomie',              timestamp: NOW, user: { fullName: 'Admin DEAA'  } },
  { id: 5, userId: 2, action: 'Réservation Amphithéâtre A — Examen IAG1',   timestamp: NOW, user: { fullName: 'Secrétariat' } },
  { id: 6, userId: 2, action: 'Transfert 3 étudiants IAG1 → IAG2',          timestamp: NOW, user: { fullName: 'Secrétariat' } },
  { id: 7, userId: 1, action: 'Création filière Master MGRN',               timestamp: NOW, user: { fullName: 'Admin DEAA'  } },
  { id: 8, userId: 3, action: 'Consultation liste étudiants MV3',            timestamp: NOW, user: { fullName: 'Consultation'} },
];

// ── Users ─────────────────────────────────────────────────────────────────────

const USERS = [
  { id: 1, fullName: 'Admin DEAA',   email: 'admin@iav.ac.ma',          role: 'admin'  },
  { id: 2, fullName: 'Secrétariat',  email: 'secretariat@iav.ac.ma',    role: 'staff'  },
  { id: 3, fullName: 'Consultation', email: 'viewer@iav.ac.ma',         role: 'viewer' },
];

function buildStudentProfile(studentId: number) {
  const student = STUDENTS.find((item) => item.id === studentId);
  if (!student) return null;

  const cls = findClass(student.classId);
  const history = [
    {
      id: student.id * 10 + 1,
      academicYear: '2023-2024',
      studyYear: Math.max(1, cls.year - 1),
      academicClass: {
        id: cls.id,
        name: cls.name,
        year: Math.max(1, cls.year - 1),
      },
    },
    {
      id: student.id * 10 + 2,
      academicYear: student.anneeAcademique,
      studyYear: cls.year,
      academicClass: {
        id: cls.id,
        name: cls.name,
        year: cls.year,
      },
    },
  ];

  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    fullName: student.fullName,
    sex: student.sex,
    firstYearEntry: student.firstYearEntry,
    codeMassar: student.codeMassar,
    cin: student.cin,
    dateNaissance: student.dateNaissance,
    email: student.email,
    telephone: student.telephone,
    anneeAcademique: student.anneeAcademique,
    dateInscription: student.dateInscription,
    bacType: student.sex === 'female' ? 'Sciences mathématiques A' : 'Sciences physiques',
    filiere: student.filiere,
    academicClass: { id: cls.id, name: cls.name, year: cls.year },
    classHistory: history,
  };
}

function getStudentObservations(studentId: number) {
  return STUDENT_OBSERVATIONS[studentId] ?? [];
}

function getStudentNonLaureates(params?: Record<string, unknown>) {
  const laureateIds = new Set(LAUREATES.map((item) => item.studentId));
  const search = String(params?.search ?? '').trim().toLowerCase();

  return STUDENTS.filter((student) => !laureateIds.has(student.id))
    .filter((student) => {
      if (!search) return true;
      return (
        student.fullName.toLowerCase().includes(search) ||
        student.codeMassar.toLowerCase().includes(search)
      );
    })
    .slice(0, 20)
    .map((student) => ({
      id: student.id,
      fullName: student.fullName,
      codeMassar: student.codeMassar,
      filiere: student.filiere,
      academicClass: { name: student.class.name },
    }));
}

// ── URL matcher ───────────────────────────────────────────────────────────────

export function getMockResponse(
  url: string,
  params?: Record<string, unknown>,
  method = 'get',
): unknown {
  if (method.toLowerCase() !== 'get' && method.toLowerCase() !== 'head') {
    return null;
  }

  const u = (url ?? '').split('?')[0];

  if (u.includes('/dashboard/overview'))    return OVERVIEW;
  if (u.includes('/departments'))           return paginate(DEPARTMENTS, params);
  if (u.match(/\/filieres/) && !u.includes('element'))  return paginate(FILIERES, params);
  if (u.includes('/options'))               return paginate(OPTIONS, params);
  if (u.includes('/cycles'))                return CYCLES;
  if (u.match(/\/academic-modules/)) {
    const filiereId = Number(params?.filiereId ?? 0);
    const optionId = Number(params?.optionId ?? 0);
    const filtered = ACADEMIC_MODULES.filter((module) => {
      if (filiereId && module.filiereId !== filiereId) return false;
      if (optionId && module.optionId !== optionId) return false;
      return true;
    });
    return paginate(filtered, params);
  }
  if (u.match(/\/accreditations\/plans\/(\d+)\/diff/)) {
    const planId = Number(u.match(/\/accreditations\/plans\/(\d+)\/diff/)?.[1] ?? 1);
    return ACCREDITATION_DIFFS[planId] ?? ACCREDITATION_DIFFS[1];
  }
  if (u.includes('/accreditations/plans'))  return paginate(ACCREDITATION_PLANS, params);
  if (u.match(/\/teachers\/roles/))         return TEACHER_ROLES;
  if (u.match(/\/teachers\/grades/))        return TEACHER_GRADES;
  if (u.match(/\/teachers\/(\d+)\/cours/)) {
    const teacherId = Number(u.match(/\/teachers\/(\d+)\/cours/)?.[1] ?? 0);
    return COURS_ASSIGNMENTS
      .filter((assignment) => assignment.teacherId === teacherId)
      .map((assignment) => ({
        id: assignment.id,
        createdAt: assignment.createdAt,
        groupLabel: assignment.groupLabel,
        cours: assignment.cours,
        class: assignment.class,
      }));
  }
  if (u.match(/\/teachers\/(\d+)/)) {
    const teacherId = Number(u.match(/\/teachers\/(\d+)/)?.[1] ?? 0);
    const teacher = TEACHERS.find((item) => item.id === teacherId);
    if (!teacher) return null;
    return {
      ...teacher,
      dateInscription: '2021-09-01T00:00:00.000Z',
    };
  }
  if (u.includes('/teachers'))              return paginate(TEACHERS, params);
  if (u.match(/\/laureates\/non-laureates/)) return getStudentNonLaureates(params);
  if (u.includes('/laureates'))             return LAUREATES;
  if (u.includes('/documents'))             return DOCUMENTS;
  if (u.includes('/workflows'))             return WORKFLOWS;
  if (u.match(/\/students\/by-class\/(\d+)/)) {
    const id = Number(u.split('/by-class/')[1]);
    return STUDENTS.filter((s) => s.classId === id);
  }
  if (u.match(/\/students\/(\d+)\/observations/)) {
    const studentId = Number(u.match(/\/students\/(\d+)\/observations/)?.[1] ?? 0);
    return getStudentObservations(studentId);
  }
  if (u.match(/\/students\/(\d+)/)) {
    const studentId = Number(u.match(/\/students\/(\d+)/)?.[1] ?? 0);
    return buildStudentProfile(studentId);
  }
  if (u.includes('/students'))              return paginate(STUDENTS, params);
  if (u.match(/\/classes\/(\d+)\/cours/)) {
    const classId = Number(u.match(/\/classes\/(\d+)\/cours/)?.[1] ?? 0);
    return COURS_ASSIGNMENTS.filter((assignment) => assignment.classId === classId);
  }
  if (u.includes('/classes') && !u.includes('/cours')) return paginate(CLASSES, params);
  if (u.includes('/cours')) {
    const search = String(params?.search ?? '').trim().toLowerCase();
    const filtered = COURS.filter((cours) => !search || cours.name.toLowerCase().includes(search));
    return paginate(filtered, params);
  }
  if (u.includes('/element-modules')) {
    const moduleId = Number(params?.moduleId ?? 0);
    const filtered = ELEMENTS
      .filter((element) => !moduleId || element.moduleId === moduleId)
      .map((element) => ({
        ...element,
        _count: { sessions: COURS_ASSIGNMENTS.filter((assignment) => assignment.cours.elementModuleId === element.id).length },
      }));
    return paginate(filtered, params);
  }
  if (u.includes('/timetable/week')) {
    const id = Number((params as { classId?: string } | undefined)?.classId ?? 1);
    return makeTimetable(id);
  }
  if (u.includes('/room-reservations')) {
    const roomId = Number(params?.roomId ?? 0);
    const classId = Number(params?.classId ?? 0);
    const filiereId = Number(params?.filiereId ?? 0);
    const departmentId = Number(params?.departmentId ?? 0);
    const weekStart = String(params?.weekStart ?? '').trim();
    const date = String(params?.date ?? '').trim();

    let filtered = [...ROOM_RESERVATIONS];

    if (roomId) {
      filtered = filtered.filter((reservation) => reservation.roomId === roomId);
    }
    if (classId) {
      filtered = filtered.filter((reservation) => Number(reservation.classId ?? 0) === classId);
    }
    if (weekStart) {
      const weekDates = Array.from({ length: 5 }, (_, offset) => {
        const weekStartDate = new Date(`${weekStart}T00:00:00Z`);
        weekStartDate.setUTCDate(weekStartDate.getUTCDate() + offset);
        return weekStartDate.toISOString().slice(0, 10);
      });
      filtered = filtered.filter((reservation) => weekDates.includes(reservation.date));
    }
    if (date) {
      filtered = filtered.filter((reservation) => reservation.date === date);
    }

    const enriched = filtered
      .map((reservation) => {
        const academicClass = reservation.classId
          ? CLASSES.find((cls) => cls.id === reservation.classId) ?? null
          : null;
        return {
          ...reservation,
          academicClass: academicClass
            ? {
                id: academicClass.id,
                name: academicClass.name,
                year: academicClass.year,
                filiere: academicClass.filiere
                  ? {
                      id: academicClass.filiere.id,
                      name: academicClass.filiere.name,
                      code: academicClass.filiere.code,
                      department: academicClass.filiere.department,
                    }
                  : null,
              }
            : null,
        };
      })
      .filter((reservation) => {
        if (filiereId && reservation.academicClass?.filiere?.id !== filiereId) {
          return false;
        }
        if (
          departmentId &&
          reservation.academicClass?.filiere?.department?.id !== departmentId
        ) {
          return false;
        }
        return true;
      });

    return enriched;
  }
  if (u.includes('/rooms'))                 return ROOMS;
  if (u.includes('/activity-logs'))         return ACTIVITY_LOGS;
  if (u.includes('/users'))                 return USERS;
  if (u === '/')                            return { service: 'DEAA Hub API (Démo)', status: 'ok', timestamp: NOW };
  if (u.includes('/db-status'))             return { dbConnected: true, message: 'Mode démo actif', timestamp: NOW };

  return null;
}
