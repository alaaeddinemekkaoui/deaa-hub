-- Allow assigning one or many teachers to the same cours/class pair.
-- Previous unique constraint prevented multiple teachers on same cours+class.

DROP INDEX IF EXISTS "CoursClass_coursId_classId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "CoursClass_coursId_classId_teacherId_key"
ON "CoursClass"("coursId", "classId", "teacherId");

CREATE INDEX IF NOT EXISTS "CoursClass_coursId_classId_idx"
ON "CoursClass"("coursId", "classId");
