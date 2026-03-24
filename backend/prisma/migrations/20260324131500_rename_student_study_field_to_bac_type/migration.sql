-- Rename student study field to bac type while preserving all existing values
ALTER TABLE "Student"
RENAME COLUMN "studyField" TO "bacType";