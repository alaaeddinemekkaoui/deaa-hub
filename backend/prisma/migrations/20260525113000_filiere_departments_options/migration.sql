CREATE TABLE "FiliereDepartment" (
  "id" SERIAL NOT NULL,
  "filiereId" INTEGER NOT NULL,
  "departmentId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FiliereDepartment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Option" ADD COLUMN "departmentId" INTEGER;

INSERT INTO "FiliereDepartment" ("filiereId", "departmentId", "createdAt")
SELECT DISTINCT "id", "departmentId", CURRENT_TIMESTAMP
FROM "Filiere"
ON CONFLICT DO NOTHING;

UPDATE "Option" o
SET "departmentId" = f."departmentId"
FROM "Filiere" f
WHERE o."filiereId" = f."id" AND o."departmentId" IS NULL;

ALTER TABLE "FiliereDepartment"
  ADD CONSTRAINT "FiliereDepartment_filiereId_fkey"
  FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FiliereDepartment"
  ADD CONSTRAINT "FiliereDepartment_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Option"
  ADD CONSTRAINT "Option_departmentId_fkey"
  FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Option_name_filiereId_key";
CREATE UNIQUE INDEX "FiliereDepartment_filiereId_departmentId_key" ON "FiliereDepartment"("filiereId", "departmentId");
CREATE INDEX "FiliereDepartment_filiereId_idx" ON "FiliereDepartment"("filiereId");
CREATE INDEX "FiliereDepartment_departmentId_idx" ON "FiliereDepartment"("departmentId");
CREATE UNIQUE INDEX "Option_name_filiereId_departmentId_key" ON "Option"("name", "filiereId", "departmentId");
CREATE INDEX "Option_departmentId_idx" ON "Option"("departmentId");
