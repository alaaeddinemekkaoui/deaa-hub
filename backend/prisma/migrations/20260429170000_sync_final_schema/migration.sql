DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GroupType') THEN
    CREATE TYPE "GroupType" AS ENUM ('EVERYONE', 'ADMINS_ONLY', 'FILIERE', 'DEPARTMENT', 'CYCLE', 'CUSTOM', 'CLASS');
  END IF;
END $$;

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'inspector';
ALTER TYPE "WorkflowStatus" ADD VALUE IF NOT EXISTS 'refused';

DROP INDEX IF EXISTS "AcademicClass_name_year_key";
ALTER TABLE "AcademicClass" DROP COLUMN IF EXISTS "cycle";
ALTER TABLE "AcademicClass" ADD COLUMN IF NOT EXISTS "cycleId" INTEGER;

ALTER TABLE "Cours" ADD COLUMN IF NOT EXISTS "elementModuleId" INTEGER;
ALTER TABLE "Cours" ADD COLUMN IF NOT EXISTS "type" "ElementType" NOT NULL DEFAULT 'CM';

ALTER TABLE "CoursClass" ADD COLUMN IF NOT EXISTS "groupLabel" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Meal" ADD COLUMN IF NOT EXISTS "serviceStartTime" TEXT;
ALTER TABLE "Meal" ADD COLUMN IF NOT EXISTS "serviceEndTime" TEXT;
ALTER TABLE "RoomReservation" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "codeEtudiant" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "photoPath" TEXT;
ALTER TABLE "StudentClassHistory" ADD COLUMN IF NOT EXISTS "semestre" TEXT;
ALTER TABLE "Teacher" ADD COLUMN IF NOT EXISTS "photoPath" TEXT;
ALTER TABLE "WorkflowTask" ADD COLUMN IF NOT EXISTS "documentTypeId" INTEGER;

DROP TYPE IF EXISTS "MealType";

CREATE TABLE IF NOT EXISTS "StudentObservation" (
  "id" SERIAL NOT NULL,
  "studentId" INTEGER NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentObservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AcademicYear" (
  "id" SERIAL NOT NULL,
  "label" TEXT NOT NULL,
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ModuleClass" (
  "moduleId" INTEGER NOT NULL,
  "classId" INTEGER NOT NULL,
  CONSTRAINT "ModuleClass_pkey" PRIMARY KEY ("moduleId","classId")
);

CREATE TABLE IF NOT EXISTS "DocumentType" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProfileDocumentType" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfileDocumentType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MessageGroup" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "type" "GroupType" NOT NULL,
  "referenceId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MessageGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MessageGroupMember" (
  "groupId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "canSend" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "MessageGroupMember_pkey" PRIMARY KEY ("groupId","userId")
);

CREATE TABLE IF NOT EXISTS "Message" (
  "id" SERIAL NOT NULL,
  "senderId" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "fileUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recipientId" INTEGER,
  "groupId" INTEGER,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "messageId" INTEGER,
  "type" TEXT NOT NULL DEFAULT 'message',
  "content" TEXT NOT NULL,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TimetableHoliday" (
  "id" SERIAL NOT NULL,
  "date" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimetableHoliday_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudentObservation_studentId_idx" ON "StudentObservation"("studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "AcademicYear_label_key" ON "AcademicYear"("label");
CREATE INDEX IF NOT EXISTS "AcademicYear_isCurrent_idx" ON "AcademicYear"("isCurrent");
CREATE INDEX IF NOT EXISTS "ModuleClass_moduleId_idx" ON "ModuleClass"("moduleId");
CREATE INDEX IF NOT EXISTS "ModuleClass_classId_idx" ON "ModuleClass"("classId");
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentType_name_key" ON "DocumentType"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "ProfileDocumentType_name_key" ON "ProfileDocumentType"("name");
CREATE INDEX IF NOT EXISTS "MessageGroup_type_idx" ON "MessageGroup"("type");
CREATE INDEX IF NOT EXISTS "MessageGroup_referenceId_idx" ON "MessageGroup"("referenceId");
CREATE INDEX IF NOT EXISTS "MessageGroupMember_userId_idx" ON "MessageGroupMember"("userId");
CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX IF NOT EXISTS "Message_recipientId_idx" ON "Message"("recipientId");
CREATE INDEX IF NOT EXISTS "Message_groupId_idx" ON "Message"("groupId");
CREATE INDEX IF NOT EXISTS "Message_createdAt_idx" ON "Message"("createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "TimetableHoliday_date_key" ON "TimetableHoliday"("date");
CREATE INDEX IF NOT EXISTS "TimetableHoliday_date_idx" ON "TimetableHoliday"("date");
CREATE INDEX IF NOT EXISTS "AcademicClass_cycleId_idx" ON "AcademicClass"("cycleId");
CREATE UNIQUE INDEX IF NOT EXISTS "Cours_elementModuleId_key" ON "Cours"("elementModuleId");
CREATE INDEX IF NOT EXISTS "Cours_elementModuleId_idx" ON "Cours"("elementModuleId");
CREATE UNIQUE INDEX IF NOT EXISTS "Student_codeEtudiant_key" ON "Student"("codeEtudiant");
CREATE INDEX IF NOT EXISTS "WorkflowTask_documentTypeId_idx" ON "WorkflowTask"("documentTypeId");

ALTER TABLE "StudentObservation" ADD CONSTRAINT "StudentObservation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AcademicClass" ADD CONSTRAINT "AcademicClass_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModuleClass" ADD CONSTRAINT "ModuleClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModuleClass" ADD CONSTRAINT "ModuleClass_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowTask" ADD CONSTRAINT "WorkflowTask_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageGroupMember" ADD CONSTRAINT "MessageGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MessageGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageGroupMember" ADD CONSTRAINT "MessageGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MessageGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Cours" ADD CONSTRAINT "Cours_elementModuleId_fkey" FOREIGN KEY ("elementModuleId") REFERENCES "ElementModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
