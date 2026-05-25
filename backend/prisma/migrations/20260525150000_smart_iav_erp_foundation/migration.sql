-- Smart IAV ERP foundation: housing, document requests, APESA, exams,
-- validation parameters, workload tracking, and richer pedagogical metadata.

CREATE TYPE "HousingRequestStatus" AS ENUM ('pending', 'under_review', 'accepted', 'rejected', 'waiting_list');
CREATE TYPE "DocumentRequestStatus" AS ENUM ('pending', 'under_review', 'approved', 'generated', 'rejected', 'archived');
CREATE TYPE "ApesaChoiceStatus" AS ENUM ('submitted', 'under_review', 'validated', 'rejected');
CREATE TYPE "OnlineExamStatus" AS ENUM ('draft', 'scheduled', 'published', 'closed', 'archived');
CREATE TYPE "QuestionType" AS ENUM ('mcq', 'short_answer');
CREATE TYPE "ExamAttemptStatus" AS ENUM ('in_progress', 'submitted', 'corrected', 'cancelled');

ALTER TABLE "Module"
  ADD COLUMN "coefficient" DOUBLE PRECISION NOT NULL DEFAULT 1,
  ADD COLUMN "credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "volumeHoraire" INTEGER,
  ADD COLUMN "cmHours" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "tdHours" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "tpHours" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ElementModule"
  ADD COLUMN "credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "cmHours" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "tdHours" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "tpHours" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "HousingQuota" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "residence" TEXT NOT NULL,
  "building" TEXT,
  "capacity" INTEGER NOT NULL,
  "academicYear" TEXT NOT NULL,
  "departmentId" INTEGER,
  "gender" "Sex",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HousingQuota_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HousingRequest" (
  "id" SERIAL NOT NULL,
  "studentId" INTEGER NOT NULL,
  "academicYear" TEXT NOT NULL,
  "status" "HousingRequestStatus" NOT NULL DEFAULT 'pending',
  "scholarship" BOOLEAN NOT NULL DEFAULT false,
  "city" TEXT,
  "requestedResidence" TEXT,
  "observations" TEXT,
  "reviewedById" INTEGER,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HousingRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HousingDocument" (
  "id" SERIAL NOT NULL,
  "requestId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "documentType" TEXT NOT NULL,
  "mimeType" TEXT,
  "path" TEXT,
  "storageProvider" TEXT DEFAULT 'local',
  "bucket" TEXT,
  "objectKey" TEXT,
  "fileHash" TEXT,
  "size" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HousingDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HousingStatusHistory" (
  "id" SERIAL NOT NULL,
  "requestId" INTEGER NOT NULL,
  "fromStatus" "HousingRequestStatus",
  "toStatus" "HousingRequestStatus" NOT NULL,
  "comment" TEXT,
  "changedById" INTEGER,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HousingStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentRequest" (
  "id" SERIAL NOT NULL,
  "studentId" INTEGER NOT NULL,
  "documentTypeId" INTEGER,
  "type" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  "semester" TEXT,
  "status" "DocumentRequestStatus" NOT NULL DEFAULT 'pending',
  "requestPayload" JSONB,
  "qrVerificationCode" TEXT,
  "generatedDocumentId" INTEGER,
  "approvedById" INTEGER,
  "approvedAt" TIMESTAMP(3),
  "rejectedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentGeneration" (
  "id" SERIAL NOT NULL,
  "requestId" INTEGER,
  "actorUserId" INTEGER,
  "outputFormat" TEXT NOT NULL DEFAULT 'pdf',
  "templateId" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'generated',
  "variables" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentGeneration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentAcademicEvent" (
  "id" SERIAL NOT NULL,
  "studentId" INTEGER NOT NULL,
  "academicYear" TEXT NOT NULL,
  "semester" TEXT,
  "eventType" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentAcademicEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ValidationParameter" (
  "id" SERIAL NOT NULL,
  "academicYear" TEXT NOT NULL,
  "filiereId" INTEGER,
  "departmentId" INTEGER,
  "semester" TEXT,
  "moduleValidationThreshold" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "semesterValidationThreshold" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "compensationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "minimumCredits" DOUBLE PRECISION,
  "eliminationGrade" DOUBLE PRECISION,
  "absenceLimit" INTEGER,
  "apesaOrientationRules" JSONB,
  "effectiveFrom" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "updatedById" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ValidationParameter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApesaOrientation" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "academicYear" TEXT NOT NULL,
  "filiereId" INTEGER,
  "departmentId" INTEGER,
  "capacity" INTEGER NOT NULL,
  "prerequisites" JSONB,
  "minimumGrade" DOUBLE PRECISION,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApesaOrientation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApesaStudentChoice" (
  "id" SERIAL NOT NULL,
  "studentId" INTEGER NOT NULL,
  "orientationId" INTEGER NOT NULL,
  "academicYear" TEXT NOT NULL,
  "priority" INTEGER NOT NULL,
  "status" "ApesaChoiceStatus" NOT NULL DEFAULT 'submitted',
  "reviewedById" INTEGER,
  "reviewedAt" TIMESTAMP(3),
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApesaStudentChoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApesaAssignment" (
  "id" SERIAL NOT NULL,
  "studentId" INTEGER NOT NULL,
  "orientationId" INTEGER NOT NULL,
  "academicYear" TEXT NOT NULL,
  "assignedById" INTEGER,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "comment" TEXT,
  CONSTRAINT "ApesaAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApesaParameter" (
  "id" SERIAL NOT NULL,
  "academicYear" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApesaParameter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnlineExam" (
  "id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "academicYear" TEXT NOT NULL,
  "semester" TEXT,
  "moduleId" INTEGER,
  "classId" INTEGER,
  "filiereId" INTEGER,
  "departmentId" INTEGER,
  "createdById" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "durationMinutes" INTEGER,
  "status" "OnlineExamStatus" NOT NULL DEFAULT 'draft',
  "randomizeQuestions" BOOLEAN NOT NULL DEFAULT false,
  "antiCheatEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnlineExam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnlineExamQuestion" (
  "id" SERIAL NOT NULL,
  "examId" INTEGER NOT NULL,
  "type" "QuestionType" NOT NULL DEFAULT 'mcq',
  "prompt" TEXT NOT NULL,
  "options" JSONB,
  "correctAnswer" JSONB,
  "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnlineExamQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnlineExamAttempt" (
  "id" SERIAL NOT NULL,
  "examId" INTEGER NOT NULL,
  "studentId" INTEGER NOT NULL,
  "status" "ExamAttemptStatus" NOT NULL DEFAULT 'in_progress',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "score" DOUBLE PRECISION,
  "metadata" JSONB,
  CONSTRAINT "OnlineExamAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnlineExamAnswer" (
  "id" SERIAL NOT NULL,
  "attemptId" INTEGER NOT NULL,
  "questionId" INTEGER NOT NULL,
  "answer" JSONB,
  "score" DOUBLE PRECISION,
  "feedback" TEXT,
  "correctedAt" TIMESTAMP(3),
  CONSTRAINT "OnlineExamAnswer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeacherWorkload" (
  "id" SERIAL NOT NULL,
  "teacherId" INTEGER NOT NULL,
  "academicYear" TEXT NOT NULL,
  "semester" TEXT,
  "totalHours" INTEGER NOT NULL DEFAULT 0,
  "cmHours" INTEGER NOT NULL DEFAULT 0,
  "tdHours" INTEGER NOT NULL DEFAULT 0,
  "tpHours" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeacherWorkload_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CourseWorkload" (
  "id" SERIAL NOT NULL,
  "coursId" INTEGER NOT NULL,
  "academicYear" TEXT NOT NULL,
  "semester" TEXT,
  "plannedHours" INTEGER NOT NULL DEFAULT 0,
  "completedHours" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourseWorkload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HousingQuota_residence_building_academicYear_gender_key" ON "HousingQuota"("residence", "building", "academicYear", "gender");
CREATE INDEX "HousingQuota_academicYear_idx" ON "HousingQuota"("academicYear");
CREATE INDEX "HousingQuota_departmentId_idx" ON "HousingQuota"("departmentId");
CREATE UNIQUE INDEX "HousingRequest_studentId_academicYear_key" ON "HousingRequest"("studentId", "academicYear");
CREATE INDEX "HousingRequest_academicYear_idx" ON "HousingRequest"("academicYear");
CREATE INDEX "HousingRequest_status_idx" ON "HousingRequest"("status");
CREATE INDEX "HousingRequest_studentId_idx" ON "HousingRequest"("studentId");
CREATE INDEX "HousingRequest_reviewedById_idx" ON "HousingRequest"("reviewedById");
CREATE INDEX "HousingDocument_requestId_idx" ON "HousingDocument"("requestId");
CREATE INDEX "HousingDocument_documentType_idx" ON "HousingDocument"("documentType");
CREATE INDEX "HousingStatusHistory_requestId_idx" ON "HousingStatusHistory"("requestId");
CREATE INDEX "HousingStatusHistory_changedById_idx" ON "HousingStatusHistory"("changedById");
CREATE INDEX "HousingStatusHistory_changedAt_idx" ON "HousingStatusHistory"("changedAt");

CREATE UNIQUE INDEX "DocumentRequest_qrVerificationCode_key" ON "DocumentRequest"("qrVerificationCode");
CREATE UNIQUE INDEX "DocumentRequest_generatedDocumentId_key" ON "DocumentRequest"("generatedDocumentId");
CREATE INDEX "DocumentRequest_studentId_idx" ON "DocumentRequest"("studentId");
CREATE INDEX "DocumentRequest_documentTypeId_idx" ON "DocumentRequest"("documentTypeId");
CREATE INDEX "DocumentRequest_academicYear_idx" ON "DocumentRequest"("academicYear");
CREATE INDEX "DocumentRequest_semester_idx" ON "DocumentRequest"("semester");
CREATE INDEX "DocumentRequest_status_idx" ON "DocumentRequest"("status");
CREATE INDEX "DocumentGeneration_requestId_idx" ON "DocumentGeneration"("requestId");
CREATE INDEX "DocumentGeneration_actorUserId_idx" ON "DocumentGeneration"("actorUserId");
CREATE INDEX "DocumentGeneration_templateId_idx" ON "DocumentGeneration"("templateId");
CREATE INDEX "DocumentGeneration_generatedAt_idx" ON "DocumentGeneration"("generatedAt");

CREATE INDEX "StudentAcademicEvent_studentId_idx" ON "StudentAcademicEvent"("studentId");
CREATE INDEX "StudentAcademicEvent_academicYear_idx" ON "StudentAcademicEvent"("academicYear");
CREATE INDEX "StudentAcademicEvent_semester_idx" ON "StudentAcademicEvent"("semester");
CREATE INDEX "StudentAcademicEvent_eventType_idx" ON "StudentAcademicEvent"("eventType");
CREATE INDEX "StudentAcademicEvent_occurredAt_idx" ON "StudentAcademicEvent"("occurredAt");

CREATE INDEX "ValidationParameter_academicYear_idx" ON "ValidationParameter"("academicYear");
CREATE INDEX "ValidationParameter_filiereId_idx" ON "ValidationParameter"("filiereId");
CREATE INDEX "ValidationParameter_departmentId_idx" ON "ValidationParameter"("departmentId");
CREATE INDEX "ValidationParameter_semester_idx" ON "ValidationParameter"("semester");
CREATE INDEX "ValidationParameter_archivedAt_idx" ON "ValidationParameter"("archivedAt");

CREATE UNIQUE INDEX "ApesaOrientation_code_academicYear_key" ON "ApesaOrientation"("code", "academicYear");
CREATE INDEX "ApesaOrientation_academicYear_idx" ON "ApesaOrientation"("academicYear");
CREATE INDEX "ApesaOrientation_filiereId_idx" ON "ApesaOrientation"("filiereId");
CREATE INDEX "ApesaOrientation_departmentId_idx" ON "ApesaOrientation"("departmentId");
CREATE INDEX "ApesaOrientation_active_idx" ON "ApesaOrientation"("active");
CREATE UNIQUE INDEX "ApesaStudentChoice_studentId_academicYear_priority_key" ON "ApesaStudentChoice"("studentId", "academicYear", "priority");
CREATE UNIQUE INDEX "ApesaStudentChoice_studentId_academicYear_orientationId_key" ON "ApesaStudentChoice"("studentId", "academicYear", "orientationId");
CREATE INDEX "ApesaStudentChoice_academicYear_idx" ON "ApesaStudentChoice"("academicYear");
CREATE INDEX "ApesaStudentChoice_status_idx" ON "ApesaStudentChoice"("status");
CREATE INDEX "ApesaStudentChoice_reviewedById_idx" ON "ApesaStudentChoice"("reviewedById");
CREATE UNIQUE INDEX "ApesaAssignment_studentId_academicYear_key" ON "ApesaAssignment"("studentId", "academicYear");
CREATE INDEX "ApesaAssignment_orientationId_idx" ON "ApesaAssignment"("orientationId");
CREATE INDEX "ApesaAssignment_academicYear_idx" ON "ApesaAssignment"("academicYear");
CREATE INDEX "ApesaAssignment_assignedById_idx" ON "ApesaAssignment"("assignedById");
CREATE UNIQUE INDEX "ApesaParameter_academicYear_key_key" ON "ApesaParameter"("academicYear", "key");
CREATE INDEX "ApesaParameter_academicYear_idx" ON "ApesaParameter"("academicYear");

CREATE INDEX "OnlineExam_academicYear_idx" ON "OnlineExam"("academicYear");
CREATE INDEX "OnlineExam_semester_idx" ON "OnlineExam"("semester");
CREATE INDEX "OnlineExam_moduleId_idx" ON "OnlineExam"("moduleId");
CREATE INDEX "OnlineExam_classId_idx" ON "OnlineExam"("classId");
CREATE INDEX "OnlineExam_filiereId_idx" ON "OnlineExam"("filiereId");
CREATE INDEX "OnlineExam_departmentId_idx" ON "OnlineExam"("departmentId");
CREATE INDEX "OnlineExam_createdById_idx" ON "OnlineExam"("createdById");
CREATE INDEX "OnlineExam_status_idx" ON "OnlineExam"("status");
CREATE INDEX "OnlineExamQuestion_examId_idx" ON "OnlineExamQuestion"("examId");
CREATE INDEX "OnlineExamQuestion_type_idx" ON "OnlineExamQuestion"("type");
CREATE UNIQUE INDEX "OnlineExamAttempt_examId_studentId_key" ON "OnlineExamAttempt"("examId", "studentId");
CREATE INDEX "OnlineExamAttempt_examId_idx" ON "OnlineExamAttempt"("examId");
CREATE INDEX "OnlineExamAttempt_studentId_idx" ON "OnlineExamAttempt"("studentId");
CREATE INDEX "OnlineExamAttempt_status_idx" ON "OnlineExamAttempt"("status");
CREATE UNIQUE INDEX "OnlineExamAnswer_attemptId_questionId_key" ON "OnlineExamAnswer"("attemptId", "questionId");
CREATE INDEX "OnlineExamAnswer_questionId_idx" ON "OnlineExamAnswer"("questionId");

CREATE UNIQUE INDEX "TeacherWorkload_teacherId_academicYear_semester_key" ON "TeacherWorkload"("teacherId", "academicYear", "semester");
CREATE INDEX "TeacherWorkload_academicYear_idx" ON "TeacherWorkload"("academicYear");
CREATE INDEX "TeacherWorkload_semester_idx" ON "TeacherWorkload"("semester");
CREATE UNIQUE INDEX "CourseWorkload_coursId_academicYear_semester_key" ON "CourseWorkload"("coursId", "academicYear", "semester");
CREATE INDEX "CourseWorkload_academicYear_idx" ON "CourseWorkload"("academicYear");
CREATE INDEX "CourseWorkload_semester_idx" ON "CourseWorkload"("semester");

ALTER TABLE "HousingQuota" ADD CONSTRAINT "HousingQuota_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HousingRequest" ADD CONSTRAINT "HousingRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HousingRequest" ADD CONSTRAINT "HousingRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HousingDocument" ADD CONSTRAINT "HousingDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "HousingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HousingStatusHistory" ADD CONSTRAINT "HousingStatusHistory_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "HousingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HousingStatusHistory" ADD CONSTRAINT "HousingStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_generatedDocumentId_fkey" FOREIGN KEY ("generatedDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DocumentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentGeneration" ADD CONSTRAINT "DocumentGeneration_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StudentAcademicEvent" ADD CONSTRAINT "StudentAcademicEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ValidationParameter" ADD CONSTRAINT "ValidationParameter_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ValidationParameter" ADD CONSTRAINT "ValidationParameter_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ValidationParameter" ADD CONSTRAINT "ValidationParameter_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ApesaOrientation" ADD CONSTRAINT "ApesaOrientation_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApesaOrientation" ADD CONSTRAINT "ApesaOrientation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApesaStudentChoice" ADD CONSTRAINT "ApesaStudentChoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApesaStudentChoice" ADD CONSTRAINT "ApesaStudentChoice_orientationId_fkey" FOREIGN KEY ("orientationId") REFERENCES "ApesaOrientation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApesaStudentChoice" ADD CONSTRAINT "ApesaStudentChoice_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApesaAssignment" ADD CONSTRAINT "ApesaAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApesaAssignment" ADD CONSTRAINT "ApesaAssignment_orientationId_fkey" FOREIGN KEY ("orientationId") REFERENCES "ApesaOrientation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApesaAssignment" ADD CONSTRAINT "ApesaAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OnlineExam" ADD CONSTRAINT "OnlineExam_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnlineExam" ADD CONSTRAINT "OnlineExam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnlineExam" ADD CONSTRAINT "OnlineExam_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnlineExam" ADD CONSTRAINT "OnlineExam_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnlineExam" ADD CONSTRAINT "OnlineExam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OnlineExamQuestion" ADD CONSTRAINT "OnlineExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "OnlineExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlineExamAttempt" ADD CONSTRAINT "OnlineExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "OnlineExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlineExamAttempt" ADD CONSTRAINT "OnlineExamAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlineExamAnswer" ADD CONSTRAINT "OnlineExamAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "OnlineExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlineExamAnswer" ADD CONSTRAINT "OnlineExamAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "OnlineExamQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeacherWorkload" ADD CONSTRAINT "TeacherWorkload_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CourseWorkload" ADD CONSTRAINT "CourseWorkload_coursId_fkey" FOREIGN KEY ("coursId") REFERENCES "Cours"("id") ON DELETE CASCADE ON UPDATE CASCADE;
