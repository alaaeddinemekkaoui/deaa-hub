import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateStudentDto } from '../../modules/students/dto/create-student.dto';
import { CreateTeacherDto } from '../../modules/teachers/dto/create-teacher.dto';

describe('LinkedIn URL validation', () => {
  it('accepts valid LinkedIn profile URLs for students', async () => {
    const dto = plainToInstance(CreateStudentDto, {
      firstName: 'Amina',
      lastName: 'Rami',
      sex: 'female',
      cin: 'AA1',
      codeMassar: 'M1',
      dateNaissance: '2000-01-01',
      classId: 1,
      firstYearEntry: 2024,
      anneeAcademique: '2025/2026',
      dateInscription: '2025-09-01',
      linkedInUrl: 'https://www.linkedin.com/in/amina-rami',
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'linkedInUrl')).toBeUndefined();
  });

  it('rejects non-LinkedIn URLs for teachers', async () => {
    const dto = plainToInstance(CreateTeacherDto, {
      firstName: 'Youssef',
      lastName: 'Naji',
      departmentId: 1,
      roleId: 1,
      gradeId: 1,
      linkedInUrl: 'https://example.com/youssef',
    });

    const errors = await validate(dto);

    expect(errors.find((error) => error.property === 'linkedInUrl')).toBeDefined();
  });
});
