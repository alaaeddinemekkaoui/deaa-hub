-- Add first/last name support on students and identity fields on teachers
ALTER TABLE "Student"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT;

-- Backfill student first/last names from fullName when possible
UPDATE "Student"
SET
  "firstName" = COALESCE(NULLIF(split_part("fullName", ' ', 1), ''), "fullName"),
  "lastName" = NULLIF(trim(regexp_replace("fullName", '^\S+\s*', '')), '')
WHERE "firstName" IS NULL OR "lastName" IS NULL;

ALTER TABLE "Teacher"
ADD COLUMN "cin" TEXT,
ADD COLUMN "dateInscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Ensure older teachers keep a consistent inscription date baseline
UPDATE "Teacher"
SET "dateInscription" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "dateInscription" IS NULL;

CREATE UNIQUE INDEX "Teacher_cin_key" ON "Teacher"("cin");