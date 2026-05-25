ALTER TABLE "User" ADD COLUMN "linkedInUrl" TEXT;
ALTER TABLE "Student" ADD COLUMN "linkedInUrl" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "linkedInUrl" TEXT;

ALTER TABLE "AcademicYear" ADD COLUMN "startYear" INTEGER;
ALTER TABLE "AcademicYear" ADD COLUMN "endYear" INTEGER;

UPDATE "AcademicYear"
SET
  "startYear" = NULLIF(substring("label" from '([0-9]{4})'), '')::INTEGER,
  "endYear" = NULLIF(substring("label" from '/([0-9]{4})'), '')::INTEGER
WHERE "label" ~ '^[0-9]{4}/[0-9]{4}$';

ALTER TABLE "AcademicClass" ADD COLUMN "departmentId" INTEGER;

UPDATE "AcademicClass" c
SET "departmentId" = f."departmentId"
FROM "Filiere" f
WHERE c."filiereId" = f."id" AND c."departmentId" IS NULL;

ALTER TABLE "Module" ADD COLUMN "cursusId" INTEGER;

CREATE TABLE "ClassGroup" (
  "id" SERIAL NOT NULL,
  "classId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'TD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Cursus" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "classId" INTEGER,
  "version" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "clonedFromId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Cursus_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CursusYearAssignment" (
  "id" SERIAL NOT NULL,
  "classId" INTEGER NOT NULL,
  "academicYearId" INTEGER NOT NULL,
  "cursusId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CursusYearAssignment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AcademicClass"
  ADD CONSTRAINT "AcademicClass_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Module"
  ADD CONSTRAINT "Module_cursusId_fkey"
  FOREIGN KEY ("cursusId") REFERENCES "Cursus"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ClassGroup"
  ADD CONSTRAINT "ClassGroup_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Cursus"
  ADD CONSTRAINT "Cursus_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Cursus"
  ADD CONSTRAINT "Cursus_clonedFromId_fkey"
  FOREIGN KEY ("clonedFromId") REFERENCES "Cursus"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CursusYearAssignment"
  ADD CONSTRAINT "CursusYearAssignment_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CursusYearAssignment"
  ADD CONSTRAINT "CursusYearAssignment_academicYearId_fkey"
  FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CursusYearAssignment"
  ADD CONSTRAINT "CursusYearAssignment_cursusId_fkey"
  FOREIGN KEY ("cursusId") REFERENCES "Cursus"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "ClassGroup_classId_name_key" ON "ClassGroup"("classId", "name");
CREATE INDEX "ClassGroup_classId_idx" ON "ClassGroup"("classId");
CREATE INDEX "ClassGroup_type_idx" ON "ClassGroup"("type");
CREATE INDEX "AcademicYear_startYear_idx" ON "AcademicYear"("startYear");
CREATE INDEX "AcademicYear_endYear_idx" ON "AcademicYear"("endYear");
CREATE INDEX "AcademicClass_departmentId_idx" ON "AcademicClass"("departmentId");
CREATE INDEX "Module_cursusId_idx" ON "Module"("cursusId");
CREATE INDEX "Cursus_classId_idx" ON "Cursus"("classId");
CREATE INDEX "Cursus_isActive_idx" ON "Cursus"("isActive");
CREATE INDEX "Cursus_clonedFromId_idx" ON "Cursus"("clonedFromId");
CREATE UNIQUE INDEX "CursusYearAssignment_classId_academicYearId_key" ON "CursusYearAssignment"("classId", "academicYearId");
CREATE INDEX "CursusYearAssignment_classId_idx" ON "CursusYearAssignment"("classId");
CREATE INDEX "CursusYearAssignment_academicYearId_idx" ON "CursusYearAssignment"("academicYearId");
CREATE INDEX "CursusYearAssignment_cursusId_idx" ON "CursusYearAssignment"("cursusId");

INSERT INTO "Cursus" ("name", "classId", "version", "isActive", "createdAt", "updatedAt")
SELECT
  c."name" || ' cursus',
  c."id",
  1,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "AcademicClass" c
WHERE NOT EXISTS (
  SELECT 1 FROM "Cursus" existing WHERE existing."classId" = c."id"
);

UPDATE "Module" m
SET "cursusId" = c."id"
FROM "ModuleClass" mc
JOIN "Cursus" c ON c."classId" = mc."classId"
WHERE m."id" = mc."moduleId" AND m."cursusId" IS NULL;

INSERT INTO "CursusYearAssignment" ("classId", "academicYearId", "cursusId", "createdAt", "updatedAt")
SELECT DISTINCT
  c."id",
  ay."id",
  cu."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "AcademicClass" c
JOIN "Cursus" cu ON cu."classId" = c."id"
JOIN "AcademicYear" ay ON ay."label" = c."academicYear"
WHERE c."academicYear" IS NOT NULL
ON CONFLICT ("classId", "academicYearId") DO NOTHING;
