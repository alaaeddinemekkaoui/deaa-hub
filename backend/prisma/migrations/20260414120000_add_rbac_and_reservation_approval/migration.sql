-- Add new UserRole value
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'user';

-- CreateEnum: ReservationStatus
DO $$ BEGIN
  CREATE TYPE "ReservationStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable: UserDepartment
CREATE TABLE IF NOT EXISTS "UserDepartment" (
    "userId" INTEGER NOT NULL,
    "departmentId" INTEGER NOT NULL,

    CONSTRAINT "UserDepartment_pkey" PRIMARY KEY ("userId","departmentId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserDepartment_userId_idx" ON "UserDepartment"("userId");
CREATE INDEX IF NOT EXISTS "UserDepartment_departmentId_idx" ON "UserDepartment"("departmentId");

-- AddForeignKey
ALTER TABLE "UserDepartment"
    ADD CONSTRAINT "UserDepartment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserDepartment"
    ADD CONSTRAINT "UserDepartment_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: RoomReservation - add approval columns
ALTER TABLE "RoomReservation"
    ADD COLUMN IF NOT EXISTS "status" "ReservationStatus" NOT NULL DEFAULT 'approved',
    ADD COLUMN IF NOT EXISTS "requestedById" INTEGER,
    ADD COLUMN IF NOT EXISTS "approvedById" INTEGER,
    ADD COLUMN IF NOT EXISTS "approvalNote" TEXT,
    ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

-- CreateIndex on RoomReservation
CREATE INDEX IF NOT EXISTS "RoomReservation_status_idx" ON "RoomReservation"("status");
CREATE INDEX IF NOT EXISTS "RoomReservation_requestedById_idx" ON "RoomReservation"("requestedById");

-- AddForeignKey: RoomReservation.requestedById -> User
ALTER TABLE "RoomReservation"
    ADD CONSTRAINT "RoomReservation_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: RoomReservation.approvedById -> User
ALTER TABLE "RoomReservation"
    ADD CONSTRAINT "RoomReservation_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
