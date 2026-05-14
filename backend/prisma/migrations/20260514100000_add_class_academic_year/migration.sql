-- Add the academic/school year label used by class management filters and forms.
ALTER TABLE "AcademicClass" ADD COLUMN "academicYear" TEXT;

UPDATE "AcademicClass"
SET "academicYear" = CONCAT("year"::text, '/', ("year" + 1)::text)
WHERE "academicYear" IS NULL;

DROP INDEX IF EXISTS "AcademicClass_name_year_semestre_key";
CREATE UNIQUE INDEX "AcademicClass_name_year_semestre_academicYear_key"
ON "AcademicClass"("name", "year", "semestre", "academicYear");
CREATE INDEX "AcademicClass_academicYear_idx" ON "AcademicClass"("academicYear");
