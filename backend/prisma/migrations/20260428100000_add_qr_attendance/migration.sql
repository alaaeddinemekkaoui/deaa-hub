-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'pending');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('qr', 'manual');

-- AlterTable
ALTER TABLE "TimetableSession"
ADD COLUMN "attendanceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "attendanceTokenHash" TEXT,
ADD COLUMN "attendanceEnabledAt" TIMESTAMP(3),
ADD COLUMN "attendanceDeadline" TIMESTAMP(3),
ADD COLUMN "attendanceClosedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
  "id" SERIAL NOT NULL,
  "studentId" INTEGER NOT NULL,
  "courseId" INTEGER,
  "sessionId" INTEGER NOT NULL,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'pending',
  "timestamp" TIMESTAMP(3),
  "validatedById" INTEGER,
  "method" "AttendanceMethod" NOT NULL DEFAULT 'qr',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimetableSession_attendanceTokenHash_key" ON "TimetableSession"("attendanceTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_studentId_sessionId_key" ON "AttendanceRecord"("studentId", "sessionId");

-- CreateIndex
CREATE INDEX "TimetableSession_attendanceEnabled_idx" ON "TimetableSession"("attendanceEnabled");

-- CreateIndex
CREATE INDEX "TimetableSession_attendanceDeadline_idx" ON "TimetableSession"("attendanceDeadline");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_idx" ON "AttendanceRecord"("studentId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_courseId_idx" ON "AttendanceRecord"("courseId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_sessionId_idx" ON "AttendanceRecord"("sessionId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_status_idx" ON "AttendanceRecord"("status");

-- CreateIndex
CREATE INDEX "AttendanceRecord_timestamp_idx" ON "AttendanceRecord"("timestamp");

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Cours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TimetableSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
