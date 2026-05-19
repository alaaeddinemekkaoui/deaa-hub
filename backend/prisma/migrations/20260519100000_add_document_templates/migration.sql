CREATE TABLE "DocumentTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'releve_note',
    "header" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "footer" TEXT,
    "primaryColor" TEXT DEFAULT '#0f766e',
    "signatureLabel" TEXT DEFAULT 'Direction des Affaires Académiques',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentTemplate_name_key" ON "DocumentTemplate"("name");
CREATE INDEX "DocumentTemplate_type_idx" ON "DocumentTemplate"("type");
CREATE INDEX "DocumentTemplate_isDefault_idx" ON "DocumentTemplate"("isDefault");
