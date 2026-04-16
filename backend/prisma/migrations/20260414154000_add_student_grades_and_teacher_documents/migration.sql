-- Make documents attachable to either students or teachers
ALTER TABLE "Document"
ALTER COLUMN "studentId" DROP NOT NULL;

ALTER TABLE "Document"
ADD COLUMN "teacherId" INTEGER;

CREATE INDEX "Document_teacherId_idx" ON "Document"("teacherId");

ALTER TABLE "Document"
ADD CONSTRAINT "Document_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Student grades / notes management
CREATE TABLE "StudentGrade" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "teacherId" INTEGER,
    "classId" INTEGER,
    "subject" TEXT NOT NULL,
    "semester" TEXT,
    "assessmentType" TEXT,
    "score" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "academicYear" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentGrade_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentGrade_studentId_idx" ON "StudentGrade"("studentId");
CREATE INDEX "StudentGrade_teacherId_idx" ON "StudentGrade"("teacherId");
CREATE INDEX "StudentGrade_classId_idx" ON "StudentGrade"("classId");
CREATE INDEX "StudentGrade_academicYear_idx" ON "StudentGrade"("academicYear");
CREATE INDEX "StudentGrade_subject_idx" ON "StudentGrade"("subject");

ALTER TABLE "StudentGrade"
ADD CONSTRAINT "StudentGrade_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentGrade"
ADD CONSTRAINT "StudentGrade_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentGrade"
ADD CONSTRAINT "StudentGrade_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
