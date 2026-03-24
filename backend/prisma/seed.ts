import { PrismaClient, UserRole } from '@prisma/client';
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

  await prisma.department.upsert({
    where: { name: 'Sciences Agronomiques' },
    update: {},
    create: { name: 'Sciences Agronomiques' },
  });

  const informatique = await prisma.department.upsert({
    where: { name: 'Informatique' },
    update: {},
    create: { name: 'Informatique' },
  });

  const prepaFiliere = await prisma.filiere.upsert({
    where: { code: 'APESA' },
    update: {
      name: 'APESA',
      filiereType: 'prepa',
      departmentId: informatique.id,
    },
    create: {
      name: 'APESA',
      code: 'APESA',
      filiereType: 'prepa',
      departmentId: informatique.id,
    },
  });

  const itFiliere = await prisma.filiere.upsert({
    where: { code: 'IT-ENG' },
    update: {
      name: 'IT Engineering',
      filiereType: 'engineer',
      departmentId: informatique.id,
    },
    create: {
      name: 'IT Engineering',
      code: 'IT-ENG',
      filiereType: 'engineer',
      departmentId: informatique.id,
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
        name: 'APESA 2',
        year: 2,
      },
    },
    update: {
      name: 'APESA 2',
      year: 2,
      filiereId: prepaFiliere.id,
      classType: 'prepa',
    },
    create: {
      name: 'APESA 2',
      year: 2,
      filiereId: prepaFiliere.id,
      classType: 'prepa',
    },
  });

  await prisma.academicClass.upsert({
    where: {
      name_year: {
        name: 'IT Engineer Global Year 1',
        year: 1,
      },
    },
    update: {
      name: 'IT Engineer Global Year 1',
      year: 1,
      filiereId: itFiliere.id,
      classType: 'engineer-global',
    },
    create: {
      name: 'IT Engineer Global Year 1',
      year: 1,
      filiereId: itFiliere.id,
      classType: 'engineer-global',
    },
  });
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
