ALTER TABLE "DocumentTemplate"
ADD COLUMN "docxTemplatePath" TEXT,
ADD COLUMN "docxTemplateName" TEXT,
ADD COLUMN "docxTemplateMimeType" TEXT,
ADD COLUMN "docxTemplateStorageProvider" TEXT,
ADD COLUMN "docxTemplateBucket" TEXT,
ADD COLUMN "docxTemplateObjectKey" TEXT,
ADD COLUMN "docxTemplateFileHash" TEXT,
ADD COLUMN "docxTemplateSize" INTEGER;

CREATE TABLE "ESignatureAsset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Signature officielle',
    "mimeType" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "storageProvider" TEXT DEFAULT 'minio',
    "bucket" TEXT,
    "objectKey" TEXT,
    "fileHash" TEXT,
    "size" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ESignatureAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ESignatureAsset_active_idx" ON "ESignatureAsset"("active");
CREATE INDEX "ESignatureAsset_uploadedAt_idx" ON "ESignatureAsset"("uploadedAt");
