/*
  Warnings:

  - Added the required column `firstYearEntry` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sex` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('male', 'female');

-- AlterTable
ALTER TABLE "Student"
ADD COLUMN     "firstYearEntry" INTEGER,
ADD COLUMN     "sex" "Sex";

-- Backfill existing rows before enforcing NOT NULL
UPDATE "Student"
SET "firstYearEntry" = COALESCE(
  "firstYearEntry",
  NULLIF(SUBSTRING("anneeAcademique" FROM '^\\d{4}'), '')::INTEGER,
  EXTRACT(YEAR FROM "dateInscription")::INTEGER,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
);

UPDATE "Student"
SET "sex" = COALESCE("sex", 'male'::"Sex");

ALTER TABLE "Student"
ALTER COLUMN "firstYearEntry" SET NOT NULL,
ALTER COLUMN "sex" SET NOT NULL;

-- CreateTable
CREATE TABLE "StudentClassHistory" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "academicYear" TEXT NOT NULL,
    "studyYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentClassHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentClassHistory_studentId_idx" ON "StudentClassHistory"("studentId");

-- CreateIndex
CREATE INDEX "StudentClassHistory_classId_idx" ON "StudentClassHistory"("classId");

-- CreateIndex
CREATE INDEX "StudentClassHistory_academicYear_idx" ON "StudentClassHistory"("academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "StudentClassHistory_studentId_academicYear_key" ON "StudentClassHistory"("studentId", "academicYear");

-- CreateIndex
CREATE INDEX "Student_sex_idx" ON "Student"("sex");

-- CreateIndex
CREATE INDEX "Student_firstYearEntry_idx" ON "Student"("firstYearEntry");

-- AddForeignKey
ALTER TABLE "StudentClassHistory" ADD CONSTRAINT "StudentClassHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentClassHistory" ADD CONSTRAINT "StudentClassHistory_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
