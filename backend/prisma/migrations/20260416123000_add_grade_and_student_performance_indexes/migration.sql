CREATE INDEX "Student_classId_fullName_idx" ON "Student"("classId", "fullName");

CREATE INDEX "idx_grade_student_year" ON "StudentGrade"("studentId", "academicYear");

CREATE INDEX "idx_grade_class_year_sem" ON "StudentGrade"("classId", "academicYear", "semester");

CREATE INDEX "idx_grade_lookup_base"
ON "StudentGrade"("classId", "moduleId", "elementModuleId", "academicYear", "semester");

CREATE INDEX "idx_grade_lookup_assessment"
ON "StudentGrade"("classId", "moduleId", "elementModuleId", "academicYear", "semester", "assessmentType");
