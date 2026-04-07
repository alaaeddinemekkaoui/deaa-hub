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

function paginate<T>(data: T[]) {
  return { data, meta: makeMeta(data.length) };
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
  { id:  1, name: 'Amphithéâtre A',           capacity: 200, availability: true,  equipment: ['projecteur', 'micro', 'tableau blanc'] },
  { id:  2, name: 'Amphithéâtre B',           capacity: 150, availability: true,  equipment: ['projecteur', 'micro'] },
  { id:  3, name: 'Salle 101',                capacity:  40, availability: true,  equipment: ['tableau blanc', 'vidéoprojecteur'] },
  { id:  4, name: 'Salle 102',                capacity:  40, availability: true,  equipment: ['tableau blanc'] },
  { id:  5, name: 'Salle 103',                capacity:  35, availability: true,  equipment: ['tableau blanc', 'vidéoprojecteur'] },
  { id:  6, name: 'Salle 201',                capacity:  30, availability: true,  equipment: ['tableau blanc'] },
  { id:  7, name: 'Laboratoire Informatique', capacity:  25, availability: true,  equipment: ['ordinateurs', 'vidéoprojecteur'] },
  { id:  8, name: 'Laboratoire Sciences Sol', capacity:  20, availability: true,  equipment: ['paillasses', 'hotte'] },
  { id:  9, name: 'Salle de Conférences',     capacity:  60, availability: true,  equipment: ['écran', 'micro', 'visioconférence'] },
  { id: 10, name: 'TP Biotechnologies',       capacity:  20, availability: false, equipment: ['PCR', 'microscopes', 'paillasses'] },
];

// ── Classes ───────────────────────────────────────────────────────────────────

const CLASSES = [
  { id:  1, name: 'IAG1',  year: 1, filiereId: 1, optionId: null, filiere: { id: 1, name: 'Ingénieur Agronome Général', code: 'IAG', department: { id: 1, name: 'Agronomie et Biotechnologies' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 52, teachers: 6, cours: 8 } },
  { id:  2, name: 'IAG2',  year: 2, filiereId: 1, optionId: null, filiere: { id: 1, name: 'Ingénieur Agronome Général', code: 'IAG', department: { id: 1, name: 'Agronomie et Biotechnologies' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 48, teachers: 6, cours: 8 } },
  { id:  3, name: 'IAG3',  year: 3, filiereId: 1, optionId: null, filiere: { id: 1, name: 'Ingénieur Agronome Général', code: 'IAG', department: { id: 1, name: 'Agronomie et Biotechnologies' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 50, teachers: 7, cours: 10 } },
  { id:  4, name: 'IEF1',  year: 1, filiereId: 2, optionId: null, filiere: { id: 2, name: "Ingénieur des Eaux et Forêts", code: 'IEF', department: { id: 3, name: 'Génie Rural, Eaux et Forêts' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 30, teachers: 5, cours: 7 } },
  { id:  5, name: 'IEF2',  year: 2, filiereId: 2, optionId: null, filiere: { id: 2, name: "Ingénieur des Eaux et Forêts", code: 'IEF', department: { id: 3, name: 'Génie Rural, Eaux et Forêts' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 32, teachers: 5, cours: 7 } },
  { id:  6, name: 'IEF3',  year: 3, filiereId: 2, optionId: null, filiere: { id: 2, name: "Ingénieur des Eaux et Forêts", code: 'IEF', department: { id: 3, name: 'Génie Rural, Eaux et Forêts' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 28, teachers: 5, cours: 9 } },
  { id:  7, name: 'IGR1',  year: 1, filiereId: 3, optionId: null, filiere: { id: 3, name: 'Ingénieur en Génie Rural', code: 'IGR', department: { id: 3, name: 'Génie Rural, Eaux et Forêts' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 30, teachers: 4, cours: 6 } },
  { id:  8, name: 'IGR2',  year: 2, filiereId: 3, optionId: null, filiere: { id: 3, name: 'Ingénieur en Génie Rural', code: 'IGR', department: { id: 3, name: 'Génie Rural, Eaux et Forêts' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 30, teachers: 4, cours: 6 } },
  { id:  9, name: 'IH1',   year: 1, filiereId: 4, optionId: null, filiere: { id: 4, name: 'Ingénieur en Horticulture', code: 'IH', department: { id: 4, name: 'Horticulture et Viticulture' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 25, teachers: 4, cours: 6 } },
  { id: 10, name: 'MV1',   year: 1, filiereId: 5, optionId: null, filiere: { id: 5, name: 'Médecin Vétérinaire', code: 'MV', department: { id: 2, name: 'Sciences Vétérinaires' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 40, teachers: 6, cours: 8 } },
  { id: 11, name: 'MV2',   year: 2, filiereId: 5, optionId: null, filiere: { id: 5, name: 'Médecin Vétérinaire', code: 'MV', department: { id: 2, name: 'Sciences Vétérinaires' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 42, teachers: 6, cours: 8 } },
  { id: 12, name: 'MV3',   year: 3, filiereId: 5, optionId: null, filiere: { id: 5, name: 'Médecin Vétérinaire', code: 'MV', department: { id: 2, name: 'Sciences Vétérinaires' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 38, teachers: 6, cours: 9 } },
  { id: 13, name: 'MAED1', year: 1, filiereId: 6, optionId: null, filiere: { id: 6, name: 'Master Agroéconomie et Dev. Rural', code: 'MAED', department: { id: 5, name: 'Économie et Développement Rural' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 20, teachers: 4, cours: 6 } },
  { id: 14, name: 'MAED2', year: 2, filiereId: 6, optionId: null, filiere: { id: 6, name: 'Master Agroéconomie et Dev. Rural', code: 'MAED', department: { id: 5, name: 'Économie et Développement Rural' } }, academicOption: null, createdAt: NOW, updatedAt: NOW, _count: { students: 20, teachers: 4, cours: 6 } },
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

// ── URL matcher ───────────────────────────────────────────────────────────────

export function getMockResponse(url: string, params?: Record<string, unknown>): unknown {
  const u = (url ?? '').split('?')[0];

  if (u.includes('/dashboard/overview'))    return OVERVIEW;
  if (u.includes('/departments'))           return paginate(DEPARTMENTS);
  if (u.match(/\/filieres/) && !u.includes('element'))  return paginate(FILIERES);
  if (u.match(/\/teachers\/roles/))         return TEACHER_ROLES;
  if (u.match(/\/teachers\/grades/))        return TEACHER_GRADES;
  if (u.includes('/teachers'))              return paginate(TEACHERS);
  if (u.match(/\/students\/by-class\/(\d+)/)) {
    const id = Number(u.split('/by-class/')[1]);
    return STUDENTS.filter((s) => s.classId === id);
  }
  if (u.includes('/students'))              return paginate(STUDENTS);
  if (u.includes('/classes') && !u.includes('/cours')) return paginate(CLASSES);
  if (u.includes('/element-modules'))       return paginate(ELEMENTS);
  if (u.includes('/timetable/week')) {
    const id = Number((params as { classId?: string } | undefined)?.classId ?? 1);
    return makeTimetable(id);
  }
  if (u.includes('/rooms'))                 return ROOMS;
  if (u.includes('/activity-logs'))         return ACTIVITY_LOGS;
  if (u.includes('/users'))                 return USERS;
  if (u === '/')                            return { service: 'DEAA Hub API (Démo)', status: 'ok', timestamp: NOW };
  if (u.includes('/db-status'))             return { dbConnected: true, message: 'Mode démo actif', timestamp: NOW };

  return null;
}
