-- CreateEnum
CREATE TYPE "AccreditationPlanStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateTable
CREATE TABLE "AccreditationPlan" (
	"id" SERIAL NOT NULL,
	"name" TEXT NOT NULL,
	"academicYear" TEXT NOT NULL,
	"levelYear" INTEGER,
	"filiereId" INTEGER,
	"optionId" INTEGER,
	"cycleId" INTEGER,
	"status" "AccreditationPlanStatus" NOT NULL DEFAULT 'draft',
	"sourcePlanId" INTEGER,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "AccreditationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccreditationPlanLine" (
	"id" SERIAL NOT NULL,
	"planId" INTEGER NOT NULL,
	"coursId" INTEGER NOT NULL,
	"moduleId" INTEGER,
	"elementId" INTEGER,
	"semestre" TEXT,
	"volumeHoraire" INTEGER,
	"isMandatory" BOOLEAN NOT NULL DEFAULT true,
	"originLineId" INTEGER,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "AccreditationPlanLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassAccreditationAssignment" (
	"id" SERIAL NOT NULL,
	"classId" INTEGER NOT NULL,
	"academicYear" TEXT NOT NULL,
	"planId" INTEGER NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "ClassAccreditationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccreditationPlan_name_academicYear_key" ON "AccreditationPlan"("name", "academicYear");

-- CreateIndex
CREATE INDEX "AccreditationPlan_academicYear_idx" ON "AccreditationPlan"("academicYear");

-- CreateIndex
CREATE INDEX "AccreditationPlan_filiereId_idx" ON "AccreditationPlan"("filiereId");

-- CreateIndex
CREATE INDEX "AccreditationPlan_optionId_idx" ON "AccreditationPlan"("optionId");

-- CreateIndex
CREATE INDEX "AccreditationPlan_cycleId_idx" ON "AccreditationPlan"("cycleId");

-- CreateIndex
CREATE INDEX "AccreditationPlan_status_idx" ON "AccreditationPlan"("status");

-- CreateIndex
CREATE INDEX "AccreditationPlan_sourcePlanId_idx" ON "AccreditationPlan"("sourcePlanId");

-- CreateIndex
CREATE UNIQUE INDEX "AccreditationPlanLine_planId_coursId_key" ON "AccreditationPlanLine"("planId", "coursId");

-- CreateIndex
CREATE INDEX "AccreditationPlanLine_planId_idx" ON "AccreditationPlanLine"("planId");

-- CreateIndex
CREATE INDEX "AccreditationPlanLine_coursId_idx" ON "AccreditationPlanLine"("coursId");

-- CreateIndex
CREATE INDEX "AccreditationPlanLine_moduleId_idx" ON "AccreditationPlanLine"("moduleId");

-- CreateIndex
CREATE INDEX "AccreditationPlanLine_elementId_idx" ON "AccreditationPlanLine"("elementId");

-- CreateIndex
CREATE INDEX "AccreditationPlanLine_originLineId_idx" ON "AccreditationPlanLine"("originLineId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassAccreditationAssignment_classId_academicYear_key" ON "ClassAccreditationAssignment"("classId", "academicYear");

-- CreateIndex
CREATE INDEX "ClassAccreditationAssignment_classId_idx" ON "ClassAccreditationAssignment"("classId");

-- CreateIndex
CREATE INDEX "ClassAccreditationAssignment_planId_idx" ON "ClassAccreditationAssignment"("planId");

-- CreateIndex
CREATE INDEX "ClassAccreditationAssignment_academicYear_idx" ON "ClassAccreditationAssignment"("academicYear");

-- AddForeignKey
ALTER TABLE "AccreditationPlan" ADD CONSTRAINT "AccreditationPlan_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationPlan" ADD CONSTRAINT "AccreditationPlan_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationPlan" ADD CONSTRAINT "AccreditationPlan_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationPlan" ADD CONSTRAINT "AccreditationPlan_sourcePlanId_fkey" FOREIGN KEY ("sourcePlanId") REFERENCES "AccreditationPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationPlanLine" ADD CONSTRAINT "AccreditationPlanLine_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AccreditationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationPlanLine" ADD CONSTRAINT "AccreditationPlanLine_coursId_fkey" FOREIGN KEY ("coursId") REFERENCES "Cours"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationPlanLine" ADD CONSTRAINT "AccreditationPlanLine_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationPlanLine" ADD CONSTRAINT "AccreditationPlanLine_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "ElementModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccreditationPlanLine" ADD CONSTRAINT "AccreditationPlanLine_originLineId_fkey" FOREIGN KEY ("originLineId") REFERENCES "AccreditationPlanLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAccreditationAssignment" ADD CONSTRAINT "ClassAccreditationAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassAccreditationAssignment" ADD CONSTRAINT "ClassAccreditationAssignment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AccreditationPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
