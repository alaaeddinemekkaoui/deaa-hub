ALTER TABLE "StudentGrade"
ADD COLUMN "moduleId" INTEGER,
ADD COLUMN "elementModuleId" INTEGER;

ALTER TABLE "StudentGrade"
ADD CONSTRAINT "StudentGrade_moduleId_fkey"
FOREIGN KEY ("moduleId") REFERENCES "Module"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "StudentGrade"
ADD CONSTRAINT "StudentGrade_elementModuleId_fkey"
FOREIGN KEY ("elementModuleId") REFERENCES "ElementModule"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "StudentGrade_moduleId_idx" ON "StudentGrade"("moduleId");
CREATE INDEX "StudentGrade_elementModuleId_idx" ON "StudentGrade"("elementModuleId");
