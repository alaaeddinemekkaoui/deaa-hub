-- Meal no longer uses a fixed type. Admin controls active meals by name/price.
ALTER TABLE "Meal" DROP COLUMN IF EXISTS "type";

-- Ticket lifecycle for reservations.
ALTER TYPE "MealReservationStatus" ADD VALUE IF NOT EXISTS 'consumed';
ALTER TYPE "MealReservationStatus" ADD VALUE IF NOT EXISTS 'expired';

ALTER TABLE "MealReservation"
  ADD COLUMN IF NOT EXISTS "ticketCode" TEXT,
  ADD COLUMN IF NOT EXISTS "ticketIssuedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "consumedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "MealReservation_ticketCode_key" ON "MealReservation"("ticketCode");
