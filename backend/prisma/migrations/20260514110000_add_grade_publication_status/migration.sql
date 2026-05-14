ALTER TABLE "StudentGrade"
ADD COLUMN IF NOT EXISTS "publicationStatus" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "reopenedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "StudentGrade_publicationStatus_idx" ON "StudentGrade"("publicationStatus");
