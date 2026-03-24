DO $$
DECLARE
  users_count INT;
  departments_count INT;
  filieres_count INT;
  classes_count INT;
  teacher_roles_count INT;
  teacher_grades_count INT;
  teachers_count INT;
  students_count INT;
BEGIN
  SELECT COUNT(*) INTO users_count FROM "User";
  SELECT COUNT(*) INTO departments_count FROM "Department";
  SELECT COUNT(*) INTO filieres_count FROM "Filiere";
  SELECT COUNT(*) INTO classes_count FROM "AcademicClass";
  SELECT COUNT(*) INTO teacher_roles_count FROM "TeacherRole";
  SELECT COUNT(*) INTO teacher_grades_count FROM "TeacherGrade";
  SELECT COUNT(*) INTO teachers_count FROM "Teacher";
  SELECT COUNT(*) INTO students_count FROM "Student";

  IF users_count < 1 THEN
    RAISE EXCEPTION 'Seed validation failed: User table is empty';
  END IF;
  IF departments_count < 2 THEN
    RAISE EXCEPTION 'Seed validation failed: expected at least 2 departments, got %', departments_count;
  END IF;
  IF filieres_count < 2 THEN
    RAISE EXCEPTION 'Seed validation failed: expected at least 2 filieres, got %', filieres_count;
  END IF;
  IF classes_count < 3 THEN
    RAISE EXCEPTION 'Seed validation failed: expected at least 3 classes, got %', classes_count;
  END IF;
  IF teacher_roles_count < 3 THEN
    RAISE EXCEPTION 'Seed validation failed: expected at least 3 teacher roles, got %', teacher_roles_count;
  END IF;
  IF teacher_grades_count < 3 THEN
    RAISE EXCEPTION 'Seed validation failed: expected at least 3 teacher grades, got %', teacher_grades_count;
  END IF;
  IF teachers_count < 2 THEN
    RAISE EXCEPTION 'Seed validation failed: expected at least 2 teachers, got %', teachers_count;
  END IF;
  IF students_count < 2 THEN
    RAISE EXCEPTION 'Seed validation failed: expected at least 2 students, got %', students_count;
  END IF;
END $$;
