ALTER TABLE "DocumentTemplate"
ADD COLUMN "eSignatureEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "eSignatureSignerName" TEXT DEFAULT 'DEAA Hub',
ADD COLUMN "eSignatureSignerTitle" TEXT DEFAULT 'Direction des Affaires Académiques',
ADD COLUMN "eSignatureStampText" TEXT DEFAULT 'Signé électroniquement';
