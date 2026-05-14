-- The AcademicClass.year column stores the study/class year, not the school-year label.
-- Backfill existing classes from the configured current academic year.
UPDATE "AcademicClass"
SET "academicYear" = COALESCE(
  (SELECT "label" FROM "AcademicYear" WHERE "isCurrent" = true ORDER BY "label" DESC LIMIT 1),
  (SELECT "label" FROM "AcademicYear" ORDER BY "label" DESC LIMIT 1),
  "academicYear"
)
WHERE "academicYear" IS NULL
   OR "academicYear" !~ '^[0-9]{4}/[0-9]{4}$';
