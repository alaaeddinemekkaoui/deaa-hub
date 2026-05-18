ALTER TABLE "Document"
ADD COLUMN IF NOT EXISTS "storageProvider" TEXT DEFAULT 'local',
ADD COLUMN IF NOT EXISTS "bucket" TEXT,
ADD COLUMN IF NOT EXISTS "objectKey" TEXT,
ADD COLUMN IF NOT EXISTS "fileHash" TEXT,
ADD COLUMN IF NOT EXISTS "size" INTEGER;

ALTER TABLE "CoursResource"
ADD COLUMN IF NOT EXISTS "storageProvider" TEXT DEFAULT 'local',
ADD COLUMN IF NOT EXISTS "bucket" TEXT,
ADD COLUMN IF NOT EXISTS "objectKey" TEXT,
ADD COLUMN IF NOT EXISTS "fileHash" TEXT;

CREATE INDEX IF NOT EXISTS "Document_storageProvider_idx" ON "Document"("storageProvider");
CREATE INDEX IF NOT EXISTS "Document_bucket_objectKey_idx" ON "Document"("bucket", "objectKey");
CREATE INDEX IF NOT EXISTS "CoursResource_storageProvider_idx" ON "CoursResource"("storageProvider");
CREATE INDEX IF NOT EXISTS "CoursResource_bucket_objectKey_idx" ON "CoursResource"("bucket", "objectKey");
