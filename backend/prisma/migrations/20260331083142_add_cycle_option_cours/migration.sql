-- AlterTable
ALTER TABLE "AcademicClass" ADD COLUMN     "cycle" TEXT,
ADD COLUMN     "option" TEXT;

-- CreateTable
CREATE TABLE "Cours" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursClass" (
    "id" SERIAL NOT NULL,
    "coursId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "teacherId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoursClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cours_name_key" ON "Cours"("name");

-- CreateIndex
CREATE INDEX "Cours_name_idx" ON "Cours"("name");

-- CreateIndex
CREATE INDEX "CoursClass_coursId_idx" ON "CoursClass"("coursId");

-- CreateIndex
CREATE INDEX "CoursClass_classId_idx" ON "CoursClass"("classId");

-- CreateIndex
CREATE INDEX "CoursClass_teacherId_idx" ON "CoursClass"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "CoursClass_coursId_classId_key" ON "CoursClass"("coursId", "classId");

-- AddForeignKey
ALTER TABLE "CoursClass" ADD CONSTRAINT "CoursClass_coursId_fkey" FOREIGN KEY ("coursId") REFERENCES "Cours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursClass" ADD CONSTRAINT "CoursClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursClass" ADD CONSTRAINT "CoursClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
