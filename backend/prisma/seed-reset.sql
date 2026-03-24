BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "User" ("fullName", "email", "passwordHash", "role", "updatedAt")
VALUES (
  'DEAA Admin',
  'admin',
  crypt('admin', gen_salt('bf')),
  'admin'::"UserRole",
  NOW()
)
ON CONFLICT ("email") DO UPDATE
SET
  "fullName" = EXCLUDED."fullName",
  "passwordHash" = EXCLUDED."passwordHash",
  "role" = EXCLUDED."role",
  "updatedAt" = NOW();

INSERT INTO "Department" ("name", "updatedAt")
VALUES
  ('Sciences Agronomiques', NOW()),
  ('Informatique', NOW())
ON CONFLICT ("name") DO UPDATE SET "updatedAt" = NOW();

INSERT INTO "Filiere" ("name", "code", "filiereType", "departmentId", "updatedAt")
VALUES
  ('APESA', 'APESA', 'prepa', (SELECT id FROM "Department" WHERE name = 'Informatique'), NOW()),
  ('IT Engineering', 'IT-ENG', 'engineer', (SELECT id FROM "Department" WHERE name = 'Informatique'), NOW())
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "filiereType" = EXCLUDED."filiereType",
  "departmentId" = EXCLUDED."departmentId",
  "updatedAt" = NOW();

INSERT INTO "AcademicClass" ("name", "year", "filiereId", "classType", "updatedAt")
VALUES
  ('APESA 1', 1, (SELECT id FROM "Filiere" WHERE code = 'APESA'), 'prepa', NOW()),
  ('APESA 2', 2, (SELECT id FROM "Filiere" WHERE code = 'APESA'), 'prepa', NOW()),
  ('IT Engineer Global Year 1', 1, (SELECT id FROM "Filiere" WHERE code = 'IT-ENG'), 'engineer-global', NOW())
ON CONFLICT ("name", "year") DO UPDATE
SET
  "filiereId" = EXCLUDED."filiereId",
  "classType" = EXCLUDED."classType",
  "updatedAt" = NOW();

INSERT INTO "TeacherRole" ("name", "updatedAt")
VALUES
  ('Teacher', NOW()),
  ('Chef de Filiere', NOW()),
  ('Chef de Departement', NOW())
ON CONFLICT ("name") DO UPDATE SET "updatedAt" = NOW();

INSERT INTO "TeacherGrade" ("name", "updatedAt")
VALUES
  ('Maitre de conferences', NOW()),
  ('Professeur habilite', NOW()),
  ('Professeur de l''enseignement superieur', NOW())
ON CONFLICT ("name") DO UPDATE SET "updatedAt" = NOW();

INSERT INTO "Teacher" (
  "firstName",
  "lastName",
  "cin",
  "email",
  "phoneNumber",
  "dateInscription",
  "updatedAt",
  "departmentId",
  "filiereId",
  "roleId",
  "gradeId"
)
VALUES
  (
    'Yassine',
    'Bennani',
    'TA123456',
    'yassine.bennani@deaa.local',
    '+212600000001',
    NOW(),
    NOW(),
    (SELECT id FROM "Department" WHERE name = 'Informatique'),
    (SELECT id FROM "Filiere" WHERE code = 'IT-ENG'),
    (SELECT id FROM "TeacherRole" WHERE name = 'Teacher'),
    (SELECT id FROM "TeacherGrade" WHERE name = 'Maitre de conferences')
  ),
  (
    'Sara',
    'El Idrissi',
    'TB654321',
    'sara.elidrissi@deaa.local',
    '+212600000002',
    NOW(),
    NOW(),
    (SELECT id FROM "Department" WHERE name = 'Informatique'),
    (SELECT id FROM "Filiere" WHERE code = 'APESA'),
    (SELECT id FROM "TeacherRole" WHERE name = 'Chef de Filiere'),
    (SELECT id FROM "TeacherGrade" WHERE name = 'Professeur habilite')
  )
ON CONFLICT ("cin") DO UPDATE
SET
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  "email" = EXCLUDED."email",
  "phoneNumber" = EXCLUDED."phoneNumber",
  "updatedAt" = NOW(),
  "departmentId" = EXCLUDED."departmentId",
  "filiereId" = EXCLUDED."filiereId",
  "roleId" = EXCLUDED."roleId",
  "gradeId" = EXCLUDED."gradeId";

INSERT INTO "Student" (
  "firstName",
  "lastName",
  "fullName",
  "sex",
  "cin",
  "codeMassar",
  "dateNaissance",
  "email",
  "telephone",
  "cycle",
  "prepaYear",
  "prepaTrack",
  "entryLevel",
  "filiereId",
  "classId",
  "bacType",
  "firstYearEntry",
  "anneeAcademique",
  "dateInscription"
  ,"updatedAt"
)
VALUES
  (
    'Adam',
    'Alaoui',
    'Adam Alaoui',
    'male'::"Sex",
    'SA123456',
    'MASSAR001',
    DATE '2005-03-10',
    'adam.alaoui@deaa.local',
    '+212611111111',
    'prepa'::"StudentCycle",
    'prepa_1'::"PrepaYear",
    'Math-Physique',
    NULL,
    (SELECT id FROM "Filiere" WHERE code = 'APESA'),
    (SELECT id FROM "AcademicClass" WHERE name = 'APESA 1' AND year = 1),
    'Sciences Math A',
    2025,
    '2025/2026',
    NOW(),
    NOW()
  ),
  (
    'Ines',
    'Karimi',
    'Ines Karimi',
    'female'::"Sex",
    'SB654321',
    'MASSAR002',
    DATE '2004-11-22',
    'ines.karimi@deaa.local',
    '+212622222222',
    'engineer'::"StudentCycle",
    NULL,
    NULL,
    3,
    (SELECT id FROM "Filiere" WHERE code = 'IT-ENG'),
    (SELECT id FROM "AcademicClass" WHERE name = 'IT Engineer Global Year 1' AND year = 1),
    'Sciences Physiques',
    2023,
    '2025/2026',
    NOW(),
    NOW()
  )
ON CONFLICT ("cin") DO UPDATE
SET
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  "fullName" = EXCLUDED."fullName",
  "sex" = EXCLUDED."sex",
  "codeMassar" = EXCLUDED."codeMassar",
  "dateNaissance" = EXCLUDED."dateNaissance",
  "email" = EXCLUDED."email",
  "telephone" = EXCLUDED."telephone",
  "cycle" = EXCLUDED."cycle",
  "prepaYear" = EXCLUDED."prepaYear",
  "prepaTrack" = EXCLUDED."prepaTrack",
  "entryLevel" = EXCLUDED."entryLevel",
  "filiereId" = EXCLUDED."filiereId",
  "classId" = EXCLUDED."classId",
  "bacType" = EXCLUDED."bacType",
  "firstYearEntry" = EXCLUDED."firstYearEntry",
  "anneeAcademique" = EXCLUDED."anneeAcademique",
  "dateInscription" = EXCLUDED."dateInscription",
  "updatedAt" = NOW();

COMMIT;
