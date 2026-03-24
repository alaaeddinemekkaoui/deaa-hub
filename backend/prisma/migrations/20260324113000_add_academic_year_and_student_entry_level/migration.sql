-- Add new student cycle values for postgraduate flows.
ALTER TYPE "StudentCycle" ADD VALUE IF NOT EXISTS 'master';
ALTER TYPE "StudentCycle" ADD VALUE IF NOT EXISTS 'doctorate';

-- Track direct entry level for non-prepa students.
ALTER TABLE "Student"
ADD COLUMN "entryLevel" INTEGER;

-- Add academic year to classes with a safe backfill for existing rows.
ALTER TABLE "AcademicClass"
ADD COLUMN "academicYear" TEXT;

UPDATE "AcademicClass"
SET "academicYear" = '2025/2026'
WHERE "academicYear" IS NULL;

ALTER TABLE "AcademicClass"
ALTER COLUMN "academicYear" SET NOT NULL;

-- Replace the old uniqueness rule with the expanded one.
DROP INDEX "AcademicClass_name_year_key";

CREATE INDEX "AcademicClass_academicYear_idx" ON "AcademicClass"("academicYear");
CREATE UNIQUE INDEX "AcademicClass_name_year_academicYear_key"
ON "AcademicClass"("name", "year", "academicYear");
