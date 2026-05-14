ALTER TABLE "Teacher" ADD COLUMN "sex" "Sex" NOT NULL DEFAULT 'male';

CREATE INDEX "Teacher_sex_idx" ON "Teacher"("sex");
