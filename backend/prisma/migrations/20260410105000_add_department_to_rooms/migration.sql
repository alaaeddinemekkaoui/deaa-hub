-- AlterTable
ALTER TABLE "Room"
ADD COLUMN "departmentId" INTEGER;

-- CreateIndex
CREATE INDEX "Room_departmentId_idx" ON "Room"("departmentId");

-- AddForeignKey
ALTER TABLE "Room"
ADD CONSTRAINT "Room_departmentId_fkey"
FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
