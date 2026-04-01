-- CreateEnum
CREATE TYPE "ElementType" AS ENUM ('CM', 'TD', 'TP');

-- AlterTable
ALTER TABLE "AcademicClass" ADD COLUMN     "optionId" INTEGER;

-- CreateTable
CREATE TABLE "Option" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "filiereId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "semestre" TEXT,
    "filiereId" INTEGER,
    "optionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElementModule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "volumeHoraire" INTEGER,
    "type" "ElementType" NOT NULL DEFAULT 'CM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElementModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimetableSession" (
    "id" SERIAL NOT NULL,
    "elementId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "teacherId" INTEGER,
    "roomId" INTEGER,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimetableSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Option_filiereId_idx" ON "Option"("filiereId");

-- CreateIndex
CREATE UNIQUE INDEX "Option_name_filiereId_key" ON "Option"("name", "filiereId");

-- CreateIndex
CREATE INDEX "Module_filiereId_idx" ON "Module"("filiereId");

-- CreateIndex
CREATE INDEX "Module_optionId_idx" ON "Module"("optionId");

-- CreateIndex
CREATE INDEX "ElementModule_moduleId_idx" ON "ElementModule"("moduleId");

-- CreateIndex
CREATE INDEX "TimetableSession_classId_idx" ON "TimetableSession"("classId");

-- CreateIndex
CREATE INDEX "TimetableSession_teacherId_idx" ON "TimetableSession"("teacherId");

-- CreateIndex
CREATE INDEX "TimetableSession_roomId_idx" ON "TimetableSession"("roomId");

-- CreateIndex
CREATE INDEX "TimetableSession_elementId_idx" ON "TimetableSession"("elementId");

-- CreateIndex
CREATE INDEX "TimetableSession_dayOfWeek_idx" ON "TimetableSession"("dayOfWeek");

-- CreateIndex
CREATE INDEX "TimetableSession_weekStart_idx" ON "TimetableSession"("weekStart");

-- CreateIndex
CREATE INDEX "AcademicClass_optionId_idx" ON "AcademicClass"("optionId");

-- AddForeignKey
ALTER TABLE "AcademicClass" ADD CONSTRAINT "AcademicClass_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElementModule" ADD CONSTRAINT "ElementModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSession" ADD CONSTRAINT "TimetableSession_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "ElementModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSession" ADD CONSTRAINT "TimetableSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSession" ADD CONSTRAINT "TimetableSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimetableSession" ADD CONSTRAINT "TimetableSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
