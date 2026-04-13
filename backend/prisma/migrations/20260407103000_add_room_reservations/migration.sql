-- Add room reservations to support salle booking in the admin UI.

CREATE TYPE "RoomReservationPurpose" AS ENUM ('cours', 'examen', 'reunion', 'autre');

CREATE TABLE "RoomReservation" (
  "id" SERIAL NOT NULL,
  "roomId" INTEGER NOT NULL,
  "date" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "reservedBy" TEXT NOT NULL,
  "purpose" "RoomReservationPurpose" NOT NULL DEFAULT 'cours',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RoomReservation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RoomReservation_roomId_idx" ON "RoomReservation"("roomId");
CREATE INDEX "RoomReservation_date_idx" ON "RoomReservation"("date");
CREATE INDEX "RoomReservation_dayOfWeek_idx" ON "RoomReservation"("dayOfWeek");
CREATE INDEX "RoomReservation_roomId_date_idx" ON "RoomReservation"("roomId", "date");

ALTER TABLE "RoomReservation"
ADD CONSTRAINT "RoomReservation_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
