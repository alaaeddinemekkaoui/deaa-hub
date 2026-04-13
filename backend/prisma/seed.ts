import {
  PrismaClient,
  UserRole,
  Sex,
  StudentCycle,
  PrepaYear,
  ElementType,
  DiplomaStatus,
  RoomReservationPurpose,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/** findFirst or create — for models without a unique name constraint */
async function findOrCreateModule(
  name: string,
  semestre: string | null,
  filiereId: number | null,
  optionId: number | null,
) {
  const found = await prisma.module.findFirst({
    where: { name, filiereId: filiereId ?? undefined, optionId: optionId ?? undefined },
  });
  if (found) return found;
  return prisma.module.create({
    data: { name, semestre, filiereId, optionId },
  });
}

async function findOrCreateElement(
  name: string,
  moduleId: number,
  classId: number | null,
  type: ElementType,
  volumeHoraire: number | null,
) {
  const found = await prisma.elementModule.findFirst({
    where: { name, moduleId, classId: classId ?? undefined },
  });
  if (found) return found;
  return prisma.elementModule.create({
    data: { name, moduleId, classId, type, volumeHoraire },
  });
}

function getCurrentWeekDate(dayOfWeek: number) {
  const today = new Date();
  const currentDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const currentDay = currentDate.getUTCDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  currentDate.setUTCDate(currentDate.getUTCDate() + mondayOffset + (dayOfWeek - 1));
  return currentDate.toISOString().slice(0, 10);
}

async function main() {
  // ─── Admin user ───────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin', 10);
  await prisma.user.upsert({
    where: { email: 'admin' },
    update: { fullName: 'DEAA Admin', passwordHash, role: UserRole.admin },
    create: { fullName: 'DEAA Admin', email: 'admin', passwordHash, role: UserRole.admin },
  });

  // ─── Departments ──────────────────────────────────────────────────────────
  const deptPrepa = await prisma.department.upsert({
    where: { name: 'Cycle Préparatoire (APESA)' },
    update: {},
    create: { name: 'Cycle Préparatoire (APESA)' },
  });
  const deptAgronomie = await prisma.department.upsert({
    where: { name: "Département d'Agronomie" },
    update: {},
    create: { name: "Département d'Agronomie" },
  });
  const deptHorticulture = await prisma.department.upsert({
    where: { name: "Département d'Horticulture et Viticulture" },
    update: {},
    create: { name: "Département d'Horticulture et Viticulture" },
  });
  const deptGenieRural = await prisma.department.upsert({
    where: { name: 'Département de Génie Rural, Eaux et Forêts' },
    update: {},
    create: { name: 'Département de Génie Rural, Eaux et Forêts' },
  });
  const deptIAA = await prisma.department.upsert({
    where: { name: 'Département des Industries Agricoles et Alimentaires' },
    update: {},
    create: { name: 'Département des Industries Agricoles et Alimentaires' },
  });
  const deptSGIT = await prisma.department.upsert({
    where: { name: 'Département des Sciences Géomatiques et Ingénierie Topographique' },
    update: {},
    create: { name: 'Département des Sciences Géomatiques et Ingénierie Topographique' },
  });
  const deptVeto = await prisma.department.upsert({
    where: { name: 'Département de Médecine Vétérinaire' },
    update: {},
    create: { name: 'Département de Médecine Vétérinaire' },
  });
  const deptSciencesBase = await prisma.department.upsert({
    where: { name: 'Département des Sciences de Base' },
    update: {},
    create: { name: 'Département des Sciences de Base' },
  });

  // ─── Cycles ───────────────────────────────────────────────────────────────
  const cyclePrepa = await prisma.cycle.upsert({
    where: { name: 'Cycle Préparatoire Intégré' },
    update: { code: 'APESA' },
    create: { name: 'Cycle Préparatoire Intégré', code: 'APESA' },
  });
  const cycleIng = await prisma.cycle.upsert({
    where: { name: 'Cycle Ingénieur' },
    update: { code: 'ING' },
    create: { name: 'Cycle Ingénieur', code: 'ING' },
  });
  const cycleVeto = await prisma.cycle.upsert({
    where: { name: 'Cycle Vétérinaire' },
    update: { code: 'VETO' },
    create: { name: 'Cycle Vétérinaire', code: 'VETO' },
  });
  const cycleMS = await prisma.cycle.upsert({
    where: { name: 'Mastère Spécialisé' },
    update: { code: 'MS' },
    create: { name: 'Mastère Spécialisé', code: 'MS' },
  });
  void cycleMS; // referenced for completeness

  // ─── Filières ─────────────────────────────────────────────────────────────
  const filiereAPESA = await prisma.filiere.upsert({
    where: { code: 'APESA' },
    update: { name: 'APESA', filiereType: 'prepa', departmentId: deptPrepa.id },
    create: { name: 'APESA', code: 'APESA', filiereType: 'prepa', departmentId: deptPrepa.id },
  });
  const filiereAgronomie = await prisma.filiere.upsert({
    where: { code: 'AGRONOMIE' },
    update: { name: 'Ingénieur Agronome', filiereType: 'engineer', departmentId: deptAgronomie.id },
    create: { name: 'Ingénieur Agronome', code: 'AGRONOMIE', filiereType: 'engineer', departmentId: deptAgronomie.id },
  });
  const filiereHorti = await prisma.filiere.upsert({
    where: { code: 'HORTI' },
    update: { name: 'Ingénieur Horticole', filiereType: 'engineer', departmentId: deptHorticulture.id },
    create: { name: 'Ingénieur Horticole', code: 'HORTI', filiereType: 'engineer', departmentId: deptHorticulture.id },
  });
  const filiereGR = await prisma.filiere.upsert({
    where: { code: 'GENIE-RURAL' },
    update: { name: 'Ingénieur en Génie Rural', filiereType: 'engineer', departmentId: deptGenieRural.id },
    create: { name: 'Ingénieur en Génie Rural', code: 'GENIE-RURAL', filiereType: 'engineer', departmentId: deptGenieRural.id },
  });
  const filiereIAA = await prisma.filiere.upsert({
    where: { code: 'IAA' },
    update: { name: 'Ingénieur en IAA', filiereType: 'engineer', departmentId: deptIAA.id },
    create: { name: 'Ingénieur en IAA', code: 'IAA', filiereType: 'engineer', departmentId: deptIAA.id },
  });
  const filiereSGIT = await prisma.filiere.upsert({
    where: { code: 'SGIT' },
    update: { name: 'Ingénieur SGIT', filiereType: 'engineer', departmentId: deptSGIT.id },
    create: { name: 'Ingénieur SGIT', code: 'SGIT', filiereType: 'engineer', departmentId: deptSGIT.id },
  });
  const filiereVeto = await prisma.filiere.upsert({
    where: { code: 'VETO' },
    update: { name: 'Docteur Vétérinaire', filiereType: 'veterinary', departmentId: deptVeto.id },
    create: { name: 'Docteur Vétérinaire', code: 'VETO', filiereType: 'veterinary', departmentId: deptVeto.id },
  });
  void filiereHorti;

  // ─── Options ──────────────────────────────────────────────────────────────
  const optPVPP = await prisma.option.upsert({
    where: { name_filiereId: { name: 'Productions Végétales et Protection des Plantes', filiereId: filiereAgronomie.id } },
    update: {},
    create: { name: 'Productions Végétales et Protection des Plantes', code: 'PVPP', filiereId: filiereAgronomie.id },
  });
  const optPIA = await prisma.option.upsert({
    where: { name_filiereId: { name: 'Productions et Industries Animales', filiereId: filiereAgronomie.id } },
    update: {},
    create: { name: 'Productions et Industries Animales', code: 'PIA', filiereId: filiereAgronomie.id },
  });
  const optEDR = await prisma.option.upsert({
    where: { name_filiereId: { name: 'Économie et Développement Rural', filiereId: filiereAgronomie.id } },
    update: {},
    create: { name: 'Économie et Développement Rural', code: 'EDR', filiereId: filiereAgronomie.id },
  });
  const optRNE = await prisma.option.upsert({
    where: { name_filiereId: { name: 'Ressources Naturelles et Environnement', filiereId: filiereAgronomie.id } },
    update: {},
    create: { name: 'Ressources Naturelles et Environnement', code: 'RNE', filiereId: filiereAgronomie.id },
  });
  const optHI = await prisma.option.upsert({
    where: { name_filiereId: { name: 'Hydraulique et Irrigation', filiereId: filiereGR.id } },
    update: {},
    create: { name: 'Hydraulique et Irrigation', code: 'HI', filiereId: filiereGR.id },
  });
  const optGEA = await prisma.option.upsert({
    where: { name_filiereId: { name: 'Génie des Équipements Agricoles', filiereId: filiereGR.id } },
    update: {},
    create: { name: 'Génie des Équipements Agricoles', code: 'GEA', filiereId: filiereGR.id },
  });
  const optTIA = await prisma.option.upsert({
    where: { name_filiereId: { name: 'Technologies des Industries Alimentaires', filiereId: filiereIAA.id } },
    update: {},
    create: { name: 'Technologies des Industries Alimentaires', code: 'TIA', filiereId: filiereIAA.id },
  });
  void optRNE; void optHI; void optGEA; void optTIA;

  // ─── Teacher Roles & Grades ───────────────────────────────────────────────
  const rolePermanent = await prisma.teacherRole.upsert({
    where: { name: 'Enseignant Permanent' }, update: {}, create: { name: 'Enseignant Permanent' },
  });
  const roleVacataire = await prisma.teacherRole.upsert({
    where: { name: 'Enseignant Vacataire' }, update: {}, create: { name: 'Enseignant Vacataire' },
  });
  const roleChefFiliere = await prisma.teacherRole.upsert({
    where: { name: 'Chef de Filière' }, update: {}, create: { name: 'Chef de Filière' },
  });
  const roleChefDept = await prisma.teacherRole.upsert({
    where: { name: 'Chef de Département' }, update: {}, create: { name: 'Chef de Département' },
  });

  const gradePES = await prisma.teacherGrade.upsert({
    where: { name: "Professeur de l'Enseignement Supérieur" }, update: {}, create: { name: "Professeur de l'Enseignement Supérieur" },
  });
  const gradePH = await prisma.teacherGrade.upsert({
    where: { name: 'Professeur Habilité' }, update: {}, create: { name: 'Professeur Habilité' },
  });
  const gradeMC = await prisma.teacherGrade.upsert({
    where: { name: 'Maître de Conférences' }, update: {}, create: { name: 'Maître de Conférences' },
  });
  const gradeMA = await prisma.teacherGrade.upsert({
    where: { name: 'Maître-Assistant' }, update: {}, create: { name: 'Maître-Assistant' },
  });
  const gradeDoctorant = await prisma.teacherGrade.upsert({
    where: { name: 'Doctorant-Enseignant' }, update: {}, create: { name: 'Doctorant-Enseignant' },
  });

  // ─── Classes ──────────────────────────────────────────────────────────────
  const upsertClass = async (
    name: string, year: number, filiereId: number, cycleId: number,
    classType: string, optionId?: number,
  ) =>
    prisma.academicClass.upsert({
      where: { name_year: { name, year } },
      update: { filiereId, cycleId, classType, optionId: optionId ?? null },
      create: { name, year, filiereId, cycleId, classType, optionId: optionId ?? null },
    });

  const classAPESA1 = await upsertClass('APESA 1', 1, filiereAPESA.id, cyclePrepa.id, 'prepa');
  const classAPESA2 = await upsertClass('APESA 2', 2, filiereAPESA.id, cyclePrepa.id, 'prepa');

  const classAgro1 = await upsertClass('Agronomie 1A', 1, filiereAgronomie.id, cycleIng.id, 'engineer-global');
  const classAgro2 = await upsertClass('Agronomie 2A', 2, filiereAgronomie.id, cycleIng.id, 'engineer-global');
  const classAgro3 = await upsertClass('Agronomie 3A', 3, filiereAgronomie.id, cycleIng.id, 'engineer-global');
  const classPVPP4 = await upsertClass('PVPP 4A', 4, filiereAgronomie.id, cycleIng.id, 'engineer-option', optPVPP.id);
  const classPVPP5 = await upsertClass('PVPP 5A', 5, filiereAgronomie.id, cycleIng.id, 'engineer-option', optPVPP.id);
  const classPIA4  = await upsertClass('PIA 4A',  4, filiereAgronomie.id, cycleIng.id, 'engineer-option', optPIA.id);
  const classEDR4  = await upsertClass('EDR 4A',  4, filiereAgronomie.id, cycleIng.id, 'engineer-option', optEDR.id);
  void classPVPP5; void classPIA4; void classEDR4;

  const classVeto1 = await upsertClass('Vétérinaire 1A', 1, filiereVeto.id, cycleVeto.id, 'veterinary');
  const classVeto2 = await upsertClass('Vétérinaire 2A', 2, filiereVeto.id, cycleVeto.id, 'veterinary');
  const classVeto3 = await upsertClass('Vétérinaire 3A', 3, filiereVeto.id, cycleVeto.id, 'veterinary');
  const classVeto4 = await upsertClass('Vétérinaire 4A', 4, filiereVeto.id, cycleVeto.id, 'veterinary');
  const classVeto5 = await upsertClass('Vétérinaire 5A', 5, filiereVeto.id, cycleVeto.id, 'veterinary');
  void classVeto3; void classVeto4; void classVeto5;

  const classGR1 = await upsertClass('Génie Rural 1A', 1, filiereGR.id, cycleIng.id, 'engineer-global');
  const classGR2 = await upsertClass('Génie Rural 2A', 2, filiereGR.id, cycleIng.id, 'engineer-global');
  const classIAA1 = await upsertClass('IAA 1A', 1, filiereIAA.id, cycleIng.id, 'engineer-global');
  const classSGIT1 = await upsertClass('SGIT 1A', 1, filiereSGIT.id, cycleIng.id, 'engineer-global');
  void classGR2; void classSGIT1;

  // ─── Rooms ────────────────────────────────────────────────────────────────
  const roomDefs = [
    { name: 'Amphi A', capacity: 300, equipment: { projecteur: true, climatisation: true, micro: true, enregistrement: true } },
    { name: 'Amphi B', capacity: 200, equipment: { projecteur: true, climatisation: true, micro: true } },
    { name: 'Amphi C', capacity: 120, equipment: { projecteur: true, climatisation: true } },
    { name: 'Salle 101', capacity: 45, equipment: { projecteur: true, tableau_blanc: true } },
    { name: 'Salle 102', capacity: 45, equipment: { projecteur: true, tableau_blanc: true } },
    { name: 'Salle 201', capacity: 40, equipment: { projecteur: true, tableau_blanc: true } },
    { name: 'Salle 202', capacity: 40, equipment: { projecteur: true } },
    { name: 'Salle 301', capacity: 35, equipment: { projecteur: true } },
    { name: 'Labo Informatique 1', capacity: 30, equipment: { postes_informatiques: 30, projecteur: true, internet: true } },
    { name: 'Labo Informatique 2', capacity: 25, equipment: { postes_informatiques: 25, projecteur: true, internet: true } },
    { name: 'Labo Chimie A', capacity: 24, equipment: { hottes: 4, paillasses: 12, réactifs: true } },
    { name: 'Labo Chimie B', capacity: 20, equipment: { hottes: 2, paillasses: 10 } },
    { name: 'Labo Biologie', capacity: 24, equipment: { microscopes: 12, paillasses: 12 } },
    { name: 'Labo Agronomie', capacity: 20, equipment: { materiel_terrain: true, serres: true } },
    { name: 'Salle TP Vétérinaire', capacity: 20, equipment: { tables_dissection: 10, projecteur: true } },
    { name: 'Salle de Conférences', capacity: 80, equipment: { projecteur: true, visioconférence: true, climatisation: true } },
  ];
  for (const r of roomDefs) {
    await prisma.room.upsert({ where: { name: r.name }, update: r, create: r });
  }

  const upsertRoomReservation = async (
    roomName: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    reservedBy: string,
    purpose: RoomReservationPurpose,
    notes: string | null,
  ) => {
    const room = await prisma.room.findUnique({
      where: { name: roomName },
      select: { id: true },
    });

    if (!room) return;

    const date = getCurrentWeekDate(dayOfWeek);
    const existing = await prisma.roomReservation.findFirst({
      where: { roomId: room.id, date, startTime, endTime },
      select: { id: true },
    });

    if (existing) {
      await prisma.roomReservation.update({
        where: { id: existing.id },
        data: { reservedBy, purpose, notes, dayOfWeek },
      });
      return;
    }

    await prisma.roomReservation.create({
      data: {
        roomId: room.id,
        date,
        dayOfWeek,
        startTime,
        endTime,
        reservedBy,
        purpose,
        notes,
      },
    });
  };

  // ─── Teachers ─────────────────────────────────────────────────────────────
  type TeacherDef = {
    firstName: string; lastName: string; cin: string; email: string;
    phoneNumber: string; dateInscription: Date;
    departmentId: number; filiereId: number | null;
    roleId: number; gradeId: number;
  };
  const teacherDefs: TeacherDef[] = [
    { firstName: 'Mohammed', lastName: 'BENALI', cin: 'AA101010', email: 'mbenali@iav.ac.ma', phoneNumber: '+212661001001', dateInscription: new Date('2005-09-01'), departmentId: deptAgronomie.id, filiereId: filiereAgronomie.id, roleId: roleChefDept.id, gradeId: gradePES.id },
    { firstName: 'Fatima', lastName: 'EZZAHRAOUI', cin: 'BB202020', email: 'fezzahraoui@iav.ac.ma', phoneNumber: '+212662002002', dateInscription: new Date('2008-09-01'), departmentId: deptAgronomie.id, filiereId: filiereAgronomie.id, roleId: roleChefFiliere.id, gradeId: gradePES.id },
    { firstName: 'Ahmed', lastName: 'OUALI', cin: 'CC303030', email: 'aouali@iav.ac.ma', phoneNumber: '+212663003003', dateInscription: new Date('2003-09-01'), departmentId: deptVeto.id, filiereId: filiereVeto.id, roleId: roleChefDept.id, gradeId: gradePES.id },
    { firstName: 'Khadija', lastName: 'LAHLOU', cin: 'DD404040', email: 'klahlou@iav.ac.ma', phoneNumber: '+212664004004', dateInscription: new Date('2010-09-01'), departmentId: deptGenieRural.id, filiereId: filiereGR.id, roleId: roleChefFiliere.id, gradeId: gradePH.id },
    { firstName: 'Youssef', lastName: 'TAZI', cin: 'EE505050', email: 'ytazi@iav.ac.ma', phoneNumber: '+212665005005', dateInscription: new Date('2012-09-01'), departmentId: deptAgronomie.id, filiereId: null, roleId: rolePermanent.id, gradeId: gradeMC.id },
    { firstName: 'Nadia', lastName: 'CHERKAOUI', cin: 'FF606060', email: 'ncherkaoui@iav.ac.ma', phoneNumber: '+212666006006', dateInscription: new Date('2009-09-01'), departmentId: deptPrepa.id, filiereId: filiereAPESA.id, roleId: roleChefFiliere.id, gradeId: gradePH.id },
    { firstName: 'Hamid', lastName: 'SABRI', cin: 'GG707070', email: 'hsabri@iav.ac.ma', phoneNumber: '+212667007007', dateInscription: new Date('2014-09-01'), departmentId: deptIAA.id, filiereId: filiereIAA.id, roleId: rolePermanent.id, gradeId: gradeMC.id },
    { firstName: 'Omar', lastName: 'BELHAJ', cin: 'II909090', email: 'obelhaj@iav.ac.ma', phoneNumber: '+212669009009', dateInscription: new Date('2007-09-01'), departmentId: deptSGIT.id, filiereId: filiereSGIT.id, roleId: roleChefDept.id, gradeId: gradePES.id },
    { firstName: 'Aicha', lastName: 'RACHIDI', cin: 'JJ100100', email: 'arachidi@iav.ac.ma', phoneNumber: '+212660010010', dateInscription: new Date('2015-09-01'), departmentId: deptSciencesBase.id, filiereId: null, roleId: rolePermanent.id, gradeId: gradeMC.id },
    { firstName: 'Meriem', lastName: 'ALAOUI', cin: 'NN144144', email: 'malaoui@iav.ac.ma', phoneNumber: '+212674014014', dateInscription: new Date('2016-09-01'), departmentId: deptSciencesBase.id, filiereId: null, roleId: rolePermanent.id, gradeId: gradeMC.id },
    // Vacataires
    { firstName: 'Karim', lastName: 'IDRISSI', cin: 'KK111111', email: 'kidrissi@iav.ac.ma', phoneNumber: '+212671011011', dateInscription: new Date('2022-09-01'), departmentId: deptAgronomie.id, filiereId: null, roleId: roleVacataire.id, gradeId: gradeDoctorant.id },
    { firstName: 'Sara', lastName: 'FENNICH', cin: 'LL122122', email: 'sfennich@iav.ac.ma', phoneNumber: '+212672012012', dateInscription: new Date('2021-09-01'), departmentId: deptVeto.id, filiereId: null, roleId: roleVacataire.id, gradeId: gradeMA.id },
    { firstName: 'Rachid', lastName: 'BENSOUDA', cin: 'MM133133', email: 'rbensouda@iav.ac.ma', phoneNumber: '+212673013013', dateInscription: new Date('2023-09-01'), departmentId: deptGenieRural.id, filiereId: null, roleId: roleVacataire.id, gradeId: gradeDoctorant.id },
    { firstName: 'Hassan', lastName: 'BENCHEKROUN', cin: 'OO155155', email: 'hbenchekroun@iav.ac.ma', phoneNumber: '+212675015015', dateInscription: new Date('2022-01-15'), departmentId: deptIAA.id, filiereId: null, roleId: roleVacataire.id, gradeId: gradeMA.id },
    { firstName: 'Zineb', lastName: 'MOUKHTARI', cin: 'HH808080', email: 'zmoukhtari@iav.ac.ma', phoneNumber: '+212668008008', dateInscription: new Date('2011-09-01'), departmentId: deptHorticulture.id, filiereId: filiereHorti.id, roleId: rolePermanent.id, gradeId: gradePH.id },
  ];

  const savedTeachers: Record<string, number> = {};
  for (const t of teacherDefs) {
    const saved = await prisma.teacher.upsert({ where: { cin: t.cin }, update: t, create: t });
    savedTeachers[t.cin] = saved.id;
  }

  // ─── Students ─────────────────────────────────────────────────────────────
  type StudentDef = {
    firstName: string; lastName: string; fullName: string;
    sex: Sex; cin: string; codeMassar: string;
    dateNaissance: Date; email: string; telephone: string;
    cycle: StudentCycle; prepaYear?: PrepaYear | null;
    prepaTrack?: string | null; entryLevel?: number | null;
    filiereId: number; classId: number;
    bacType: string; firstYearEntry: number; anneeAcademique: string;
  };

  const studentDefs: StudentDef[] = [
    // ── APESA 1 (6 students) ──────────────────────────────────────────────
    { firstName: 'Imane', lastName: 'BAKKALI', fullName: 'Imane BAKKALI', sex: Sex.female, cin: 'SA001001', codeMassar: 'A001001', dateNaissance: new Date('2005-03-12'), email: 's.bakkali@student.iav.ac.ma', telephone: '+212611110001', cycle: StudentCycle.prepa, prepaYear: PrepaYear.prepa_1, prepaTrack: 'Math-Physique', filiereId: filiereAPESA.id, classId: classAPESA1.id, bacType: 'Sciences Mathématiques A', firstYearEntry: 2024, anneeAcademique: '2024/2025' },
    { firstName: 'Yassine', lastName: 'ZIANI', fullName: 'Yassine ZIANI', sex: Sex.male, cin: 'SA002002', codeMassar: 'A002002', dateNaissance: new Date('2005-07-08'), email: 's.ziani@student.iav.ac.ma', telephone: '+212611110002', cycle: StudentCycle.prepa, prepaYear: PrepaYear.prepa_1, prepaTrack: 'Sciences Exp', filiereId: filiereAPESA.id, classId: classAPESA1.id, bacType: 'Sciences Physiques', firstYearEntry: 2024, anneeAcademique: '2024/2025' },
    { firstName: 'Hajar', lastName: 'BOUMZOUGH', fullName: 'Hajar BOUMZOUGH', sex: Sex.female, cin: 'SA003003', codeMassar: 'A003003', dateNaissance: new Date('2005-11-22'), email: 's.boumzough@student.iav.ac.ma', telephone: '+212611110003', cycle: StudentCycle.prepa, prepaYear: PrepaYear.prepa_1, prepaTrack: 'Sciences Exp', filiereId: filiereAPESA.id, classId: classAPESA1.id, bacType: 'Sciences de la Vie et de la Terre', firstYearEntry: 2024, anneeAcademique: '2024/2025' },
    { firstName: 'Amine', lastName: 'LAARABI', fullName: 'Amine LAARABI', sex: Sex.male, cin: 'SA004004', codeMassar: 'A004004', dateNaissance: new Date('2005-02-14'), email: 's.laarabi@student.iav.ac.ma', telephone: '+212611110004', cycle: StudentCycle.prepa, prepaYear: PrepaYear.prepa_1, prepaTrack: 'Math-Physique', filiereId: filiereAPESA.id, classId: classAPESA1.id, bacType: 'Sciences Mathématiques B', firstYearEntry: 2024, anneeAcademique: '2024/2025' },
    { firstName: 'Nour', lastName: 'ESSAIDI', fullName: 'Nour ESSAIDI', sex: Sex.female, cin: 'SA005005', codeMassar: 'A005005', dateNaissance: new Date('2006-05-30'), email: 's.essaidi@student.iav.ac.ma', telephone: '+212611110005', cycle: StudentCycle.prepa, prepaYear: PrepaYear.prepa_1, prepaTrack: 'Math-Physique', filiereId: filiereAPESA.id, classId: classAPESA1.id, bacType: 'Sciences Physiques', firstYearEntry: 2024, anneeAcademique: '2024/2025' },
    { firstName: 'Othmane', lastName: 'TLEMCANI', fullName: 'Othmane TLEMCANI', sex: Sex.male, cin: 'SA006006', codeMassar: 'A006006', dateNaissance: new Date('2005-09-17'), email: 's.tlemcani@student.iav.ac.ma', telephone: '+212611110006', cycle: StudentCycle.prepa, prepaYear: PrepaYear.prepa_1, prepaTrack: 'Sciences Exp', filiereId: filiereAPESA.id, classId: classAPESA1.id, bacType: 'Sciences Mathématiques A', firstYearEntry: 2024, anneeAcademique: '2024/2025' },

    // ── APESA 2 (5 students, came from APESA 1) ───────────────────────────
    { firstName: 'Rania', lastName: 'BOUCETTA', fullName: 'Rania BOUCETTA', sex: Sex.female, cin: 'SA007007', codeMassar: 'A007007', dateNaissance: new Date('2004-04-25'), email: 's.boucetta@student.iav.ac.ma', telephone: '+212611110007', cycle: StudentCycle.prepa, prepaYear: PrepaYear.prepa_2, prepaTrack: 'Math-Physique', filiereId: filiereAPESA.id, classId: classAPESA2.id, bacType: 'Sciences Mathématiques A', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Tariq', lastName: 'OUMIMOUN', fullName: 'Tariq OUMIMOUN', sex: Sex.male, cin: 'SA008008', codeMassar: 'A008008', dateNaissance: new Date('2004-08-11'), email: 's.oumimoun@student.iav.ac.ma', telephone: '+212611110008', cycle: StudentCycle.prepa, prepaYear: PrepaYear.prepa_2, prepaTrack: 'Sciences Exp', filiereId: filiereAPESA.id, classId: classAPESA2.id, bacType: 'Sciences Physiques', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Laila', lastName: 'AZIZ', fullName: 'Laila AZIZ', sex: Sex.female, cin: 'SA009009', codeMassar: 'A009009', dateNaissance: new Date('2004-12-03'), email: 's.aziz@student.iav.ac.ma', telephone: '+212611110009', cycle: StudentCycle.prepa, prepaYear: PrepaYear.prepa_2, prepaTrack: 'Sciences Exp', filiereId: filiereAPESA.id, classId: classAPESA2.id, bacType: 'Sciences de la Vie et de la Terre', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Khalid', lastName: 'DRIOUICH', fullName: 'Khalid DRIOUICH', sex: Sex.male, cin: 'SA010010', codeMassar: 'A010010', dateNaissance: new Date('2004-06-19'), email: 's.driouich@student.iav.ac.ma', telephone: '+212611110010', cycle: StudentCycle.prepa, prepaYear: PrepaYear.prepa_2, prepaTrack: 'Math-Physique', filiereId: filiereAPESA.id, classId: classAPESA2.id, bacType: 'Sciences Mathématiques B', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Widad', lastName: 'LAMRANI', fullName: 'Widad LAMRANI', sex: Sex.female, cin: 'SA011011', codeMassar: 'A011011', dateNaissance: new Date('2004-01-28'), email: 's.lamrani@student.iav.ac.ma', telephone: '+212611110011', cycle: StudentCycle.prepa, prepaYear: PrepaYear.prepa_2, prepaTrack: 'Math-Physique', filiereId: filiereAPESA.id, classId: classAPESA2.id, bacType: 'Sciences Mathématiques A', firstYearEntry: 2023, anneeAcademique: '2024/2025' },

    // ── Agronomie 1A (5 students) ─────────────────────────────────────────
    { firstName: 'Mehdi', lastName: 'BERRADA', fullName: 'Mehdi BERRADA', sex: Sex.male, cin: 'SB001001', codeMassar: 'B001001', dateNaissance: new Date('2003-05-10'), email: 's.berrada@student.iav.ac.ma', telephone: '+212622220001', cycle: StudentCycle.engineer, entryLevel: 1, filiereId: filiereAgronomie.id, classId: classAgro1.id, bacType: 'Sciences Physiques', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Salma', lastName: 'KETTANI', fullName: 'Salma KETTANI', sex: Sex.female, cin: 'SB002002', codeMassar: 'B002002', dateNaissance: new Date('2003-09-23'), email: 's.kettani@student.iav.ac.ma', telephone: '+212622220002', cycle: StudentCycle.engineer, entryLevel: 1, filiereId: filiereAgronomie.id, classId: classAgro1.id, bacType: 'Sciences Mathématiques A', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Adil', lastName: 'MANSOURI', fullName: 'Adil MANSOURI', sex: Sex.male, cin: 'SB003003', codeMassar: 'B003003', dateNaissance: new Date('2003-02-07'), email: 's.mansouri@student.iav.ac.ma', telephone: '+212622220003', cycle: StudentCycle.engineer, entryLevel: 1, filiereId: filiereAgronomie.id, classId: classAgro1.id, bacType: 'Sciences Physiques', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Soukaina', lastName: 'HADDAD', fullName: 'Soukaina HADDAD', sex: Sex.female, cin: 'SB004004', codeMassar: 'B004004', dateNaissance: new Date('2003-11-15'), email: 's.haddad@student.iav.ac.ma', telephone: '+212622220004', cycle: StudentCycle.engineer, entryLevel: 1, filiereId: filiereAgronomie.id, classId: classAgro1.id, bacType: 'Sciences de la Vie et de la Terre', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Badr', lastName: 'ALAMI', fullName: 'Badr ALAMI', sex: Sex.male, cin: 'SB005005', codeMassar: 'B005005', dateNaissance: new Date('2003-07-04'), email: 's.alami@student.iav.ac.ma', telephone: '+212622220005', cycle: StudentCycle.engineer, entryLevel: 1, filiereId: filiereAgronomie.id, classId: classAgro1.id, bacType: 'Sciences Mathématiques B', firstYearEntry: 2023, anneeAcademique: '2024/2025' },

    // ── Agronomie 3A (4 students, 3 years of history) ─────────────────────
    { firstName: 'Mariam', lastName: 'BENKIRANE', fullName: 'Mariam BENKIRANE', sex: Sex.female, cin: 'SB006006', codeMassar: 'B006006', dateNaissance: new Date('2001-03-20'), email: 's.benkirane@student.iav.ac.ma', telephone: '+212622220006', cycle: StudentCycle.engineer, entryLevel: 3, filiereId: filiereAgronomie.id, classId: classAgro3.id, bacType: 'Sciences Mathématiques A', firstYearEntry: 2021, anneeAcademique: '2024/2025' },
    { firstName: 'Younes', lastName: 'FASSI', fullName: 'Younes FASSI', sex: Sex.male, cin: 'SB007007', codeMassar: 'B007007', dateNaissance: new Date('2001-06-14'), email: 's.fassi@student.iav.ac.ma', telephone: '+212622220007', cycle: StudentCycle.engineer, entryLevel: 3, filiereId: filiereAgronomie.id, classId: classAgro3.id, bacType: 'Sciences Physiques', firstYearEntry: 2021, anneeAcademique: '2024/2025' },
    { firstName: 'Samira', lastName: 'ZOUAOUI', fullName: 'Samira ZOUAOUI', sex: Sex.female, cin: 'SB008008', codeMassar: 'B008008', dateNaissance: new Date('2001-09-30'), email: 's.zouaoui@student.iav.ac.ma', telephone: '+212622220008', cycle: StudentCycle.engineer, entryLevel: 3, filiereId: filiereAgronomie.id, classId: classAgro3.id, bacType: 'Sciences Physiques', firstYearEntry: 2021, anneeAcademique: '2024/2025' },
    // SB009009 is redoublant (was in 2A twice before 3A)
    { firstName: 'Rachid', lastName: 'ELHILALI', fullName: 'Rachid ELHILALI', sex: Sex.male, cin: 'SB009009', codeMassar: 'B009009', dateNaissance: new Date('2001-12-05'), email: 's.elhilali@student.iav.ac.ma', telephone: '+212622220009', cycle: StudentCycle.engineer, entryLevel: 3, filiereId: filiereAgronomie.id, classId: classAgro3.id, bacType: 'Sciences Mathématiques B', firstYearEntry: 2020, anneeAcademique: '2024/2025' },

    // ── PVPP 4A (3 students, 4 years of history) ──────────────────────────
    { firstName: 'Ilham', lastName: 'SEBBAHI', fullName: 'Ilham SEBBAHI', sex: Sex.female, cin: 'SB010010', codeMassar: 'B010010', dateNaissance: new Date('2000-04-18'), email: 's.sebbahi@student.iav.ac.ma', telephone: '+212622220010', cycle: StudentCycle.engineer, entryLevel: 4, filiereId: filiereAgronomie.id, classId: classPVPP4.id, bacType: 'Sciences Mathématiques A', firstYearEntry: 2020, anneeAcademique: '2024/2025' },
    { firstName: 'Morad', lastName: 'GHANIMI', fullName: 'Morad GHANIMI', sex: Sex.male, cin: 'SB011011', codeMassar: 'B011011', dateNaissance: new Date('2000-07-22'), email: 's.ghanimi@student.iav.ac.ma', telephone: '+212622220011', cycle: StudentCycle.engineer, entryLevel: 4, filiereId: filiereAgronomie.id, classId: classPVPP4.id, bacType: 'Sciences Physiques', firstYearEntry: 2020, anneeAcademique: '2024/2025' },
    { firstName: 'Ihsane', lastName: 'BOUHLAL', fullName: 'Ihsane BOUHLAL', sex: Sex.female, cin: 'SB012012', codeMassar: 'B012012', dateNaissance: new Date('2000-11-09'), email: 's.bouhlal@student.iav.ac.ma', telephone: '+212622220012', cycle: StudentCycle.engineer, entryLevel: 4, filiereId: filiereAgronomie.id, classId: classPVPP4.id, bacType: 'Sciences de la Vie et de la Terre', firstYearEntry: 2020, anneeAcademique: '2024/2025' },

    // ── Vétérinaire 1A (4 students) ───────────────────────────────────────
    { firstName: 'Hind', lastName: 'OUADOUD', fullName: 'Hind OUADOUD', sex: Sex.female, cin: 'SC001001', codeMassar: 'C001001', dateNaissance: new Date('2003-01-16'), email: 's.ouadoud@student.iav.ac.ma', telephone: '+212633330001', cycle: StudentCycle.veterinary, entryLevel: 1, filiereId: filiereVeto.id, classId: classVeto1.id, bacType: 'Sciences Mathématiques A', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Jawad', lastName: 'BELKADI', fullName: 'Jawad BELKADI', sex: Sex.male, cin: 'SC002002', codeMassar: 'C002002', dateNaissance: new Date('2003-04-29'), email: 's.belkadi@student.iav.ac.ma', telephone: '+212633330002', cycle: StudentCycle.veterinary, entryLevel: 1, filiereId: filiereVeto.id, classId: classVeto1.id, bacType: 'Sciences Physiques', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Amina', lastName: 'ELQORTOBI', fullName: 'Amina ELQORTOBI', sex: Sex.female, cin: 'SC003003', codeMassar: 'C003003', dateNaissance: new Date('2003-08-13'), email: 's.elqortobi@student.iav.ac.ma', telephone: '+212633330003', cycle: StudentCycle.veterinary, entryLevel: 1, filiereId: filiereVeto.id, classId: classVeto1.id, bacType: 'Sciences Mathématiques B', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Saad', lastName: 'MEKKI', fullName: 'Saad MEKKI', sex: Sex.male, cin: 'SC004004', codeMassar: 'C004004', dateNaissance: new Date('2003-11-26'), email: 's.mekki@student.iav.ac.ma', telephone: '+212633330004', cycle: StudentCycle.veterinary, entryLevel: 1, filiereId: filiereVeto.id, classId: classVeto1.id, bacType: 'Sciences de la Vie et de la Terre', firstYearEntry: 2023, anneeAcademique: '2024/2025' },

    // ── Vétérinaire 2A (3 students) ───────────────────────────────────────
    { firstName: 'Kaoutar', lastName: 'BARGACH', fullName: 'Kaoutar BARGACH', sex: Sex.female, cin: 'SC005005', codeMassar: 'C005005', dateNaissance: new Date('2002-02-08'), email: 's.bargach@student.iav.ac.ma', telephone: '+212633330005', cycle: StudentCycle.veterinary, entryLevel: 2, filiereId: filiereVeto.id, classId: classVeto2.id, bacType: 'Sciences Mathématiques A', firstYearEntry: 2022, anneeAcademique: '2024/2025' },
    { firstName: 'Ibrahim', lastName: 'MOUTAOUAKKIL', fullName: 'Ibrahim MOUTAOUAKKIL', sex: Sex.male, cin: 'SC006006', codeMassar: 'C006006', dateNaissance: new Date('2002-05-21'), email: 's.moutaouakkil@student.iav.ac.ma', telephone: '+212633330006', cycle: StudentCycle.veterinary, entryLevel: 2, filiereId: filiereVeto.id, classId: classVeto2.id, bacType: 'Sciences Physiques', firstYearEntry: 2022, anneeAcademique: '2024/2025' },
    { firstName: 'Loubna', lastName: 'TAOUSSI', fullName: 'Loubna TAOUSSI', sex: Sex.female, cin: 'SC007007', codeMassar: 'C007007', dateNaissance: new Date('2002-09-04'), email: 's.taoussi@student.iav.ac.ma', telephone: '+212633330007', cycle: StudentCycle.veterinary, entryLevel: 2, filiereId: filiereVeto.id, classId: classVeto2.id, bacType: 'Sciences Mathématiques B', firstYearEntry: 2022, anneeAcademique: '2024/2025' },

    // ── Génie Rural 1A (3 students) ───────────────────────────────────────
    { firstName: 'Nassim', lastName: 'BOUHADDOU', fullName: 'Nassim BOUHADDOU', sex: Sex.male, cin: 'SD001001', codeMassar: 'D001001', dateNaissance: new Date('2003-03-17'), email: 's.bouhaddou@student.iav.ac.ma', telephone: '+212644440001', cycle: StudentCycle.engineer, entryLevel: 1, filiereId: filiereGR.id, classId: classGR1.id, bacType: 'Sciences Mathématiques A', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Siham', lastName: 'OUKOUIR', fullName: 'Siham OUKOUIR', sex: Sex.female, cin: 'SD002002', codeMassar: 'D002002', dateNaissance: new Date('2003-06-30'), email: 's.oukouir@student.iav.ac.ma', telephone: '+212644440002', cycle: StudentCycle.engineer, entryLevel: 1, filiereId: filiereGR.id, classId: classGR1.id, bacType: 'Sciences Physiques', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Khalil', lastName: 'BENJELLOUN', fullName: 'Khalil BENJELLOUN', sex: Sex.male, cin: 'SD003003', codeMassar: 'D003003', dateNaissance: new Date('2003-10-12'), email: 's.benjelloun@student.iav.ac.ma', telephone: '+212644440003', cycle: StudentCycle.engineer, entryLevel: 1, filiereId: filiereGR.id, classId: classGR1.id, bacType: 'Sciences Mathématiques B', firstYearEntry: 2023, anneeAcademique: '2024/2025' },

    // ── IAA 1A (3 students) ───────────────────────────────────────────────
    { firstName: 'Maha', lastName: 'ELMERRAKCHI', fullName: 'Maha ELMERRAKCHI', sex: Sex.female, cin: 'SE001001', codeMassar: 'E001001', dateNaissance: new Date('2003-04-05'), email: 's.elmerrakchi@student.iav.ac.ma', telephone: '+212655550001', cycle: StudentCycle.engineer, entryLevel: 1, filiereId: filiereIAA.id, classId: classIAA1.id, bacType: 'Sciences Physiques', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Anas', lastName: 'GHAZALI', fullName: 'Anas GHAZALI', sex: Sex.male, cin: 'SE002002', codeMassar: 'E002002', dateNaissance: new Date('2003-08-18'), email: 's.ghazali@student.iav.ac.ma', telephone: '+212655550002', cycle: StudentCycle.engineer, entryLevel: 1, filiereId: filiereIAA.id, classId: classIAA1.id, bacType: 'Sciences Mathématiques A', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
    { firstName: 'Dounia', lastName: 'HAFIDI', fullName: 'Dounia HAFIDI', sex: Sex.female, cin: 'SE003003', codeMassar: 'E003003', dateNaissance: new Date('2003-12-23'), email: 's.hafidi@student.iav.ac.ma', telephone: '+212655550003', cycle: StudentCycle.engineer, entryLevel: 1, filiereId: filiereIAA.id, classId: classIAA1.id, bacType: 'Sciences de la Vie et de la Terre', firstYearEntry: 2023, anneeAcademique: '2024/2025' },
  ];

  const savedStudents: Record<string, number> = {};
  for (const s of studentDefs) {
    const saved = await prisma.student.upsert({
      where: { cin: s.cin },
      update: s,
      create: s,
    });
    savedStudents[s.cin] = saved.id;
  }

  // ─── StudentClassHistory ──────────────────────────────────────────────────
  const addHistory = async (
    studentId: number, classId: number, academicYear: string, studyYear: number, status: string,
  ) => {
    await prisma.studentClassHistory.upsert({
      where: { studentId_academicYear: { studentId, academicYear } },
      update: {},
      create: { studentId, classId, academicYear, studyYear, decisionStatus: status },
    });
  };

  // APESA 2 students: were in APESA 1 last year
  for (const cin of ['SA007007', 'SA008008', 'SA009009', 'SA010010', 'SA011011']) {
    const id = savedStudents[cin];
    await addHistory(id, classAPESA1.id, '2023/2024', 1, 'admis');
    await addHistory(id, classAPESA2.id, '2024/2025', 2, 'en cours');
  }

  // Agronomie 3A students: 3 years
  for (const cin of ['SB006006', 'SB007007', 'SB008008']) {
    const id = savedStudents[cin];
    await addHistory(id, classAgro1.id, '2022/2023', 1, 'admis');
    await addHistory(id, classAgro2.id, '2023/2024', 2, 'admis');
    await addHistory(id, classAgro3.id, '2024/2025', 3, 'en cours');
  }

  // SB009009 Rachid ELHILALI — redoublant in Agro 2A (stayed two years)
  {
    const id = savedStudents['SB009009'];
    await addHistory(id, classAgro1.id, '2021/2022', 1, 'admis');
    await addHistory(id, classAgro2.id, '2022/2023', 2, 'ajourné');
    await addHistory(id, classAgro2.id, '2023/2024', 2, 'admis'); // redoublant
    await addHistory(id, classAgro3.id, '2024/2025', 3, 'en cours');
  }

  // PVPP 4A students: 4 years history
  for (const cin of ['SB010010', 'SB011011', 'SB012012']) {
    const id = savedStudents[cin];
    await addHistory(id, classAgro1.id, '2021/2022', 1, 'admis');
    await addHistory(id, classAgro2.id, '2022/2023', 2, 'admis');
    await addHistory(id, classAgro3.id, '2023/2024', 3, 'admis');
    await addHistory(id, classPVPP4.id, '2024/2025', 4, 'en cours');
  }

  // Veto 2A students
  for (const cin of ['SC005005', 'SC006006', 'SC007007']) {
    const id = savedStudents[cin];
    await addHistory(id, classVeto1.id, '2023/2024', 1, 'admis');
    await addHistory(id, classVeto2.id, '2024/2025', 2, 'en cours');
  }

  // ─── Laureates ────────────────────────────────────────────────────────────
  // A few students from Agronomie who graduated previously (not in current classes)
  const laureateStudents = [
    { firstName: 'Amine', lastName: 'OUAHMANE', fullName: 'Amine OUAHMANE', sex: Sex.male, cin: 'SL001001', codeMassar: 'L001001', dateNaissance: new Date('1998-05-10'), email: 's.ouahmane.alumni@iav.ac.ma', telephone: '+212690001001', cycle: StudentCycle.engineer, entryLevel: 5, filiereId: filiereAgronomie.id, classId: classPVPP4.id, bacType: 'Sciences Mathématiques A', firstYearEntry: 2018, anneeAcademique: '2022/2023' },
    { firstName: 'Nadia', lastName: 'BENNIS', fullName: 'Nadia BENNIS', sex: Sex.female, cin: 'SL002002', codeMassar: 'L002002', dateNaissance: new Date('1998-09-22'), email: 's.bennis.alumni@iav.ac.ma', telephone: '+212690002002', cycle: StudentCycle.engineer, entryLevel: 5, filiereId: filiereAgronomie.id, classId: classPVPP4.id, bacType: 'Sciences Physiques', firstYearEntry: 2018, anneeAcademique: '2022/2023' },
    { firstName: 'Soufiane', lastName: 'IDOUHMANE', fullName: 'Soufiane IDOUHMANE', sex: Sex.male, cin: 'SL003003', codeMassar: 'L003003', dateNaissance: new Date('1999-01-14'), email: 's.idouhmane.alumni@iav.ac.ma', telephone: '+212690003003', cycle: StudentCycle.veterinary, entryLevel: 6, filiereId: filiereVeto.id, classId: classVeto2.id, bacType: 'Sciences de la Vie et de la Terre', firstYearEntry: 2017, anneeAcademique: '2022/2023' },
  ];
  for (const s of laureateStudents) {
    const saved = await prisma.student.upsert({ where: { cin: s.cin }, update: s, create: s });
    await prisma.laureate.upsert({
      where: { studentId: saved.id },
      update: { graduationYear: 2023, diplomaStatus: DiplomaStatus.retrieved },
      create: { studentId: saved.id, graduationYear: 2023, diplomaStatus: DiplomaStatus.retrieved },
    });
  }

  // ─── Modules & Éléments ───────────────────────────────────────────────────
  // APESA modules
  const modMathApesa     = await findOrCreateModule('Mathématiques', 'S1-S2', filiereAPESA.id, null);
  const modPhyChimApesa  = await findOrCreateModule('Physique-Chimie', 'S1-S2', filiereAPESA.id, null);
  const modBioApesa      = await findOrCreateModule('Biologie et Géologie', 'S1-S2', filiereAPESA.id, null);
  const modInfoApesa     = await findOrCreateModule('Informatique et Numérique', 'S1', filiereAPESA.id, null);
  const modLangApesa     = await findOrCreateModule('Langues et Communication', 'S1-S2', filiereAPESA.id, null);

  await findOrCreateElement('Analyse et Algèbre', modMathApesa.id, classAPESA1.id, ElementType.CM, 40);
  await findOrCreateElement('Analyse et Algèbre - TD', modMathApesa.id, classAPESA1.id, ElementType.TD, 20);
  await findOrCreateElement('Physique Générale', modPhyChimApesa.id, classAPESA1.id, ElementType.CM, 30);
  await findOrCreateElement('Chimie Générale - TP', modPhyChimApesa.id, classAPESA1.id, ElementType.TP, 15);
  await findOrCreateElement('Biologie Cellulaire', modBioApesa.id, classAPESA1.id, ElementType.CM, 25);
  await findOrCreateElement('Biologie Cellulaire - TD', modBioApesa.id, classAPESA1.id, ElementType.TD, 15);
  await findOrCreateElement('Algorithmique et Programmation', modInfoApesa.id, classAPESA1.id, ElementType.CM, 20);
  await findOrCreateElement('Algorithmique - TP', modInfoApesa.id, classAPESA1.id, ElementType.TP, 20);
  await findOrCreateElement('Français Scientifique', modLangApesa.id, classAPESA1.id, ElementType.TD, 20);
  await findOrCreateElement('Anglais Technique', modLangApesa.id, classAPESA1.id, ElementType.TD, 20);

  // Agronomie 1A modules
  const modAgronGen  = await findOrCreateModule('Agronomie Générale', 'S1', filiereAgronomie.id, null);
  const modBiochim   = await findOrCreateModule('Biochimie Végétale', 'S1', filiereAgronomie.id, null);
  const modStatInfo  = await findOrCreateModule('Statistiques et Informatique Appliquées', 'S2', filiereAgronomie.id, null);
  const modPedologie = await findOrCreateModule('Pédologie et Sciences du Sol', 'S2', filiereAgronomie.id, null);
  const modBotanique = await findOrCreateModule('Botanique et Physiologie Végétale', 'S1', filiereAgronomie.id, null);

  await findOrCreateElement('Introduction à l\'Agronomie', modAgronGen.id, classAgro1.id, ElementType.CM, 30);
  await findOrCreateElement('Pratiques Agronomiques - TD', modAgronGen.id, classAgro1.id, ElementType.TD, 15);
  await findOrCreateElement('Travaux Pratiques Agronomie', modAgronGen.id, classAgro1.id, ElementType.TP, 20);
  await findOrCreateElement('Biochimie Structurale', modBiochim.id, classAgro1.id, ElementType.CM, 30);
  await findOrCreateElement('Biochimie - TP Labo', modBiochim.id, classAgro1.id, ElementType.TP, 20);
  await findOrCreateElement('Biostatistiques', modStatInfo.id, classAgro1.id, ElementType.CM, 25);
  await findOrCreateElement('Biostatistiques - TD', modStatInfo.id, classAgro1.id, ElementType.TD, 15);
  await findOrCreateElement('Pédologie Générale', modPedologie.id, classAgro1.id, ElementType.CM, 30);
  await findOrCreateElement('Analyses de Sol - TP', modPedologie.id, classAgro1.id, ElementType.TP, 15);
  await findOrCreateElement('Morphologie et Taxonomie Végétale', modBotanique.id, classAgro1.id, ElementType.CM, 25);
  await findOrCreateElement('Herbiers et Identification - TP', modBotanique.id, classAgro1.id, ElementType.TP, 15);

  // Agronomie 3A modules (tronc commun avancé)
  const modFitopathol  = await findOrCreateModule('Fitopatologie et Protection des Plantes', 'S5', filiereAgronomie.id, null);
  const modIrrig       = await findOrCreateModule('Irrigation et Drainage', 'S5', filiereAgronomie.id, null);
  const modEconAgri    = await findOrCreateModule('Économie Agricole', 'S6', filiereAgronomie.id, null);

  await findOrCreateElement('Maladies des Plantes', modFitopathol.id, classAgro3.id, ElementType.CM, 35);
  await findOrCreateElement('Diagnostic Phytosanitaire - TD', modFitopathol.id, classAgro3.id, ElementType.TD, 15);
  await findOrCreateElement('Principes de l\'Irrigation', modIrrig.id, classAgro3.id, ElementType.CM, 30);
  await findOrCreateElement('Dimensionnement - TD', modIrrig.id, classAgro3.id, ElementType.TD, 20);
  await findOrCreateElement('Micro-irrigation - TP', modIrrig.id, classAgro3.id, ElementType.TP, 15);
  await findOrCreateElement('Analyse Économique des Exploitations', modEconAgri.id, classAgro3.id, ElementType.CM, 25);
  await findOrCreateElement('Études de Cas Agricoles - TD', modEconAgri.id, classAgro3.id, ElementType.TD, 20);

  // PVPP 4A modules (option)
  const modPhytotech   = await findOrCreateModule('Phytotechnie Spéciale', 'S7', filiereAgronomie.id, optPVPP.id);
  const modProtPlantes = await findOrCreateModule('Protection Intégrée des Cultures', 'S7', filiereAgronomie.id, optPVPP.id);

  await findOrCreateElement('Cultures Maraîchères', modPhytotech.id, classPVPP4.id, ElementType.CM, 30);
  await findOrCreateElement('Cultures Maraîchères - TD', modPhytotech.id, classPVPP4.id, ElementType.TD, 15);
  await findOrCreateElement('Lutte Biologique', modProtPlantes.id, classPVPP4.id, ElementType.CM, 25);
  await findOrCreateElement('Lutte Biologique - TP', modProtPlantes.id, classPVPP4.id, ElementType.TP, 15);

  // Vétérinaire 1A modules
  const modAnatomie  = await findOrCreateModule('Anatomie Vétérinaire', 'S1', filiereVeto.id, null);
  const modHistoEmb  = await findOrCreateModule('Histologie et Embryologie', 'S1', filiereVeto.id, null);
  const modPhysioVet = await findOrCreateModule('Physiologie Animale', 'S2', filiereVeto.id, null);
  const modZootechnie = await findOrCreateModule('Zootechnie Générale', 'S2', filiereVeto.id, null);

  await findOrCreateElement('Anatomie des Carnivores', modAnatomie.id, classVeto1.id, ElementType.CM, 40);
  await findOrCreateElement('Dissection - TP', modAnatomie.id, classVeto1.id, ElementType.TP, 30);
  await findOrCreateElement('Histologie des Tissus', modHistoEmb.id, classVeto1.id, ElementType.CM, 30);
  await findOrCreateElement('Histologie - TP Microscope', modHistoEmb.id, classVeto1.id, ElementType.TP, 20);
  await findOrCreateElement('Physiologie de la Digestion', modPhysioVet.id, classVeto1.id, ElementType.CM, 25);
  await findOrCreateElement('Physiologie - TD', modPhysioVet.id, classVeto1.id, ElementType.TD, 15);
  await findOrCreateElement('Races Animales et Productions', modZootechnie.id, classVeto1.id, ElementType.CM, 30);
  await findOrCreateElement('Alimentation des Ruminants - TD', modZootechnie.id, classVeto1.id, ElementType.TD, 20);

  // Génie Rural 1A modules
  const modMecaFluides = await findOrCreateModule('Mécanique des Fluides', 'S1', filiereGR.id, null);
  const modTopographieGR = await findOrCreateModule('Topographie et SIG', 'S2', filiereGR.id, null);
  const modHydroGR     = await findOrCreateModule('Hydrologie', 'S1', filiereGR.id, null);

  await findOrCreateElement('Hydraulique Générale', modMecaFluides.id, classGR1.id, ElementType.CM, 35);
  await findOrCreateElement('Hydraulique - TD', modMecaFluides.id, classGR1.id, ElementType.TD, 20);
  await findOrCreateElement('Levés Topographiques', modTopographieGR.id, classGR1.id, ElementType.CM, 25);
  await findOrCreateElement('SIG et Cartographie - TP', modTopographieGR.id, classGR1.id, ElementType.TP, 25);
  await findOrCreateElement('Cycle Hydrologique', modHydroGR.id, classGR1.id, ElementType.CM, 30);

  // IAA 1A modules
  const modMicroIAA  = await findOrCreateModule('Microbiologie Alimentaire', 'S1', filiereIAA.id, null);
  const modChimIAA   = await findOrCreateModule('Chimie des Aliments', 'S1', filiereIAA.id, null);
  const modTechCons  = await findOrCreateModule('Technologies de Conservation', 'S2', filiereIAA.id, null);

  await findOrCreateElement('Microbiologie Générale', modMicroIAA.id, classIAA1.id, ElementType.CM, 30);
  await findOrCreateElement('Microbiologie - TP', modMicroIAA.id, classIAA1.id, ElementType.TP, 20);
  await findOrCreateElement('Glucides et Lipides Alimentaires', modChimIAA.id, classIAA1.id, ElementType.CM, 30);
  await findOrCreateElement('Analyse Bromatologique - TP', modChimIAA.id, classIAA1.id, ElementType.TP, 20);
  await findOrCreateElement('Procédés Thermiques', modTechCons.id, classIAA1.id, ElementType.CM, 25);
  await findOrCreateElement('Procédés Thermiques - TD', modTechCons.id, classIAA1.id, ElementType.TD, 15);

  // ─── Cours & CoursClass (with teacher assignments) ────────────────────────
  const teacher = (cin: string) => savedTeachers[cin] ?? null;

  const upsertCours = async (name: string, type: ElementType) => {
    const existing = await prisma.cours.findUnique({ where: { name } });
    if (existing) return existing;
    return prisma.cours.create({ data: { name, type } });
  };

  const assignCoursToClass = async (
    coursId: number, classId: number, teacherId: number | null, groupLabel: string | null,
  ) => {
    const existing = await prisma.coursClass.findFirst({
      where: {
        coursId,
        classId,
        ...(teacherId === null ? { teacherId: null } : { teacherId }),
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.coursClass.update({
        where: { id: existing.id },
        data: { groupLabel },
      });
      return;
    }

    await prisma.coursClass.create({
      data: { coursId, classId, teacherId, groupLabel },
    });
  };

  // APESA 1
  const cMathCM   = await upsertCours('Analyse et Algèbre — CM', ElementType.CM);
  const cMathTD1  = await upsertCours('Analyse et Algèbre — Groupe TD 1', ElementType.TD);
  const cMathTD2  = await upsertCours('Analyse et Algèbre — Groupe TD 2', ElementType.TD);
  const cPhysiqCM = await upsertCours('Physique Générale — CM', ElementType.CM);
  const cBioCM    = await upsertCours('Biologie Cellulaire — CM', ElementType.CM);
  const cBioTP    = await upsertCours('Biologie Cellulaire — TP', ElementType.TP);
  const cAlgoProg = await upsertCours('Algorithmique et Programmation — TP', ElementType.TP);

  await assignCoursToClass(cMathCM.id,   classAPESA1.id, teacher('NN144144'), null);
  await assignCoursToClass(cMathCM.id,   classAPESA1.id, teacher('JJ100100'), 'Co-enseignement');
  await assignCoursToClass(cMathTD1.id,  classAPESA1.id, teacher('NN144144'), 'Groupe TD 1');
  await assignCoursToClass(cMathTD2.id,  classAPESA1.id, teacher('KK111111'), 'Groupe TD 2');
  await assignCoursToClass(cPhysiqCM.id, classAPESA1.id, teacher('JJ100100'), null);
  await assignCoursToClass(cBioCM.id,    classAPESA1.id, teacher('JJ100100'), null);
  await assignCoursToClass(cBioTP.id,    classAPESA1.id, teacher('KK111111'), 'Groupe TP 1');
  await assignCoursToClass(cAlgoProg.id, classAPESA1.id, teacher('KK111111'), null);

  // Agronomie 1A
  const cAgronCM  = await upsertCours("Introduction à l'Agronomie — CM", ElementType.CM);
  const cAgronTD  = await upsertCours("Pratiques Agronomiques — TD", ElementType.TD);
  const cAgronTP  = await upsertCours("TP Agronomie — Groupe 1", ElementType.TP);
  const cBiochCM  = await upsertCours("Biochimie Structurale — CM", ElementType.CM);
  const cBiochTP  = await upsertCours("Biochimie — TP Labo", ElementType.TP);
  const cPedoCM   = await upsertCours("Pédologie Générale — CM", ElementType.CM);
  const cPedoTP   = await upsertCours("Analyses de Sol — TP", ElementType.TP);
  const cStatCM   = await upsertCours("Biostatistiques — CM", ElementType.CM);
  const cStatTD   = await upsertCours("Biostatistiques — TD", ElementType.TD);

  await assignCoursToClass(cAgronCM.id,  classAgro1.id, teacher('BB202020'), null);
  await assignCoursToClass(cAgronTD.id,  classAgro1.id, teacher('EE505050'), 'Groupe TD A');
  await assignCoursToClass(cAgronTP.id,  classAgro1.id, teacher('EE505050'), 'Groupe TP 1');
  await assignCoursToClass(cBiochCM.id,  classAgro1.id, teacher('JJ100100'), null);
  await assignCoursToClass(cBiochTP.id,  classAgro1.id, teacher('KK111111'), null);
  await assignCoursToClass(cPedoCM.id,   classAgro1.id, teacher('AA101010'), null);
  await assignCoursToClass(cPedoTP.id,   classAgro1.id, teacher('LL122122'), null);
  await assignCoursToClass(cStatCM.id,   classAgro1.id, teacher('NN144144'), null);
  await assignCoursToClass(cStatTD.id,   classAgro1.id, teacher('NN144144'), 'Groupe TD 1');

  // Vétérinaire 1A
  const cAnatCM   = await upsertCours("Anatomie des Carnivores — CM", ElementType.CM);
  const cAnatTP   = await upsertCours("Dissection — TP Groupe 1", ElementType.TP);
  const cHistoCM  = await upsertCours("Histologie des Tissus — CM", ElementType.CM);
  const cHistoTP  = await upsertCours("Histologie — TP Microscope", ElementType.TP);
  const cPhysioCM = await upsertCours("Physiologie de la Digestion — CM", ElementType.CM);
  const cZootCM   = await upsertCours("Races Animales — CM", ElementType.CM);

  await assignCoursToClass(cAnatCM.id,   classVeto1.id, teacher('CC303030'), null);
  await assignCoursToClass(cAnatTP.id,   classVeto1.id, teacher('LL122122'), 'Groupe TP 1');
  await assignCoursToClass(cHistoCM.id,  classVeto1.id, teacher('CC303030'), null);
  await assignCoursToClass(cHistoTP.id,  classVeto1.id, teacher('LL122122'), null);
  await assignCoursToClass(cPhysioCM.id, classVeto1.id, teacher('CC303030'), null);
  await assignCoursToClass(cZootCM.id,   classVeto1.id, teacher('MM133133'), null);

  // Génie Rural 1A
  const cHydCM   = await upsertCours("Hydraulique Générale — CM", ElementType.CM);
  const cHydTD   = await upsertCours("Hydraulique — TD Groupe 1", ElementType.TD);
  const cSIGTP   = await upsertCours("SIG et Cartographie — TP", ElementType.TP);
  const cHydroGn = await upsertCours("Cycle Hydrologique — CM", ElementType.CM);

  await assignCoursToClass(cHydCM.id,   classGR1.id, teacher('DD404040'), null);
  await assignCoursToClass(cHydTD.id,   classGR1.id, teacher('MM133133'), 'Groupe TD 1');
  await assignCoursToClass(cSIGTP.id,   classGR1.id, teacher('II909090'), null);
  await assignCoursToClass(cHydroGn.id, classGR1.id, teacher('DD404040'), null);

  // IAA 1A
  const cMicroCM  = await upsertCours("Microbiologie Générale — CM", ElementType.CM);
  const cMicroTP  = await upsertCours("Microbiologie — TP Labo", ElementType.TP);
  const cChimCM   = await upsertCours("Glucides et Lipides — CM", ElementType.CM);
  const cConsTV   = await upsertCours("Procédés Thermiques — CM", ElementType.CM);
  const cConsTD   = await upsertCours("Procédés Thermiques — TD", ElementType.TD);

  await assignCoursToClass(cMicroCM.id,  classIAA1.id, teacher('GG707070'), null);
  await assignCoursToClass(cMicroTP.id,  classIAA1.id, teacher('OO155155'), 'Groupe TP 1');
  await assignCoursToClass(cChimCM.id,   classIAA1.id, teacher('GG707070'), null);
  await assignCoursToClass(cConsTV.id,   classIAA1.id, teacher('HH808080'), null);
  await assignCoursToClass(cConsTD.id,   classIAA1.id, teacher('OO155155'), 'Groupe TD 1');

  // ─── TeacherClass derived links (class-level assignment from cours teaching) ─
  const coursClassRows = await prisma.coursClass.findMany({
    where: { teacherId: { not: null } },
    select: { classId: true, teacherId: true },
  });

  for (const row of coursClassRows) {
    if (!row.teacherId) {
      continue;
    }

    const existingTeacherClass = await prisma.teacherClass.findFirst({
      where: { teacherId: row.teacherId, classId: row.classId },
      select: { id: true },
    });

    if (!existingTeacherClass) {
      await prisma.teacherClass.create({
        data: { teacherId: row.teacherId, classId: row.classId },
      });
    }
  }

  // ─── Accreditation plans, lines and class assignments ───────────────────
  const planAgro2025 = await prisma.accreditationPlan.upsert({
    where: { name_academicYear: { name: 'Plan Agronomie Tronc Commun', academicYear: '2025/2026' } },
    update: {
      levelYear: 1,
      filiereId: filiereAgronomie.id,
      cycleId: cycleIng.id,
      status: 'published',
    },
    create: {
      name: 'Plan Agronomie Tronc Commun',
      academicYear: '2025/2026',
      levelYear: 1,
      filiereId: filiereAgronomie.id,
      cycleId: cycleIng.id,
      status: 'published',
    },
  });

  const planVeto2025 = await prisma.accreditationPlan.upsert({
    where: { name_academicYear: { name: 'Plan Vétérinaire Fondamental', academicYear: '2025/2026' } },
    update: {
      levelYear: 1,
      filiereId: filiereVeto.id,
      cycleId: cycleVeto.id,
      status: 'published',
    },
    create: {
      name: 'Plan Vétérinaire Fondamental',
      academicYear: '2025/2026',
      levelYear: 1,
      filiereId: filiereVeto.id,
      cycleId: cycleVeto.id,
      status: 'published',
    },
  });

  const upsertPlanLine = async (
    planId: number,
    coursId: number,
    moduleId: number | null,
    elementId: number | null,
    semestre: string | null,
    volumeHoraire: number | null,
    isMandatory = true,
  ) => {
    const existing = await prisma.accreditationPlanLine.findFirst({
      where: { planId, coursId },
      select: { id: true },
    });

    if (existing) {
      await prisma.accreditationPlanLine.update({
        where: { id: existing.id },
        data: { moduleId, elementId, semestre, volumeHoraire, isMandatory },
      });
      return;
    }

    await prisma.accreditationPlanLine.create({
      data: { planId, coursId, moduleId, elementId, semestre, volumeHoraire, isMandatory },
    });
  };

  await upsertPlanLine(planAgro2025.id, cAgronCM.id, modAgronGen.id, null, 'S1', 30, true);
  await upsertPlanLine(planAgro2025.id, cAgronTD.id, modAgronGen.id, null, 'S1', 15, true);
  await upsertPlanLine(planAgro2025.id, cBiochCM.id, modBiochim.id, null, 'S1', 30, true);
  await upsertPlanLine(planAgro2025.id, cPedoCM.id, modPedologie.id, null, 'S2', 30, true);
  await upsertPlanLine(planAgro2025.id, cStatCM.id, modStatInfo.id, null, 'S2', 25, true);

  await upsertPlanLine(planVeto2025.id, cAnatCM.id, modAnatomie.id, null, 'S1', 40, true);
  await upsertPlanLine(planVeto2025.id, cHistoCM.id, modHistoEmb.id, null, 'S1', 30, true);
  await upsertPlanLine(planVeto2025.id, cPhysioCM.id, modPhysioVet.id, null, 'S2', 25, true);

  await prisma.classAccreditationAssignment.upsert({
    where: { classId_academicYear: { classId: classAgro1.id, academicYear: '2025/2026' } },
    update: { planId: planAgro2025.id },
    create: { classId: classAgro1.id, academicYear: '2025/2026', planId: planAgro2025.id },
  });

  await prisma.classAccreditationAssignment.upsert({
    where: { classId_academicYear: { classId: classVeto1.id, academicYear: '2025/2026' } },
    update: { planId: planVeto2025.id },
    create: { classId: classVeto1.id, academicYear: '2025/2026', planId: planVeto2025.id },
  });

  // ─── Timetable sessions (sample weekly schedule) ────────────────────────
  const upsertSession = async (
    elementName: string,
    classId: number,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    teacherId: number | null,
    roomName: string,
  ) => {
    const element = await prisma.elementModule.findFirst({
      where: { name: elementName, classId },
      select: { id: true },
    });

    const room = await prisma.room.findUnique({
      where: { name: roomName },
      select: { id: true },
    });

    if (!element || !room) {
      return;
    }

    const existing = await prisma.timetableSession.findFirst({
      where: { elementId: element.id, classId, dayOfWeek, startTime, endTime },
      select: { id: true },
    });

    if (existing) {
      await prisma.timetableSession.update({
        where: { id: existing.id },
        data: { teacherId, roomId: room.id },
      });
      return;
    }

    await prisma.timetableSession.create({
      data: {
        elementId: element.id,
        classId,
        dayOfWeek,
        startTime,
        endTime,
        teacherId,
        roomId: room.id,
      },
    });
  };

  await upsertSession('Analyse et Algèbre', classAPESA1.id, 1, '08:30', '10:30', teacher('NN144144'), 'Amphi A');
  await upsertSession('Physique Générale', classAPESA1.id, 2, '10:45', '12:15', teacher('JJ100100'), 'Amphi B');
  await upsertSession("Introduction à l'Agronomie", classAgro1.id, 1, '10:45', '12:15', teacher('BB202020'), 'Salle 101');
  await upsertSession('Biochimie Structurale', classAgro1.id, 3, '08:30', '10:00', teacher('JJ100100'), 'Labo Chimie A');
  await upsertSession('Anatomie des Carnivores', classVeto1.id, 2, '08:30', '11:00', teacher('CC303030'), 'Salle TP Vétérinaire');
  await upsertSession('Hydraulique Générale', classGR1.id, 4, '14:00', '16:00', teacher('DD404040'), 'Salle 201');
  await upsertSession('Microbiologie Générale', classIAA1.id, 5, '08:30', '10:30', teacher('GG707070'), 'Labo Biologie');

  // ─── Room reservations (current week demo data) ─────────────────────────
  await upsertRoomReservation('Amphi A', 1, '08:00', '10:00', 'Pr. Alaoui', RoomReservationPurpose.cours, 'Biologie végétale IAG1');
  await upsertRoomReservation('Amphi A', 3, '14:00', '16:00', 'Pr. Fennich', RoomReservationPurpose.examen, 'Examen mi-parcours IGR');
  await upsertRoomReservation('Amphi C', 2, '10:00', '12:00', 'Pr. Benali', RoomReservationPurpose.cours, 'TD Chimie organique IAG2');
  await upsertRoomReservation('Salle de Conférences', 4, '09:00', '11:00', 'Direction', RoomReservationPurpose.reunion, 'Réunion pédagogique mensuelle');
  await upsertRoomReservation('Labo Informatique 1', 5, '08:00', '10:00', 'Pr. Fennich', RoomReservationPurpose.cours, 'TP Informatique IAG1');
  await upsertRoomReservation('Amphi B', 1, '14:00', '16:00', 'Pr. Chakroun', RoomReservationPurpose.cours, 'Cours Anatomie MV2');

  // ─── Activity logs and workflow tasks ────────────────────────────────────
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin' }, select: { id: true } });

  if (adminUser) {
    const existingLog = await prisma.activityLog.findFirst({
      where: { userId: adminUser.id, action: 'Initialisation des données de démonstration (seed)' },
      select: { id: true },
    });

    if (!existingLog) {
      await prisma.activityLog.create({
        data: {
          userId: adminUser.id,
          action: 'Initialisation des données de démonstration (seed)',
          metadata: { source: 'prisma/seed.ts', version: '2026-04-01' },
        },
      });
    }

    const workflowStudent = await prisma.student.findUnique({
      where: { cin: 'SB006006' },
      select: { id: true },
    });

    if (workflowStudent) {
      const existingTask = await prisma.workflowTask.findFirst({
        where: {
          title: 'Vérifier l\'accréditation des cours de la classe Agronomie 1A',
          assignedToId: adminUser.id,
          studentId: workflowStudent.id,
        },
        select: { id: true },
      });

      if (!existingTask) {
        const task = await prisma.workflowTask.create({
          data: {
            title: 'Vérifier l\'accréditation des cours de la classe Agronomie 1A',
            description: 'Contrôler la cohérence entre plan accrédité, cours assignés et emploi du temps.',
            assignedToId: adminUser.id,
            studentId: workflowStudent.id,
            status: 'in_progress',
          },
        });

        await prisma.workflowTimeline.createMany({
          data: [
            { taskId: task.id, status: 'pending', note: 'Tâche créée automatiquement par le seed.' },
            { taskId: task.id, status: 'in_progress', note: 'Analyse pédagogique démarrée.' },
          ],
        });
      }
    }
  }

  console.log('✅ Seed completed successfully.');
  console.log(`   Departments: 8`);
  console.log(`   Cycles: 4`);
  console.log(`   Filières: 7`);
  console.log(`   Options: 7`);
  console.log(`   Classes: 15`);
  console.log(`   Rooms: ${roomDefs.length}`);
  console.log(`   Teachers: ${teacherDefs.length} (10 permanent + 5 vacataires)`);
  console.log(`   Students: ${studentDefs.length} + 3 laureates`);
  console.log('   Accreditation plans: 2 (published)');
  console.log('   Timetable sessions: seeded sample weekly grid');
  console.log('   Room reservations: seeded current-week room booking demo');
  console.log('   Workflow + activity logs: seeded');
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
