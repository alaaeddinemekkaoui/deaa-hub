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
  ('Cycle Préparatoire (APESA)', NOW()),
  ('Département d''Agronomie', NOW()),
  ('Département d''Horticulture', NOW()),
  ('Département de Génie Rural', NOW()),
  ('Département des Industries Agricoles et Alimentaires', NOW()),
  ('Département des Sciences Géomatiques et Ingénierie Topographique', NOW()),
  ('Département de Médecine Vétérinaire', NOW())
ON CONFLICT ("name") DO UPDATE SET "updatedAt" = NOW();

INSERT INTO "Filiere" ("name", "code", "filiereType", "departmentId", "updatedAt")
VALUES
  ('APESA', 'APESA', 'prepa', (SELECT id FROM "Department" WHERE name = 'Cycle Préparatoire (APESA)'), NOW()),
  ('Agronomie', 'AGRONOMIE', 'engineer', (SELECT id FROM "Department" WHERE name = 'Département d''Agronomie'), NOW()),
  ('Horticulture', 'HORTI', 'engineer', (SELECT id FROM "Department" WHERE name = 'Département d''Horticulture'), NOW()),
  ('Génie Rural', 'GENIE-RURAL', 'engineer', (SELECT id FROM "Department" WHERE name = 'Département de Génie Rural'), NOW()),
  ('Industries Agricoles et Alimentaires', 'IAA', 'engineer', (SELECT id FROM "Department" WHERE name = 'Département des Industries Agricoles et Alimentaires'), NOW()),
  ('Sciences Géomatiques et Ingénierie Topographique', 'SGIT', 'engineer', (SELECT id FROM "Department" WHERE name = 'Département des Sciences Géomatiques et Ingénierie Topographique'), NOW()),
  ('Médecine Vétérinaire', 'VETO', 'veterinary', (SELECT id FROM "Department" WHERE name = 'Département de Médecine Vétérinaire'), NOW())
ON CONFLICT ("code") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "filiereType" = EXCLUDED."filiereType",
  "departmentId" = EXCLUDED."departmentId",
  "updatedAt" = NOW();

INSERT INTO "AcademicClass" ("name", "year", "filiereId", "classType", "updatedAt")
VALUES
  ('APESA 1', 1, (SELECT id FROM "Filiere" WHERE code = 'APESA'), 'prepa', NOW()),
  ('Agronomie 1A', 1, (SELECT id FROM "Filiere" WHERE code = 'AGRONOMIE'), 'engineer-global', NOW()),
  ('Médecine Vétérinaire 2A', 2, (SELECT id FROM "Filiere" WHERE code = 'VETO'), 'veterinary', NOW())
ON CONFLICT ("name", "year") DO UPDATE
SET
  "filiereId" = EXCLUDED."filiereId",
  "classType" = EXCLUDED."classType",
  "updatedAt" = NOW();

