-- Remove class-level academic year (scolarite)
DROP INDEX IF EXISTS "AcademicClass_name_year_academicYear_key";
DROP INDEX IF EXISTS "AcademicClass_academicYear_idx";

ALTER TABLE "AcademicClass"
DROP COLUMN IF EXISTS "academicYear";

CREATE UNIQUE INDEX "AcademicClass_name_year_key" ON "AcademicClass"("name", "year");
