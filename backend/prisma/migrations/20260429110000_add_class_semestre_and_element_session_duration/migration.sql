ALTER TABLE "AcademicClass" ADD COLUMN "semestre" TEXT;

ALTER TABLE "ElementModule" ADD COLUMN "sessionDurationMinutes" INTEGER;

ALTER TABLE "AcademicClass" DROP CONSTRAINT IF EXISTS "AcademicClass_name_year_key";

CREATE UNIQUE INDEX "AcademicClass_name_year_semestre_key" ON "AcademicClass"("name", "year", "semestre");

CREATE INDEX "AcademicClass_semestre_idx" ON "AcademicClass"("semestre");
