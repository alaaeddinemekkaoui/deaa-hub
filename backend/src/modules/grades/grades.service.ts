import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../../common/types/role.type';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { GradeQueryDto } from './dto/grade-query.dto';
import { BulkUpsertGradesDto } from './dto/bulk-upsert-grades.dto';
import { ImportGradesDto } from './dto/import-grades.dto';

type GradeContext = {
  student?: {
    id: number;
    classId: number | null;
    anneeAcademique: string;
    filiere: { departmentId: number } | null;
    academicClass: { filiere: { departmentId: number } | null } | null;
  } | null;
  academicClass?: {
    id: number;
    name: string;
    year: number;
    filiere: { departmentId: number } | null;
  } | null;
  module?: {
    id: number;
    name: string;
    filiere: { departmentId: number } | null;
  } | null;
  elementModule?: {
    id: number;
    name: string;
    moduleId: number;
    module: {
      id: number;
      name: string;
      filiere: { departmentId: number } | null;
    };
  } | null;
  resolvedClassId: number | null;
  resolvedModuleId: number | null;
  resolvedElementModuleId: number | null;
  departmentId: number | null;
};

@Injectable()
export class GradesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GradeQueryDto) {
    const filters: Prisma.StudentGradeWhereInput[] = [];

    if (query.search) {
      filters.push({
        OR: [
          { subject: { contains: query.search, mode: 'insensitive' } },
          { assessmentType: { contains: query.search, mode: 'insensitive' } },
          { semester: { contains: query.search, mode: 'insensitive' } },
          {
            student: {
              OR: [
                { fullName: { contains: query.search, mode: 'insensitive' } },
                { codeMassar: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          },
          {
            teacher: {
              OR: [
                { firstName: { contains: query.search, mode: 'insensitive' } },
                { lastName: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          },
          { module: { name: { contains: query.search, mode: 'insensitive' } } },
          {
            elementModule: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    if (query.studentId) filters.push({ studentId: query.studentId });
    if (query.teacherId) filters.push({ teacherId: query.teacherId });
    if (query.classId) filters.push({ classId: query.classId });
    if (query.moduleId) filters.push({ moduleId: query.moduleId });
    if (query.elementModuleId) {
      filters.push({ elementModuleId: query.elementModuleId });
    }
    if (query.academicYear) {
      filters.push({ academicYear: query.academicYear });
    }
    if (query.semester) {
      filters.push({ semester: query.semester });
    }
    if (query.assessmentType) {
      filters.push({ assessmentType: query.assessmentType });
    }

    const where: Prisma.StudentGradeWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const [data, total] = await Promise.all([
      this.prisma.studentGrade.findMany({
        where,
        include: {
          student: {
            select: { id: true, fullName: true, codeMassar: true },
          },
          teacher: {
            select: { id: true, firstName: true, lastName: true },
          },
          academicClass: {
            select: { id: true, name: true, year: true },
          },
          module: {
            select: { id: true, name: true, semestre: true },
          },
          elementModule: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.studentGrade.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
        hasNextPage: query.page * query.limit < total,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  async findByStudent(studentId: number) {
    return this.prisma.studentGrade.findMany({
      where: { studentId },
      include: {
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        academicClass: {
          select: { id: true, name: true, year: true },
        },
        module: {
          select: { id: true, name: true, semestre: true },
        },
        elementModule: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findByTeacher(teacherId: number) {
    return this.prisma.studentGrade.findMany({
      where: { teacherId },
      include: {
        student: {
          select: { id: true, fullName: true, codeMassar: true },
        },
        academicClass: {
          select: { id: true, name: true, year: true },
        },
        module: {
          select: { id: true, name: true, semestre: true },
        },
        elementModule: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(dto: CreateGradeDto, currentUser?: JwtPayload) {
    const context = await this.resolveContext({
      studentId: dto.studentId,
      classId: dto.classId,
      moduleId: dto.moduleId,
      elementModuleId: dto.elementModuleId,
      currentUser,
    });

    if (dto.teacherId) {
      await this.ensureTeacherExists(dto.teacherId);
    }

    return this.prisma.studentGrade.create({
      data: {
        studentId: dto.studentId,
        teacherId: dto.teacherId ?? null,
        classId: context.resolvedClassId,
        moduleId: context.resolvedModuleId,
        elementModuleId: context.resolvedElementModuleId,
        subject: this.resolveSubject(dto.subject, context),
        semester: this.normalizeNullableString(dto.semester),
        assessmentType: this.normalizeNullableString(dto.assessmentType),
        score: dto.score,
        maxScore: dto.maxScore ?? 20,
        academicYear:
          this.normalizeNullableString(dto.academicYear) ??
          context.student?.anneeAcademique ??
          '',
        comment: this.normalizeNullableString(dto.comment),
      },
      include: {
        student: {
          select: { id: true, fullName: true, codeMassar: true },
        },
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        academicClass: {
          select: { id: true, name: true, year: true },
        },
        module: {
          select: { id: true, name: true, semestre: true },
        },
        elementModule: {
          select: { id: true, name: true, type: true },
        },
      },
    });
  }

  async update(id: number, dto: UpdateGradeDto, currentUser?: JwtPayload) {
    const existing = await this.prisma.studentGrade.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            classId: true,
            anneeAcademique: true,
            filiere: { select: { departmentId: true } },
            academicClass: {
              select: { filiere: { select: { departmentId: true } } },
            },
          },
        },
        academicClass: {
          select: { id: true, filiere: { select: { departmentId: true } } },
        },
        module: {
          select: { id: true, filiere: { select: { departmentId: true } } },
        },
        elementModule: {
          select: {
            id: true,
            moduleId: true,
            module: { select: { filiere: { select: { departmentId: true } } } },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Grade ${id} not found`);
    }

    const nextStudentId = dto.studentId ?? existing.student.id;
    const nextClassId =
      dto.classId !== undefined ? dto.classId : existing.classId;
    const nextModuleId =
      dto.moduleId !== undefined ? dto.moduleId : existing.moduleId;
    const nextElementModuleId =
      dto.elementModuleId !== undefined
        ? dto.elementModuleId
        : existing.elementModuleId;

    const context = await this.resolveContext({
      studentId: nextStudentId,
      classId: nextClassId,
      moduleId: nextModuleId,
      elementModuleId: nextElementModuleId,
      currentUser,
    });

    const teacherId =
      dto.teacherId !== undefined
        ? (dto.teacherId ?? null)
        : existing.teacherId;
    if (teacherId) {
      await this.ensureTeacherExists(teacherId);
    }

    return this.prisma.studentGrade.update({
      where: { id },
      data: {
        ...(dto.studentId !== undefined ? { studentId: nextStudentId } : {}),
        ...(dto.teacherId !== undefined ? { teacherId } : {}),
        ...(dto.classId !== undefined
          ? { classId: context.resolvedClassId }
          : nextClassId !== existing.classId
            ? { classId: context.resolvedClassId }
            : {}),
        ...(dto.moduleId !== undefined
          ? { moduleId: context.resolvedModuleId }
          : nextModuleId !== existing.moduleId
            ? { moduleId: context.resolvedModuleId }
            : {}),
        ...(dto.elementModuleId !== undefined
          ? { elementModuleId: context.resolvedElementModuleId }
          : nextElementModuleId !== existing.elementModuleId
            ? { elementModuleId: context.resolvedElementModuleId }
            : {}),
        ...(dto.subject !== undefined ||
        dto.moduleId !== undefined ||
        dto.elementModuleId !== undefined
          ? {
              subject: this.resolveSubject(
                dto.subject ?? existing.subject,
                context,
              ),
            }
          : {}),
        ...(dto.semester !== undefined
          ? { semester: this.normalizeNullableString(dto.semester) }
          : {}),
        ...(dto.assessmentType !== undefined
          ? {
              assessmentType: this.normalizeNullableString(dto.assessmentType),
            }
          : {}),
        ...(dto.score !== undefined ? { score: dto.score } : {}),
        ...(dto.maxScore !== undefined ? { maxScore: dto.maxScore } : {}),
        ...(dto.academicYear !== undefined
          ? { academicYear: dto.academicYear.trim() }
          : {}),
        ...(dto.comment !== undefined
          ? { comment: this.normalizeNullableString(dto.comment) }
          : {}),
      },
      include: {
        student: {
          select: { id: true, fullName: true, codeMassar: true },
        },
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        academicClass: {
          select: { id: true, name: true, year: true },
        },
        module: {
          select: { id: true, name: true, semestre: true },
        },
        elementModule: {
          select: { id: true, name: true, type: true },
        },
      },
    });
  }

  async bulkUpsert(dto: BulkUpsertGradesDto, currentUser?: JwtPayload) {
    if (dto.teacherId) {
      await this.ensureTeacherExists(dto.teacherId);
    }

    const context = await this.resolveContext({
      classId: dto.classId,
      moduleId: dto.moduleId,
      elementModuleId: dto.elementModuleId,
      currentUser,
    });

    const subject = this.resolveSubject(dto.subject, context);
    const normalizedAssessmentType = this.normalizeNullableString(
      dto.assessmentType,
    );
    const normalizedSemester = this.normalizeNullableString(dto.semester);
    const normalizedAcademicYear = dto.academicYear.trim();
    const studentIds = Array.from(
      new Set(dto.grades.map((entry) => entry.studentId)),
    );

    const students = await this.prisma.student.findMany({
      where: {
        id: { in: studentIds },
        classId: dto.classId,
      },
      select: { id: true },
    });

    if (students.length !== studentIds.length) {
      throw new BadRequestException(
        'Every grade entry must belong to the selected class',
      );
    }

    const existingByStudent = await this.prisma.studentGrade.findMany({
      where: {
        studentId: { in: studentIds },
        classId: dto.classId,
        moduleId: context.resolvedModuleId,
        elementModuleId: context.resolvedElementModuleId,
        semester: normalizedSemester,
        assessmentType: normalizedAssessmentType,
        academicYear: normalizedAcademicYear,
      },
      select: { id: true, studentId: true },
    });

    const existingByStudentMap = new Map(
      existingByStudent.map((item) => [item.studentId, item.id]),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;

      for (const entry of dto.grades) {
        const existingId =
          entry.id ?? existingByStudentMap.get(entry.studentId);
        const payload = {
          studentId: entry.studentId,
          teacherId: dto.teacherId ?? null,
          classId: dto.classId,
          moduleId: context.resolvedModuleId,
          elementModuleId: context.resolvedElementModuleId,
          subject,
          semester: normalizedSemester,
          assessmentType: normalizedAssessmentType,
          score: entry.score,
          maxScore: dto.maxScore ?? 20,
          academicYear: normalizedAcademicYear,
          comment: this.normalizeNullableString(entry.comment),
        };

        if (existingId) {
          await tx.studentGrade.update({
            where: { id: existingId },
            data: payload,
          });
          updated += 1;
        } else {
          await tx.studentGrade.create({ data: payload });
          created += 1;
        }
      }

      return { created, updated };
    });

    return {
      ...result,
      total: dto.grades.length,
    };
  }

  async importFromBuffer(
    dto: ImportGradesDto,
    file: Express.Multer.File | undefined,
    currentUser?: JwtPayload,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file uploaded');
    }

    if (dto.teacherId) {
      await this.ensureTeacherExists(dto.teacherId);
    }

    const context = await this.resolveContext({
      classId: dto.classId,
      moduleId: dto.moduleId,
      elementModuleId: dto.elementModuleId,
      currentUser,
    });
    const subject = this.resolveSubject(dto.subject, context);

    const classStudents = await this.prisma.student.findMany({
      where: { classId: dto.classId },
      select: { id: true, fullName: true, codeMassar: true },
    });

    const studentsById = new Map(
      classStudents.map((student) => [student.id, student]),
    );
    const studentsByMassar = new Map(
      classStudents.map((student) => [
        student.codeMassar.trim().toLowerCase(),
        student,
      ]),
    );
    const studentsByName = new Map(
      classStudents.map((student) => [
        student.fullName.trim().toLowerCase(),
        student,
      ]),
    );

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException(
        'The uploaded file does not contain any sheet',
      );
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    const grades: BulkUpsertGradesDto['grades'] = [];
    let skipped = 0;

    for (const row of rows) {
      const student = this.findStudentFromImportRow(
        row,
        studentsById,
        studentsByMassar,
        studentsByName,
      );
      const scoreValue = this.readImportNumber(row, [
        'score',
        'note',
        'grade',
        'result',
      ]);

      if (!student || scoreValue === null) {
        skipped += 1;
        continue;
      }

      grades.push({
        studentId: student.id,
        score: scoreValue,
        comment: this.readImportString(row, [
          'comment',
          'comments',
          'remark',
          'remarks',
        ]),
      });
    }

    if (grades.length === 0) {
      throw new BadRequestException(
        'No valid grade rows were found. Use columns like codeMassar/studentId/fullName and score/note',
      );
    }

    const result = await this.bulkUpsert(
      {
        classId: dto.classId,
        teacherId: dto.teacherId,
        moduleId: dto.moduleId,
        elementModuleId: dto.elementModuleId,
        subject,
        semester: dto.semester,
        assessmentType: dto.assessmentType,
        maxScore: dto.maxScore,
        academicYear: dto.academicYear,
        grades,
      },
      currentUser,
    );

    return {
      ...result,
      importedRows: grades.length,
      skippedRows: skipped,
    };
  }

  async remove(id: number, currentUser?: JwtPayload) {
    const existing = await this.prisma.studentGrade.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            filiere: { select: { departmentId: true } },
            academicClass: {
              select: { filiere: { select: { departmentId: true } } },
            },
          },
        },
        academicClass: {
          select: { filiere: { select: { departmentId: true } } },
        },
        module: {
          select: { filiere: { select: { departmentId: true } } },
        },
        elementModule: {
          select: {
            module: { select: { filiere: { select: { departmentId: true } } } },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Grade ${id} not found`);
    }

    const departmentId =
      existing.academicClass?.filiere?.departmentId ??
      existing.elementModule?.module?.filiere?.departmentId ??
      existing.module?.filiere?.departmentId ??
      existing.student.academicClass?.filiere?.departmentId ??
      existing.student.filiere?.departmentId;

    this.ensureCanManageDepartment(departmentId, currentUser);

    return this.prisma.studentGrade.delete({ where: { id } });
  }

  private async resolveContext(params: {
    studentId?: number | null;
    classId?: number | null;
    moduleId?: number | null;
    elementModuleId?: number | null;
    currentUser?: JwtPayload;
  }): Promise<GradeContext> {
    const [student, academicClass, moduleEntity, elementModule] =
      await Promise.all([
        params.studentId
          ? this.prisma.student.findUnique({
              where: { id: params.studentId },
              select: {
                id: true,
                classId: true,
                anneeAcademique: true,
                filiere: { select: { departmentId: true } },
                academicClass: {
                  select: { filiere: { select: { departmentId: true } } },
                },
              },
            })
          : Promise.resolve(null),
        params.classId
          ? this.prisma.academicClass.findUnique({
              where: { id: params.classId },
              select: {
                id: true,
                name: true,
                year: true,
                filiere: { select: { departmentId: true } },
              },
            })
          : Promise.resolve(null),
        params.moduleId
          ? this.prisma.module.findUnique({
              where: { id: params.moduleId },
              select: {
                id: true,
                name: true,
                filiere: { select: { departmentId: true } },
              },
            })
          : Promise.resolve(null),
        params.elementModuleId
          ? this.prisma.elementModule.findUnique({
              where: { id: params.elementModuleId },
              select: {
                id: true,
                name: true,
                moduleId: true,
                module: {
                  select: {
                    id: true,
                    name: true,
                    filiere: { select: { departmentId: true } },
                  },
                },
              },
            })
          : Promise.resolve(null),
      ]);

    if (params.studentId && !student) {
      throw new NotFoundException(`Student ${params.studentId} not found`);
    }
    if (params.classId && !academicClass) {
      throw new NotFoundException(`Class ${params.classId} not found`);
    }
    if (params.moduleId && !moduleEntity) {
      throw new NotFoundException(`Module ${params.moduleId} not found`);
    }
    if (params.elementModuleId && !elementModule) {
      throw new NotFoundException(
        `Element module ${params.elementModuleId} not found`,
      );
    }

    if (
      student &&
      params.classId &&
      student.classId &&
      student.classId !== params.classId
    ) {
      throw new BadRequestException(
        'The selected student does not belong to the chosen class',
      );
    }

    if (
      elementModule &&
      params.moduleId &&
      elementModule.moduleId !== params.moduleId
    ) {
      throw new BadRequestException(
        'The selected element module does not belong to the chosen module',
      );
    }

    const resolvedClassId = params.classId ?? student?.classId ?? null;
    const resolvedModuleId = params.moduleId ?? elementModule?.moduleId ?? null;
    const resolvedElementModuleId = params.elementModuleId ?? null;
    const resolvedModule = moduleEntity ?? elementModule?.module ?? null;

    if (resolvedClassId && resolvedModuleId) {
      const assignment = await this.prisma.moduleClass.findUnique({
        where: {
          moduleId_classId: {
            moduleId: resolvedModuleId,
            classId: resolvedClassId,
          },
        },
        select: { moduleId: true },
      });

      if (!assignment) {
        throw new BadRequestException(
          'The selected module is not assigned to the chosen class',
        );
      }
    }

    const departmentId =
      academicClass?.filiere?.departmentId ??
      resolvedModule?.filiere?.departmentId ??
      student?.academicClass?.filiere?.departmentId ??
      student?.filiere?.departmentId ??
      null;

    this.ensureCanManageDepartment(departmentId, params.currentUser);

    return {
      student,
      academicClass,
      module: resolvedModule,
      elementModule,
      resolvedClassId,
      resolvedModuleId,
      resolvedElementModuleId,
      departmentId,
    };
  }

  private resolveSubject(subject: string | undefined, context: GradeContext) {
    const normalizedSubject = this.normalizeNullableString(subject);
    if (normalizedSubject) {
      return normalizedSubject;
    }

    if (context.elementModule?.name) {
      return context.elementModule.name;
    }

    if (context.module?.name) {
      return context.module.name;
    }

    throw new BadRequestException(
      'A subject or an academic context (module/element module) is required',
    );
  }

  private normalizeNullableString(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private readImportString(
    row: Record<string, unknown>,
    aliases: string[],
  ): string | undefined {
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = key.trim().toLowerCase();
      if (aliases.includes(normalizedKey)) {
        const normalizedValue =
          typeof value === 'string' || typeof value === 'number'
            ? String(value).trim()
            : '';
        return normalizedValue || undefined;
      }
    }

    return undefined;
  }

  private readImportNumber(
    row: Record<string, unknown>,
    aliases: string[],
  ): number | null {
    const raw = this.readImportString(row, aliases);
    if (!raw) {
      return null;
    }

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }

  private findStudentFromImportRow(
    row: Record<string, unknown>,
    studentsById: Map<
      number,
      { id: number; fullName: string; codeMassar: string }
    >,
    studentsByMassar: Map<
      string,
      { id: number; fullName: string; codeMassar: string }
    >,
    studentsByName: Map<
      string,
      { id: number; fullName: string; codeMassar: string }
    >,
  ) {
    const rawStudentId = this.readImportNumber(row, [
      'studentid',
      'student_id',
      'id',
    ]);
    if (rawStudentId && studentsById.has(rawStudentId)) {
      return studentsById.get(rawStudentId) ?? null;
    }

    const rawMassar = this.readImportString(row, [
      'codemassar',
      'code_massar',
      'massar',
      'studentcode',
    ]);
    if (rawMassar) {
      return studentsByMassar.get(rawMassar.trim().toLowerCase()) ?? null;
    }

    const rawName = this.readImportString(row, [
      'fullname',
      'full_name',
      'student',
      'studentname',
      'student_name',
      'name',
      'etudiant',
    ]);
    if (rawName) {
      return studentsByName.get(rawName.trim().toLowerCase()) ?? null;
    }

    return null;
  }

  private ensureCanManageDepartment(
    departmentId: number | null | undefined,
    currentUser?: JwtPayload,
  ) {
    if (
      !currentUser ||
      (currentUser.role !== UserRole.USER &&
        currentUser.role !== UserRole.VIEWER)
    ) {
      return;
    }

    if (!departmentId || !currentUser.departmentIds.includes(departmentId)) {
      throw new ForbiddenException(
        'You can only manage grades in your own department',
      );
    }
  }

  private async ensureTeacherExists(id: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher ${id} not found`);
    }
  }
}
