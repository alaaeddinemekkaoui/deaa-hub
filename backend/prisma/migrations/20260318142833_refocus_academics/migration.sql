/*
  Warnings:

  - Added the required column `cycle` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StudentCycle" AS ENUM ('prepa', 'engineer', 'veterinary');

-- CreateEnum
CREATE TYPE "PrepaYear" AS ENUM ('prepa_1', 'prepa_2');

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_filiereId_fkey";

-- AlterTable
ALTER TABLE "Filiere" ADD COLUMN     "filiereType" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "classId" INTEGER,
ADD COLUMN     "cycle" "StudentCycle" NOT NULL,
ADD COLUMN     "prepaTrack" TEXT,
ADD COLUMN     "prepaYear" "PrepaYear",
ADD COLUMN     "studyField" TEXT,
ALTER COLUMN "filiereId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AcademicClass" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "filiereId" INTEGER,
    "classType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherClass" (
    "id" SERIAL NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicClass_year_idx" ON "AcademicClass"("year");

-- CreateIndex
CREATE INDEX "AcademicClass_filiereId_idx" ON "AcademicClass"("filiereId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicClass_name_year_key" ON "AcademicClass"("name", "year");

-- CreateIndex
CREATE INDEX "TeacherClass_teacherId_idx" ON "TeacherClass"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherClass_classId_idx" ON "TeacherClass"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherClass_teacherId_classId_key" ON "TeacherClass"("teacherId", "classId");

-- CreateIndex
CREATE INDEX "Student_classId_idx" ON "Student"("classId");

-- CreateIndex
CREATE INDEX "Student_cycle_idx" ON "Student"("cycle");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicClass" ADD CONSTRAINT "AcademicClass_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClass" ADD CONSTRAINT "TeacherClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherClass" ADD CONSTRAINT "TeacherClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
