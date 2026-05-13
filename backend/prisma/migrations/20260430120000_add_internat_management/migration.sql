ALTER TYPE "UserRole" ADD VALUE 'internat';

CREATE TABLE "InternatRoom" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InternatRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InternatAssignment" (
  "id" SERIAL NOT NULL,
  "studentId" INTEGER NOT NULL,
  "roomId" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InternatAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InternatRoom_name_key" ON "InternatRoom"("name");
CREATE UNIQUE INDEX "InternatAssignment_studentId_key" ON "InternatAssignment"("studentId");
CREATE INDEX "InternatAssignment_roomId_idx" ON "InternatAssignment"("roomId");

ALTER TABLE "InternatAssignment"
ADD CONSTRAINT "InternatAssignment_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InternatAssignment"
ADD CONSTRAINT "InternatAssignment_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "InternatRoom"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
