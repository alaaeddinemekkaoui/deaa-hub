-- AlterTable
ALTER TABLE "ElementModule" ADD COLUMN     "classId" INTEGER;

-- CreateIndex
CREATE INDEX "ElementModule_classId_idx" ON "ElementModule"("classId");

-- AddForeignKey
ALTER TABLE "ElementModule" ADD CONSTRAINT "ElementModule_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
