ALTER TABLE "Module" ADD COLUMN "responsableId" INTEGER;

CREATE INDEX "Module_responsableId_idx" ON "Module"("responsableId");

ALTER TABLE "Module" ADD CONSTRAINT "Module_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
