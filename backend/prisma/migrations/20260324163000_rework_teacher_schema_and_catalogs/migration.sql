-- Create teacher role and grade catalogs managed by admins.
CREATE TABLE "TeacherRole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherGrade" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherGrade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherRole_name_key" ON "TeacherRole"("name");
CREATE UNIQUE INDEX "TeacherGrade_name_key" ON "TeacherGrade"("name");

INSERT INTO "TeacherRole" ("name", "updatedAt")
VALUES
    ('Teacher', CURRENT_TIMESTAMP),
    ('Chef de Filiere', CURRENT_TIMESTAMP),
    ('Chef de Departement', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "TeacherGrade" ("name", "updatedAt")
VALUES
    ('Maitre de conferences', CURRENT_TIMESTAMP),
    ('Professeur habilite', CURRENT_TIMESTAMP),
    ('Professeur de l''enseignement superieur', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- Expand teachers with structured identity and catalog relations.
ALTER TABLE "Teacher"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "phoneNumber" TEXT,
ADD COLUMN "roleId" INTEGER,
ADD COLUMN "gradeId" INTEGER;

UPDATE "Teacher"
SET
    "firstName" = COALESCE(
        NULLIF(TRIM(SPLIT_PART("name", ' ', 1)), ''),
        'Unknown'
    ),
    "lastName" = COALESCE(
        NULLIF(TRIM(REGEXP_REPLACE("name", '^\S+\s*', '')), ''),
        NULLIF(TRIM(SPLIT_PART("name", ' ', 1)), ''),
        'Teacher'
    ),
    "email" = CASE
        WHEN "contact" IS NOT NULL AND POSITION('@' IN "contact") > 0
            THEN LOWER(TRIM("contact"))
        ELSE NULL
    END,
    "phoneNumber" = CASE
        WHEN "contact" IS NOT NULL AND POSITION('@' IN "contact") = 0
            THEN NULLIF(TRIM("contact"), '')
        ELSE NULL
    END,
    "roleId" = (
        SELECT "id"
        FROM "TeacherRole"
        WHERE "name" = 'Teacher'
        LIMIT 1
    ),
    "gradeId" = (
        SELECT "id"
        FROM "TeacherGrade"
        WHERE "name" = 'Maitre de conferences'
        LIMIT 1
    )
WHERE "firstName" IS NULL
   OR "lastName" IS NULL
   OR "roleId" IS NULL
   OR "gradeId" IS NULL;

WITH duplicate_emails AS (
    SELECT "email"
    FROM "Teacher"
    WHERE "email" IS NOT NULL
    GROUP BY "email"
    HAVING COUNT(*) > 1
)
UPDATE "Teacher"
SET "email" = NULL
WHERE "email" IN (SELECT "email" FROM duplicate_emails);

ALTER TABLE "Teacher"
ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL,
ALTER COLUMN "roleId" SET NOT NULL,
ALTER COLUMN "gradeId" SET NOT NULL;

ALTER TABLE "Teacher"
ADD CONSTRAINT "Teacher_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "TeacherRole"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Teacher"
ADD CONSTRAINT "Teacher_gradeId_fkey"
FOREIGN KEY ("gradeId") REFERENCES "TeacherGrade"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Teacher_email_key" ON "Teacher"("email");
CREATE INDEX "Teacher_roleId_idx" ON "Teacher"("roleId");
CREATE INDEX "Teacher_gradeId_idx" ON "Teacher"("gradeId");
CREATE INDEX "Teacher_lastName_firstName_idx" ON "Teacher"("lastName", "firstName");

ALTER TABLE "Teacher"
DROP COLUMN "name",
DROP COLUMN "type",
DROP COLUMN "contact";

DROP TYPE IF EXISTS "TeacherType";
