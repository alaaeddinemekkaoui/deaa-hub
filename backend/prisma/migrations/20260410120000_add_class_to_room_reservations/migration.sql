-- AlterTable
ALTER TABLE "RoomReservation"
ADD COLUMN "classId" INTEGER;

-- CreateIndex
CREATE INDEX "RoomReservation_classId_idx" ON "RoomReservation"("classId");

-- AddForeignKey
ALTER TABLE "RoomReservation"
ADD CONSTRAINT "RoomReservation_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
