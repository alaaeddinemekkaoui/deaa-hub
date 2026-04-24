-- Add restauration role.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'restauration';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'dinner', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MealReservationStatus" AS ENUM ('confirmed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "MealTransactionType" AS ENUM ('credit', 'debit', 'adjustment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "CoursResource" (
    "id" SERIAL NOT NULL,
    "coursId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "teacherId" INTEGER,
    "uploadedById" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoursResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Meal" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MealType" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MealWallet" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealWallet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MealReservation" (
    "id" SERIAL NOT NULL,
    "mealId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "reservedById" INTEGER NOT NULL,
    "reservationDate" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "status" "MealReservationStatus" NOT NULL DEFAULT 'confirmed',
    "receiptNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealReservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MealTransaction" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "actorUserId" INTEGER NOT NULL,
    "reservationId" INTEGER,
    "type" "MealTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoursResource_coursId_idx" ON "CoursResource"("coursId");
CREATE INDEX "CoursResource_classId_idx" ON "CoursResource"("classId");
CREATE INDEX "CoursResource_teacherId_idx" ON "CoursResource"("teacherId");
CREATE INDEX "CoursResource_uploadedById_idx" ON "CoursResource"("uploadedById");
CREATE INDEX "CoursResource_createdAt_idx" ON "CoursResource"("createdAt");
CREATE INDEX "Meal_type_idx" ON "Meal"("type");
CREATE INDEX "Meal_active_idx" ON "Meal"("active");
CREATE UNIQUE INDEX "MealWallet_studentId_key" ON "MealWallet"("studentId");
CREATE UNIQUE INDEX "MealReservation_receiptNumber_key" ON "MealReservation"("receiptNumber");
CREATE INDEX "MealReservation_mealId_idx" ON "MealReservation"("mealId");
CREATE INDEX "MealReservation_studentId_idx" ON "MealReservation"("studentId");
CREATE INDEX "MealReservation_reservedById_idx" ON "MealReservation"("reservedById");
CREATE INDEX "MealReservation_reservationDate_idx" ON "MealReservation"("reservationDate");
CREATE INDEX "MealReservation_createdAt_idx" ON "MealReservation"("createdAt");
CREATE INDEX "MealTransaction_studentId_idx" ON "MealTransaction"("studentId");
CREATE INDEX "MealTransaction_actorUserId_idx" ON "MealTransaction"("actorUserId");
CREATE INDEX "MealTransaction_reservationId_idx" ON "MealTransaction"("reservationId");
CREATE INDEX "MealTransaction_createdAt_idx" ON "MealTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "CoursResource" ADD CONSTRAINT "CoursResource_coursId_fkey" FOREIGN KEY ("coursId") REFERENCES "Cours"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoursResource" ADD CONSTRAINT "CoursResource_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoursResource" ADD CONSTRAINT "CoursResource_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CoursResource" ADD CONSTRAINT "CoursResource_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MealWallet" ADD CONSTRAINT "MealWallet_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealReservation" ADD CONSTRAINT "MealReservation_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MealReservation" ADD CONSTRAINT "MealReservation_reservedById_fkey" FOREIGN KEY ("reservedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MealReservation" ADD CONSTRAINT "MealReservation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealTransaction" ADD CONSTRAINT "MealTransaction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MealTransaction" ADD CONSTRAINT "MealTransaction_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "MealReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MealTransaction" ADD CONSTRAINT "MealTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
