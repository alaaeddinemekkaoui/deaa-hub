import { PrismaClient, UserRole, Sex, StudentCycle, PrepaYear } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin';
  const passwordHash = await bcrypt.hash('admin', 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: 'DEAA Admin',
      passwordHash,
      role: UserRole.admin,
    },
    create: {
      fullName: 'DEAA Admin',
      email: adminEmail,
      passwordHash,
      role: UserRole.admin,
    },
  });

  const cyclePreparatoire = await prisma.department.upsert({
    where: { name: 'Cycle Préparatoire (APESA)' },
    update: {},
    create: { name: 'Cycle Préparatoire (APESA)' },
  });

  const agronomieDepartment = await prisma.department.upsert({
    where: { name: "Département d'Agronomie" },
    update: {},
    create: { name: "Département d'Agronomie" },
  });

  const horticultureDepartment = await prisma.department.upsert({
    where: { name: "Département d'Horticulture" },
    update: {},
    create: { name: "Département d'Horticulture" },
  });

  const genieRuralDepartment = await prisma.department.upsert({
    where: { name: 'Département de Génie Rural' },
    update: {},
    create: { name: 'Département de Génie Rural' },
  });

  const iaaDepartment = await prisma.department.upsert({
    where: { name: 'Département des Industries Agricoles et Alimentaires' },
    update: {},
    create: { name: 'Département des Industries Agricoles et Alimentaires' },
  });

  const sgitDepartment = await prisma.department.upsert({
    where: { name: 'Département des Sciences Géomatiques et Ingénierie Topographique' },
    update: {},
    create: { name: 'Département des Sciences Géomatiques et Ingénierie Topographique' },
  });

  const veterinaryDepartment = await prisma.department.upsert({
    where: { name: 'Département de Médecine Vétérinaire' },
    update: {},
    create: { name: 'Département de Médecine Vétérinaire' },
  });

  const prepaFiliere = await prisma.filiere.upsert({
    where: { code: 'APESA' },
    update: {
      name: 'APESA',
      filiereType: 'prepa',
      departmentId: cyclePreparatoire.id,
    },
    create: {
      name: 'APESA',
      code: 'APESA',
      filiereType: 'prepa',
      departmentId: cyclePreparatoire.id,
    },
  });

  const agronomieFiliere = await prisma.filiere.upsert({
    where: { code: 'AGRONOMIE' },
    update: {
      name: 'Agronomie',
      filiereType: 'engineer',
      departmentId: agronomieDepartment.id,
    },
    create: {
      name: 'Agronomie',
      code: 'AGRONOMIE',
      filiereType: 'engineer',
      departmentId: agronomieDepartment.id,
    },
  });

  await prisma.filiere.upsert({
    where: { code: 'HORTI' },
    update: {
      name: 'Horticulture',
      filiereType: 'engineer',
      departmentId: horticultureDepartment.id,
    },
    create: {
      name: 'Horticulture',
      code: 'HORTI',
      filiereType: 'engineer',
      departmentId: horticultureDepartment.id,
    },
  });

  await prisma.filiere.upsert({
    where: { code: 'GENIE-RURAL' },
    update: {
      name: 'Génie Rural',
      filiereType: 'engineer',
      departmentId: genieRuralDepartment.id,
    },
    create: {
      name: 'Génie Rural',
      code: 'GENIE-RURAL',
      filiereType: 'engineer',
      departmentId: genieRuralDepartment.id,
    },
  });

  await prisma.filiere.upsert({
    where: { code: 'IAA' },
    update: {
      name: 'Industries Agricoles et Alimentaires',
      filiereType: 'engineer',
      departmentId: iaaDepartment.id,
    },
    create: {
      name: 'Industries Agricoles et Alimentaires',
      code: 'IAA',
      filiereType: 'engineer',
      departmentId: iaaDepartment.id,
    },
  });

  await prisma.filiere.upsert({
    where: { code: 'SGIT' },
    update: {
      name: 'Sciences Géomatiques et Ingénierie Topographique',
      filiereType: 'engineer',
      departmentId: sgitDepartment.id,
    },
    create: {
      name: 'Sciences Géomatiques et Ingénierie Topographique',
      code: 'SGIT',
      filiereType: 'engineer',
      departmentId: sgitDepartment.id,
    },
  });

  const veterinaryFiliere = await prisma.filiere.upsert({
    where: { code: 'VETO' },
    update: {
      name: 'Médecine Vétérinaire',
      filiereType: 'veterinary',
      departmentId: veterinaryDepartment.id,
    },
    create: {
      name: 'Médecine Vétérinaire',
      code: 'VETO',
      filiereType: 'veterinary',
      departmentId: veterinaryDepartment.id,
    },
  });

  await prisma.academicClass.upsert({
    where: {
      name_year: {
        name: 'APESA 1',
        year: 1,
      },
    },
    update: {
      name: 'APESA 1',
      year: 1,
      filiereId: prepaFiliere.id,
      classType: 'prepa',
    },
    create: {
      name: 'APESA 1',
      year: 1,
      filiereId: prepaFiliere.id,
      classType: 'prepa',
    },
  });

  await prisma.academicClass.deleteMany({
    where: {
      name: 'APESA 2',
      year: 2,
    },
  });

  await prisma.teacherRole.upsert({
    where: { name: 'Teacher' },
    update: {},
    create: { name: 'Teacher' },
  });

  await prisma.teacherRole.upsert({
    where: { name: 'Chef de Filiere' },
    update: {},
    create: { name: 'Chef de Filiere' },
  });

  await prisma.teacherRole.upsert({
    where: { name: 'Chef de Departement' },
    update: {},
    create: { name: 'Chef de Departement' },
  });

  await prisma.teacherGrade.upsert({
    where: { name: 'Maitre de conferences' },
    update: {},
    create: { name: 'Maitre de conferences' },
  });

  await prisma.teacherGrade.upsert({
    where: { name: 'Professeur habilite' },
    update: {},
    create: { name: 'Professeur habilite' },
  });

  await prisma.teacherGrade.upsert({
    where: { name: "Professeur de l'enseignement superieur" },
    update: {},
    create: { name: "Professeur de l'enseignement superieur" },
  });

  await prisma.academicClass.upsert({
    where: {
      name_year: {
        name: 'Agronomie 1A',
        year: 1,
      },
    },
    update: {
      name: 'Agronomie 1A',
      year: 1,
      filiereId: agronomieFiliere.id,
      classType: 'engineer-global',
    },
    create: {
      name: 'Agronomie 1A',
      year: 1,
      filiereId: agronomieFiliere.id,
      classType: 'engineer-global',
    },
  });

  await prisma.academicClass.upsert({
    where: {
      name_year: {
        name: 'Médecine Vétérinaire 2A',
        year: 2,
      },
    },
    update: {
      name: 'Médecine Vétérinaire 2A',
      year: 2,
      filiereId: veterinaryFiliere.id,
      classType: 'veterinary',
    },
    create: {
      name: 'Médecine Vétérinaire 2A',
      year: 2,
      filiereId: veterinaryFiliere.id,
      classType: 'veterinary',
    },
  });

  // Get class IDs for student assignments
  const apesa1Class = await prisma.academicClass.findUnique({
    where: { name_year: { name: 'APESA 1', year: 1 } },
  });

  const agronomie1aClass = await prisma.academicClass.findUnique({
    where: { name_year: { name: 'Agronomie 1A', year: 1 } },
  });

  // Seed APESA 1 Students
  const apesaStudents = [
    {
      firstName: 'student',
      lastName: '1',
      fullName: 'student 1',
      sex: Sex.male,
      cin: 'TA001234',
      codeMassar: 'APESA001',
      dateNaissance: new Date('2005-03-15'),
      email: 'student1@student.iav.ac.ma',
      telephone: '+212611111111',
      cycle: StudentCycle.prepa,
      prepaYear: PrepaYear.prepa_1,
      prepaTrack: 'Math-Physique',
      entryLevel: null,
      filiereId: prepaFiliere.id,
      classId: apesa1Class?.id,
      bacType: 'Sciences Math A',
      firstYearEntry: 2025,
      anneeAcademique: '2025/2026',
    },
    {
      firstName: 'student',
      lastName: '2',
      fullName: 'student 2',
      sex: Sex.female,
      cin: 'TB005678',
      codeMassar: 'APESA002',
      dateNaissance: new Date('2005-07-22'),
      email: 'student2@student.iav.ac.ma',
      telephone: '+212622222222',
      cycle: StudentCycle.prepa,
      prepaYear: PrepaYear.prepa_1,
      prepaTrack: 'Sciences Exp',
      entryLevel: null,
      filiereId: prepaFiliere.id,
      classId: apesa1Class?.id,
      bacType: 'Sciences Exp',
      firstYearEntry: 2025,
      anneeAcademique: '2025/2026',
    },
    {
      firstName: 'student',
      lastName: '3',
      fullName: 'student 3',
      sex: Sex.male,
      cin: 'TC009012',
      codeMassar: 'APESA003',
      dateNaissance: new Date('2005-11-05'),
      email: 'student3@student.iav.ac.ma',
      telephone: '+212633333333',
      cycle: StudentCycle.prepa,
      prepaYear: PrepaYear.prepa_1,
      prepaTrack: 'Math-Physique',
      entryLevel: null,
      filiereId: prepaFiliere.id,
      classId: apesa1Class?.id,
      bacType: 'Sciences Math B',
      firstYearEntry: 2025,
      anneeAcademique: '2025/2026',
    },
    {
      firstName: 'student',
      lastName: '4',
      fullName: 'student 4',
      sex: Sex.female,
      cin: 'TD003456',
      codeMassar: 'APESA004',
      dateNaissance: new Date('2005-04-18'),
      email: 'student4@student.iav.ac.ma',
      telephone: '+212644444444',
      cycle: StudentCycle.prepa,
      prepaYear: PrepaYear.prepa_1,
      prepaTrack: 'Sciences Exp',
      entryLevel: null,
      filiereId: prepaFiliere.id,
      classId: apesa1Class?.id,
      bacType: 'Sciences Exp',
      firstYearEntry: 2025,
      anneeAcademique: '2025/2026',
    },
  ];

  for (const student of apesaStudents) {
    await prisma.student.upsert({
      where: { cin: student.cin },
      update: student,
      create: student,
    });
  }

  // Seed Agronomie 1A Students
  const agronomieStudents = [
    {
      firstName: 'student',
      lastName: '5',
      fullName: 'student 5',
      sex: Sex.male,
      cin: 'TE007890',
      codeMassar: 'AGRO001',
      dateNaissance: new Date('2003-08-20'),
      email: 'student5@student.iav.ac.ma',
      telephone: '+212655555555',
      cycle: StudentCycle.engineer,
      prepaYear: null,
      prepaTrack: null,
      entryLevel: 3,
      filiereId: agronomieFiliere.id,
      classId: agronomie1aClass?.id,
      bacType: 'Sciences Physiques',
      firstYearEntry: 2023,
      anneeAcademique: '2025/2026',
    },
    {
      firstName: 'student',
      lastName: '6',
      fullName: 'student 6',
      sex: Sex.female,
      cin: 'TF001234',
      codeMassar: 'AGRO002',
      dateNaissance: new Date('2003-12-10'),
      email: 'student6@student.iav.ac.ma',
      telephone: '+212666666666',
      cycle: StudentCycle.engineer,
      prepaYear: null,
      prepaTrack: null,
      entryLevel: 3,
      filiereId: agronomieFiliere.id,
      classId: agronomie1aClass?.id,
      bacType: 'Sciences Physiques',
      firstYearEntry: 2023,
      anneeAcademique: '2025/2026',
    },
    {
      firstName: 'student',
      lastName: '7',
      fullName: 'student 7',
      sex: Sex.male,
      cin: 'TG005678',
      codeMassar: 'AGRO003',
      dateNaissance: new Date('2003-05-25'),
      email: 'student7@student.iav.ac.ma',
      telephone: '+212677777777',
      cycle: StudentCycle.engineer,
      prepaYear: null,
      prepaTrack: null,
      entryLevel: 3,
      filiereId: agronomieFiliere.id,
      classId: agronomie1aClass?.id,
      bacType: 'Sciences Math A',
      firstYearEntry: 2023,
      anneeAcademique: '2025/2026',
    },
  ];

  for (const student of agronomieStudents) {
    await prisma.student.upsert({
      where: { cin: student.cin },
      update: student,
      create: student,
    });
  }

  // Get teacher roles and grades
  const teacherRole = await prisma.teacherRole.findUnique({
    where: { name: 'Teacher' },
  });
  const chefRole = await prisma.teacherRole.findUnique({
    where: { name: 'Chef de Filiere' },
  });
  const deptChefRole = await prisma.teacherRole.findUnique({
    where: { name: 'Chef de Departement' },
  });

  const maitrGrade = await prisma.teacherGrade.findUnique({
    where: { name: 'Maitre de conferences' },
  });
  const profHabilitGrade = await prisma.teacherGrade.findUnique({
    where: { name: 'Professeur habilite' },
  });
  const profSupGrade = await prisma.teacherGrade.findUnique({
    where: { name: "Professeur de l'enseignement superieur" },
  });

  // Seed Teachers
  const teachers = [
    {
      firstName: 'teacher',
      lastName: '1',
      cin: 'TE123456',
      email: 'teacher1@iav.ac.ma',
      phoneNumber: '+212600000001',
      dateInscription: new Date('2015-09-01'),
      departmentId: agronomieDepartment.id,
      filiereId: agronomieFiliere.id,
      roleId: chefRole!.id,
      gradeId: maitrGrade!.id,
    },
    {
      firstName: 'teacher',
      lastName: '2',
      cin: 'TE654321',
      email: 'teacher2@iav.ac.ma',
      phoneNumber: '+212600000002',
      dateInscription: new Date('2016-09-01'),
      departmentId: cyclePreparatoire.id,
      filiereId: prepaFiliere.id,
      roleId: chefRole!.id,
      gradeId: profHabilitGrade!.id,
    },
    {
      firstName: 'teacher',
      lastName: '3',
      cin: 'TE789012',
      email: 'teacher3@iav.ac.ma',
      phoneNumber: '+212600000003',
      dateInscription: new Date('2010-09-01'),
      departmentId: agronomieDepartment.id,
      filiereId: agronomieFiliere.id,
      roleId: deptChefRole!.id,
      gradeId: profSupGrade!.id,
    },
    {
      firstName: 'teacher',
      lastName: '4',
      cin: 'TE345678',
      email: 'teacher4@iav.ac.ma',
      phoneNumber: '+212600000004',
      dateInscription: new Date('2018-09-01'),
      departmentId: horticultureDepartment.id,
      filiereId: null,
      roleId: teacherRole!.id,
      gradeId: maitrGrade!.id,
    },
    {
      firstName: 'teacher',
      lastName: '5',
      cin: 'TE901234',
      email: 'teacher5@iav.ac.ma',
      phoneNumber: '+212600000005',
      dateInscription: new Date('2017-09-01'),
      departmentId: cyclePreparatoire.id,
      filiereId: prepaFiliere.id,
      roleId: teacherRole!.id,
      gradeId: maitrGrade!.id,
    },
    {
      firstName: 'teacher',
      lastName: '6',
      cin: 'TE567890',
      email: 'teacher6@iav.ac.ma',
      phoneNumber: '+212600000006',
      dateInscription: new Date('2019-09-01'),
      departmentId: genieRuralDepartment.id,
      filiereId: null,
      roleId: teacherRole!.id,
      gradeId: maitrGrade!.id,
    },
    {
      firstName: 'teacher',
      lastName: '7',
      cin: 'TE234567',
      email: 'teacher7@iav.ac.ma',
      phoneNumber: '+212600000007',
      dateInscription: new Date('2012-09-01'),
      departmentId: veterinaryDepartment.id,
      filiereId: veterinaryFiliere.id,
      roleId: deptChefRole!.id,
      gradeId: profSupGrade!.id,
    },
    {
      firstName: 'teacher',
      lastName: '8',
      cin: 'TE812345',
      email: 'teacher8@iav.ac.ma',
      phoneNumber: '+212600000008',
      dateInscription: new Date('2020-09-01'),
      departmentId: iaaDepartment.id,
      filiereId: null,
      roleId: teacherRole!.id,
      gradeId: maitrGrade!.id,
    },
  ];

  for (const teacher of teachers) {
    await prisma.teacher.upsert({
      where: { cin: teacher.cin },
      update: teacher,
      create: teacher,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