DELETE FROM "AcademicClass"
WHERE "name" = 'APESA 2' AND "year" = 2;

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
    'TE123456',
    'yassine.bennani@iav.ac.ma',
    '+212600000001',
    NOW(),
    NOW(),
    (SELECT id FROM "Department" WHERE name = 'Département d''Agronomie'),
    (SELECT id FROM "Filiere" WHERE code = 'AGRONOMIE'),
    (SELECT id FROM "TeacherRole" WHERE name = 'Chef de Filiere'),
    (SELECT id FROM "TeacherGrade" WHERE name = 'Maitre de conferences')
  ),
  (
    'Sara',
    'El Idrissi',
    'TE654321',
    'sara.elidrissi@iav.ac.ma',
    '+212600000002',
    NOW(),
    NOW(),
    (SELECT id FROM "Department" WHERE name = 'Cycle Préparatoire (APESA)'),
    (SELECT id FROM "Filiere" WHERE code = 'APESA'),
    (SELECT id FROM "TeacherRole" WHERE name = 'Chef de Filiere'),
    (SELECT id FROM "TeacherGrade" WHERE name = 'Professeur habilite')
  ),
  (
    'Mohammed',
    'Chakir',
    'TE789012',
    'mohammed.chakir@iav.ac.ma',
    '+212600000003',
    NOW(),
    NOW(),
    (SELECT id FROM "Department" WHERE name = 'Département d''Agronomie'),
    (SELECT id FROM "Filiere" WHERE code = 'AGRONOMIE'),
    (SELECT id FROM "TeacherRole" WHERE name = 'Chef de Departement'),
    (SELECT id FROM "TeacherGrade" WHERE name = 'Professeur de l''enseignement superieur')
  ),
  (
    'Laila',
    'Boussaid',
    'TE345678',
    'laila.boussaid@iav.ac.ma',
    '+212600000004',
    NOW(),
    NOW(),
    (SELECT id FROM "Department" WHERE name = 'Département d''Horticulture'),
    NULL,
    (SELECT id FROM "TeacherRole" WHERE name = 'Teacher'),
    (SELECT id FROM "TeacherGrade" WHERE name = 'Maitre de conferences')
  ),
  (
    'Ahmed',
    'Bennani',
    'TE901234',
    'ahmed.bennani@iav.ac.ma',
    '+212600000005',
    NOW(),
    NOW(),
    (SELECT id FROM "Department" WHERE name = 'Cycle Préparatoire (APESA)'),
    (SELECT id FROM "Filiere" WHERE code = 'APESA'),
    (SELECT id FROM "TeacherRole" WHERE name = 'Teacher'),
    (SELECT id FROM "TeacherGrade" WHERE name = 'Maitre de conferences')
  ),
  (
    'Nadia',
    'Hassani',
    'TE567890',
    'nadia.hassani@iav.ac.ma',
    '+212600000006',
    NOW(),
    NOW(),
    (SELECT id FROM "Department" WHERE name = 'Département de Génie Rural'),
    NULL,
    (SELECT id FROM "TeacherRole" WHERE name = 'Teacher'),
    (SELECT id FROM "TeacherGrade" WHERE name = 'Maitre de conferences')
  ),
  (
    'Hassan',
    'Fathi',
    'TE234567',
    'hassan.fathi@iav.ac.ma',
    '+212600000007',
    NOW(),
    NOW(),
    (SELECT id FROM "Department" WHERE name = 'Département de Médecine Vétérinaire'),
    (SELECT id FROM "Filiere" WHERE code = 'VETO'),
    (SELECT id FROM "TeacherRole" WHERE name = 'Chef de Departement'),
    (SELECT id FROM "TeacherGrade" WHERE name = 'Professeur de l''enseignement superieur')
  ),
  (
    'Zahra',
    'Rachid',
    'TE812345',
    'zahra.rachid@iav.ac.ma',
    '+212600000008',
    NOW(),
    NOW(),
    (SELECT id FROM "Department" WHERE name = 'Département des Industries Agricoles et Alimentaires'),
    NULL,
    (SELECT id FROM "TeacherRole" WHERE name = 'Teacher'),
    (SELECT id FROM "TeacherGrade" WHERE name = 'Maitre de conferences')
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
  "dateInscription",
  "updatedAt"
)
VALUES
  -- APESA 1 Students
  (
    'Adam',
    'Alaoui',
    'Adam Alaoui',
    'male'::"Sex",
    'TA001234',
    'APESA001',
    DATE '2005-03-15',
    'adam.alaoui@student.iav.ac.ma',
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
    'Mariam',
    'Ben Hamida',
    'Mariam Ben Hamida',
    'female'::"Sex",
    'TB005678',
    'APESA002',
    DATE '2005-07-22',
    'mariam.benhamida@student.iav.ac.ma',
    '+212622222222',
    'prepa'::"StudentCycle",
    'prepa_1'::"PrepaYear",
    'Sciences Exp',
    NULL,
    (SELECT id FROM "Filiere" WHERE code = 'APESA'),
    (SELECT id FROM "AcademicClass" WHERE name = 'APESA 1' AND year = 1),
    'Sciences Exp',
    2025,
    '2025/2026',
    NOW(),
    NOW()
  ),
  (
    'Hassan',
    'Morocain',
    'Hassan Morocain',
    'male'::"Sex",
    'TC009012',
    'APESA003',
    DATE '2005-11-05',
    'hassan.morocain@student.iav.ac.ma',
    '+212633333333',
    'prepa'::"StudentCycle",
    'prepa_1'::"PrepaYear",
    'Math-Physique',
    NULL,
    (SELECT id FROM "Filiere" WHERE code = 'APESA'),
    (SELECT id FROM "AcademicClass" WHERE name = 'APESA 1' AND year = 1),
    'Sciences Math B',
    2025,
    '2025/2026',
    NOW(),
    NOW()
  ),
  (
    'Fatima',
    'Youssef',
    'Fatima Youssef',
    'female'::"Sex",
    'TD003456',
    'APESA004',
    DATE '2005-04-18',
    'fatima.youssef@student.iav.ac.ma',
    '+212644444444',
    'prepa'::"StudentCycle",
    'prepa_1'::"PrepaYear",
    'Sciences Exp',
    NULL,
    (SELECT id FROM "Filiere" WHERE code = 'APESA'),
    (SELECT id FROM "AcademicClass" WHERE name = 'APESA 1' AND year = 1),
    'Sciences Exp',
    2025,
    '2025/2026',
    NOW(),
    NOW()
  ),
  -- Agronomie 1A Students
  (
    'Karim',
    'Bencheikh',
    'Karim Bencheikh',
    'male'::"Sex",
    'TE007890',
    'AGRO001',
    DATE '2003-08-20',
    'karim.bencheikh@student.iav.ac.ma',
    '+212655555555',
    'engineer'::"StudentCycle",
    NULL,
    NULL,
    3,
    (SELECT id FROM "Filiere" WHERE code = 'AGRONOMIE'),
    (SELECT id FROM "AcademicClass" WHERE name = 'Agronomie 1A' AND year = 1),
    'Sciences Physiques',
    2023,
    '2025/2026',
    NOW(),
    NOW()
  ),
  (
    'Salma',
    'Reda',
    'Salma Reda',
    'female'::"Sex",
    'TF001234',
    'AGRO002',
    DATE '2003-12-10',
    'salma.reda@student.iav.ac.ma',
    '+212666666666',
    'engineer'::"StudentCycle",
    NULL,
    NULL,
    3,
    (SELECT id FROM "Filiere" WHERE code = 'AGRONOMIE'),
    (SELECT id FROM "AcademicClass" WHERE name = 'Agronomie 1A' AND year = 1),
    'Sciences Physiques',
    2023,
    '2025/2026',
    NOW(),
    NOW()
  ),
  (
    'Mohamed',
    'El Gueddari',
    'Mohamed El Gueddari',
    'male'::"Sex",
    'TG005678',
    'AGRO003',
    DATE '2003-05-25',
    'mohamed.elgueddari@student.iav.ac.ma',
    '+212677777777',
    'engineer'::"StudentCycle",
    NULL,
    NULL,
    3,
    (SELECT id FROM "Filiere" WHERE code = 'AGRONOMIE'),
    (SELECT id FROM "AcademicClass" WHERE name = 'Agronomie 1A' AND year = 1),
    'Sciences Math A',
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
