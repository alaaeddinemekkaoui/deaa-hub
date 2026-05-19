ALTER TABLE "DocumentTemplate" ADD COLUMN "documentTypeId" INTEGER;

CREATE UNIQUE INDEX "DocumentTemplate_documentTypeId_key" ON "DocumentTemplate"("documentTypeId");
CREATE INDEX "DocumentTemplate_documentTypeId_idx" ON "DocumentTemplate"("documentTypeId");

ALTER TABLE "DocumentTemplate"
ADD CONSTRAINT "DocumentTemplate_documentTypeId_fkey"
FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
