import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KeyedTtlCache } from '../../common/utils/keyed-ttl-cache';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole, isDeptScoped } from '../../common/types/role.type';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { GradeQueryDto } from './dto/grade-query.dto';
import { BulkUpsertGradesDto } from './dto/bulk-upsert-grades.dto';
import { ImportGradesDto } from './dto/import-grades.dto';
import { PublishGradesDto } from './dto/publish-grades.dto';

type GradePublicationStatus = 'draft' | 'published' | 'modified_after_publication';

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

type ElementGradeSummary = {
  score: number;
  maxScore: number;
  initialScore: number;
  initialMaxScore: number;
  rattrapageScore: number | null;
  rattrapageMaxScore: number | null;
  assessmentType: string | null;
  publicationStatus: GradePublicationStatus;
  publishedAt: Date | null;
  lockedAt: Date | null;
};

type StudentGradeView = Prisma.StudentGradeGetPayload<{
  include: {
    teacher: {
      select: { id: true; firstName: true; lastName: true };
    };
    academicClass: {
      select: { id: true; name: true; year: true };
    };
    module: {
      select: { id: true; name: true; semestre: true };
    };
    elementModule: {
      select: { id: true; name: true; type: true };
    };
  };
}>;

@Injectable()
export class GradesService {
  private readonly listCache = new KeyedTtlCache<unknown>({
    prefix: 'grades:list',
    ttlMs: 30 * 1000,
    staleTtlMs: 2 * 60 * 1000,
  });

  private readonly studentCache = new KeyedTtlCache<unknown>({
    prefix: 'grades:student',
    ttlMs: 30 * 1000,
    staleTtlMs: 2 * 60 * 1000,
  });

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: GradeQueryDto, currentUser?: JwtPayload) {
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
    if (query.publicationStatus) {
      filters.push({ publicationStatus: query.publicationStatus });
    }
    if (currentUser?.role === UserRole.TEACHER) {
      filters.push(await this.teacherGradeScopeWhere(currentUser));
    }

    const where: Prisma.StudentGradeWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const cacheKey = JSON.stringify({
      page: query.page,
      limit: query.limit,
      search: query.search ?? null,
      studentId: query.studentId ?? null,
      teacherId: query.teacherId ?? null,
      classId: query.classId ?? null,
      moduleId: query.moduleId ?? null,
      elementModuleId: query.elementModuleId ?? null,
      academicYear: query.academicYear ?? null,
      semester: query.semester ?? null,
      assessmentType: query.assessmentType ?? null,
      publicationStatus: query.publicationStatus ?? null,
      currentUserRole: currentUser?.role ?? null,
      currentUserSub:
        currentUser?.role === UserRole.TEACHER ? currentUser.sub : null,
    });

    return this.listCache.getOrLoad(cacheKey, async () => {
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
    });
  }

  async findByStudent(studentId: number) {
    return this.studentCache.getOrLoad(String(studentId), () =>
      this.prisma.studentGrade.findMany({
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
      }),
    );
  }

  async findMine(currentUser: JwtPayload) {
    const student = await this.prisma.student.findUnique({
      where: { userId: currentUser.sub },
      select: {
        id: true,
        fullName: true,
        codeMassar: true,
        codeEtudiant: true,
        anneeAcademique: true,
        academicClass: {
          select: { id: true, name: true, year: true },
        },
      },
    });

    if (!student) {
      return { student: null, currentAcademicYear: null, currentGrades: [], historyByYear: [] };
    }

    const currentAcademicYear =
      (
        await this.prisma.academicYear.findFirst({
          where: { isCurrent: true },
          select: { label: true },
          orderBy: { updatedAt: 'desc' },
        })
      )?.label ??
      student.anneeAcademique ??
      null;

    const grades = (await this.prisma.studentGrade.findMany({
      where: { studentId: student.id, publicationStatus: { in: ['published', 'modified_after_publication'] } },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        academicClass: { select: { id: true, name: true, year: true } },
        module: { select: { id: true, name: true, semestre: true } },
        elementModule: { select: { id: true, name: true, type: true } },
      },
      orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
    })) as StudentGradeView[];
    const currentGrades = currentAcademicYear
      ? grades.filter((grade) => grade.academicYear === currentAcademicYear)
      : [];
    const historyMap = new Map<string, StudentGradeView[]>();

    for (const grade of grades) {
      if (!grade.academicYear || grade.academicYear === currentAcademicYear) continue;
      const bucket = historyMap.get(grade.academicYear) ?? [];
      bucket.push(grade);
      historyMap.set(grade.academicYear, bucket);
    }

    return {
      student,
      currentAcademicYear,
      currentGrades,
      historyByYear: [...historyMap.entries()]
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([year, rows]) => ({ year, grades: rows })),
    };
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
    const maxScore = dto.maxScore ?? 20;
    this.ensureValidScores([{ studentId: dto.studentId, score: dto.score }], maxScore);
    this.ensureValidOptionalScores(
      [{ studentId: dto.studentId, score: dto.rattrapageScore }],
      dto.rattrapageMaxScore ?? maxScore,
      'La note après rattrapage',
    );
    const context = await this.resolveContext({
      studentId: dto.studentId,
      classId: dto.classId,
      moduleId: dto.moduleId,
      elementModuleId: dto.elementModuleId,
      currentUser,
    });
    await this.ensureTeacherCanEditGrade(context, currentUser);
    const currentTeacherId = await this.getCurrentTeacherId(currentUser);

    if (dto.teacherId) {
      await this.ensureTeacherExists(dto.teacherId);
    }

    const created = await this.prisma.studentGrade.create({
      data: {
        studentId: dto.studentId,
        teacherId: currentTeacherId ?? dto.teacherId ?? null,
        classId: context.resolvedClassId,
        moduleId: context.resolvedModuleId,
        elementModuleId: context.resolvedElementModuleId,
        subject: this.resolveSubject(dto.subject, context),
        semester: this.normalizeNullableString(dto.semester),
        assessmentType: this.normalizeNullableString(dto.assessmentType),
        score: dto.score,
        maxScore,
        rattrapageScore: dto.rattrapageScore ?? null,
        rattrapageMaxScore:
          dto.rattrapageScore === undefined || dto.rattrapageScore === null
            ? null
            : (dto.rattrapageMaxScore ?? maxScore),
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

    this.invalidateGradeCaches(dto.studentId);
    return created;
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
    if (existing.lockedAt) {
      throw new ForbiddenException(
        'Cette note est publiée et verrouillée. Un administrateur doit la rouvrir avant modification.',
      );
    }
    if (dto.score !== undefined) {
      this.ensureValidScores(
        [{ studentId: existing.student.id, score: dto.score }],
        dto.maxScore ?? existing.maxScore,
      );
    }
    if (dto.rattrapageScore !== undefined) {
      this.ensureValidOptionalScores(
        [{ studentId: existing.student.id, score: dto.rattrapageScore }],
        dto.rattrapageMaxScore ?? dto.maxScore ?? existing.maxScore,
        'La note après rattrapage',
      );
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
    await this.ensureTeacherCanEditGrade(context, currentUser);
    const currentTeacherId = await this.getCurrentTeacherId(currentUser);

    const teacherId =
      currentTeacherId ??
      (dto.teacherId !== undefined
        ? (dto.teacherId ?? null)
        : existing.teacherId);
    if (teacherId) {
      await this.ensureTeacherExists(teacherId);
    }

    const updated = await this.prisma.studentGrade.update({
      where: { id },
      data: {
        ...(dto.studentId !== undefined ? { studentId: nextStudentId } : {}),
        ...(dto.teacherId !== undefined || currentTeacherId
          ? { teacherId }
          : {}),
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
        ...(dto.rattrapageScore !== undefined
          ? { rattrapageScore: dto.rattrapageScore }
          : {}),
        ...(dto.rattrapageScore !== undefined
          ? {
              rattrapageMaxScore:
                dto.rattrapageScore === null
                  ? null
                  : (dto.rattrapageMaxScore ?? dto.maxScore ?? existing.maxScore),
            }
          : dto.rattrapageMaxScore !== undefined
            ? { rattrapageMaxScore: dto.rattrapageMaxScore }
            : {}),
        ...(dto.score !== undefined ||
        dto.maxScore !== undefined ||
        dto.rattrapageScore !== undefined ||
        dto.rattrapageMaxScore !== undefined
          ? {
              publicationStatus:
                existing.publishedAt ||
                existing.publicationStatus === 'published' ||
                existing.publicationStatus === 'modified_after_publication'
                  ? 'modified_after_publication'
                  : 'draft',
            }
          : {}),
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

    this.invalidateGradeCaches(nextStudentId);
    if (existing.student.id !== nextStudentId) {
      this.invalidateGradeCaches(existing.student.id);
    }
    return updated;
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
    await this.ensureTeacherCanEditGrade(context, currentUser);
    const currentTeacherId = await this.getCurrentTeacherId(currentUser);

    const subject = this.resolveSubject(dto.subject, context);
    const normalizedAssessmentType = this.normalizeNullableString(
      dto.assessmentType,
    );
    const normalizedSemester = this.normalizeNullableString(dto.semester);
    const normalizedAcademicYear = dto.academicYear.trim();
    const maxScore = dto.maxScore ?? 20;
    this.ensureValidScores(dto.grades, maxScore);
    this.ensureValidOptionalScores(
      dto.grades.map((entry) => ({
        studentId: entry.studentId,
        score: entry.rattrapageScore,
      })),
      maxScore,
      'La note après rattrapage',
    );
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
      select: {
        id: true,
        studentId: true,
        publicationStatus: true,
        publishedAt: true,
      },
    });

    const lockedExisting = await this.prisma.studentGrade.findMany({
      where: {
        id: { in: existingByStudent.map((item) => item.id) },
        lockedAt: { not: null },
      },
      select: { studentId: true },
    });
    if (lockedExisting.length > 0) {
      throw new ForbiddenException(
        'Certaines notes sont publiées et verrouillées. Un administrateur doit les rouvrir avant modification.',
      );
    }

    const existingByStudentMap = new Map(
      existingByStudent.map((item) => [item.studentId, item]),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      let created = 0;
      let updated = 0;

      for (const entry of dto.grades) {
        const hasRattrapageInput = Object.prototype.hasOwnProperty.call(
          entry,
          'rattrapageScore',
        );
        const existing = entry.id
          ? existingByStudent.find((item) => item.id === entry.id)
          : existingByStudentMap.get(entry.studentId);
        const existingId = entry.id ?? existing?.id;
        const nextStatus: GradePublicationStatus =
          existing?.publishedAt ||
          existing?.publicationStatus === 'published' ||
          existing?.publicationStatus === 'modified_after_publication'
            ? 'modified_after_publication'
            : 'draft';
        const payload = {
          studentId: entry.studentId,
          teacherId: currentTeacherId ?? dto.teacherId ?? null,
          classId: dto.classId,
          moduleId: context.resolvedModuleId,
          elementModuleId: context.resolvedElementModuleId,
          subject,
          semester: normalizedSemester,
          assessmentType: normalizedAssessmentType,
          score: entry.score,
          maxScore,
          ...(hasRattrapageInput
            ? {
                rattrapageScore: entry.rattrapageScore ?? null,
                rattrapageMaxScore:
                  entry.rattrapageScore === undefined ||
                  entry.rattrapageScore === null
                    ? null
                    : maxScore,
              }
            : {}),
          academicYear: normalizedAcademicYear,
          publicationStatus: nextStatus,
          lockedAt: null,
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

    for (const studentId of studentIds) {
      this.studentCache.invalidate(String(studentId));
    }
    this.listCache.invalidate();

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
    const normalizedSemester = this.normalizeNullableString(dto.semester);
    const normalizedAssessmentType = this.normalizeNullableString(
      dto.assessmentType,
    );
    const existingGrades = await this.prisma.studentGrade.findMany({
      where: {
        classId: dto.classId,
        moduleId: context.resolvedModuleId,
        elementModuleId: context.resolvedElementModuleId,
        semester: normalizedSemester,
        assessmentType: normalizedAssessmentType,
        academicYear: dto.academicYear.trim(),
      },
      select: {
        studentId: true,
        score: true,
      },
    });
    const existingGradeByStudentId = new Map(
      existingGrades.map((grade) => [grade.studentId, grade]),
    );

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
      const rattrapageScore = this.readImportNumber(row, [
        'rattrapage',
        'note_rattrapage',
        'note_apres_rattrapage',
        'note après rattrapage',
        'apres_rattrapage',
        'après_rattrapage',
        'rattrapagescore',
        'rattrapageScore',
      ]);

      const existingScore = student
        ? existingGradeByStudentId.get(student.id)?.score
        : undefined;
      const resolvedScore = scoreValue ?? existingScore ?? null;

      if (!student || resolvedScore === null) {
        skipped += 1;
        continue;
      }

      grades.push({
        studentId: student.id,
        score: resolvedScore,
        ...(rattrapageScore !== null ? { rattrapageScore } : {}),
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

  async getDeliberation(
    classId: number,
    academicYear?: string,
    semester?: string,
    publicationStatus?: string,
  ) {
    const [academicClass, moduleAssignments, students, grades] =
      await Promise.all([
        this.prisma.academicClass.findUnique({
          where: { id: classId },
          select: {
            id: true,
            name: true,
            year: true,
            filiere: { select: { id: true, name: true } },
            academicOption: { select: { id: true, name: true } },
          },
        }),
        this.prisma.moduleClass.findMany({
          where: { classId },
          include: {
            module: {
              select: {
                id: true,
                name: true,
                semestre: true,
                elements: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    volumeHoraire: true,
                    ponderation: true,
                  },
                  orderBy: { name: 'asc' },
                },
              },
            },
          },
          orderBy: { module: { name: 'asc' } },
        }),
        this.prisma.student.findMany({
          where: { classId },
          select: {
            id: true,
            fullName: true,
            codeMassar: true,
            dateNaissance: true,
          },
          orderBy: { fullName: 'asc' },
        }),
        this.prisma.studentGrade.findMany({
          where: {
            classId,
            ...(academicYear ? { academicYear } : {}),
            ...(semester ? { semester } : {}),
            ...(publicationStatus ? { publicationStatus } : {}),
          },
          select: {
            studentId: true,
            elementModuleId: true,
            moduleId: true,
            score: true,
            maxScore: true,
            rattrapageScore: true,
            rattrapageMaxScore: true,
            assessmentType: true,
            academicYear: true,
            semester: true,
            publicationStatus: true,
            publishedAt: true,
            lockedAt: true,
          },
        }),
      ]);

    if (!academicClass) {
      throw new NotFoundException(`Class ${classId} not found`);
    }

    const modules = moduleAssignments.map((assignment) => ({
      id: assignment.module.id,
      name: assignment.module.name,
      semestre: assignment.module.semestre,
      elements: assignment.module.elements,
    }));

    // Build grade lookup: studentId -> elementModuleId -> grade
    const gradeMap = new Map<number, Map<number, ElementGradeSummary>>();

    for (const grade of grades) {
      if (!grade.elementModuleId) continue;
      if (!gradeMap.has(grade.studentId)) {
        gradeMap.set(grade.studentId, new Map<number, ElementGradeSummary>());
      }
      const studentMap = gradeMap.get(grade.studentId)!;
      // Keep the first grade found for each element (can be extended for multiple assessment types)
      if (!studentMap.has(grade.elementModuleId)) {
        const finalGrade = this.resolveFinalGradeScore(grade);
        studentMap.set(grade.elementModuleId, {
          score: finalGrade.score,
          maxScore: finalGrade.maxScore,
          initialScore: grade.score,
          initialMaxScore: grade.maxScore,
          rattrapageScore: grade.rattrapageScore,
          rattrapageMaxScore: grade.rattrapageMaxScore,
          assessmentType: grade.assessmentType,
          publicationStatus: grade.publicationStatus as GradePublicationStatus,
          publishedAt: grade.publishedAt,
          lockedAt: grade.lockedAt,
        });
      }
    }

    const studentsWithGrades = students.map((student) => {
      const studentGradeMap =
        gradeMap.get(student.id) ?? new Map<number, ElementGradeSummary>();
      const gradesByElement: Record<number, ElementGradeSummary> = {};
      studentGradeMap.forEach((grade, elementId) => {
        gradesByElement[elementId] = grade;
      });

      // Compute module averages
      const moduleAverages: Record<number, number | null> = {};
      let overallWeightedSum = 0;
      let overallWeight = 0;
      for (const mod of modules) {
        const elementGrades = mod.elements
          .map((el) => studentGradeMap.get(el.id))
          .filter((g): g is ElementGradeSummary => g !== undefined);
        if (elementGrades.length === 0) {
          moduleAverages[mod.id] = null;
        } else {
          let weightedSum = 0;
          let totalWeight = 0;
          for (const el of mod.elements) {
            const grade = studentGradeMap.get(el.id);
            if (!grade) continue;
            const weight = el.ponderation;
            if (weight <= 0) continue;
            weightedSum += this.normalizeGradeScore(grade) * weight;
            totalWeight += weight;
          }

          const avg =
            totalWeight > 0
              ? weightedSum / totalWeight
              : elementGrades.reduce(
                  (sum, g) => sum + this.normalizeGradeScore(g),
                  0,
                ) / elementGrades.length;
          moduleAverages[mod.id] = Math.round(avg * 100) / 100;
          overallWeightedSum += weightedSum;
          overallWeight += totalWeight;
        }
      }

      // Overall average across all modules with grades
      const validModuleAverages = Object.values(moduleAverages).filter(
        (v): v is number => v !== null,
      );
      const overallAverage =
        overallWeight > 0
          ? Math.round((overallWeightedSum / overallWeight) * 100) / 100
          : validModuleAverages.length > 0
            ? Math.round(
                (validModuleAverages.reduce((sum, v) => sum + v, 0) /
                  validModuleAverages.length) *
                  100,
              ) / 100
            : null;

      return {
        id: student.id,
        fullName: student.fullName,
        codeMassar: student.codeMassar,
        dateNaissance: student.dateNaissance,
        grades: gradesByElement,
        moduleAverages,
        overallAverage,
      };
    });

    return {
      class: academicClass,
      modules,
      students: studentsWithGrades,
      academicYear: academicYear ?? null,
      semester: semester ?? null,
      publicationSummary: this.summarizePublication(grades),
    };
  }

  async publish(dto: PublishGradesDto, currentUser?: JwtPayload) {
    const where = await this.gradeScopeWhere(dto, currentUser);
    const now = new Date();
    const result = await this.prisma.studentGrade.updateMany({
      where,
      data: {
        publicationStatus: 'published',
        publishedAt: now,
        lockedAt: now,
      },
    });
    this.invalidateGradeCaches();
    return { published: result.count };
  }

  async reopen(dto: PublishGradesDto, currentUser?: JwtPayload) {
    if (
      currentUser?.role !== UserRole.ADMIN &&
      currentUser?.role !== UserRole.INSPECTOR
    ) {
      throw new ForbiddenException(
        'Only an administrator or inspector can reopen published notes.',
      );
    }
    const where = await this.gradeScopeWhere(dto, currentUser);
    const result = await this.prisma.studentGrade.updateMany({
      where,
      data: {
        lockedAt: null,
        reopenedAt: new Date(),
      },
    });
    this.invalidateGradeCaches();
    return { reopened: result.count };
  }

  async unpublish(dto: PublishGradesDto, currentUser?: JwtPayload) {
    if (
      currentUser?.role !== UserRole.ADMIN &&
      currentUser?.role !== UserRole.INSPECTOR
    ) {
      throw new ForbiddenException(
        'Only an administrator or inspector can hide published notes.',
      );
    }
    const where = await this.gradeScopeWhere(dto, currentUser);
    const result = await this.prisma.studentGrade.updateMany({
      where,
      data: {
        publicationStatus: 'draft',
        lockedAt: null,
        reopenedAt: new Date(),
      },
    });
    this.invalidateGradeCaches();
    return { unpublished: result.count };
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
    if (existing.lockedAt) {
      throw new ForbiddenException(
        'Cette note est publiée et verrouillée. Un administrateur doit la rouvrir avant suppression.',
      );
    }

    const departmentId =
      existing.academicClass?.filiere?.departmentId ??
      existing.elementModule?.module?.filiere?.departmentId ??
      existing.module?.filiere?.departmentId ??
      existing.student.academicClass?.filiere?.departmentId ??
      existing.student.filiere?.departmentId;

    this.ensureCanManageDepartment(departmentId, currentUser);
    if (currentUser?.role === UserRole.TEACHER) {
      const teacherId = await this.getCurrentTeacherId(currentUser);
      if (!teacherId || existing.teacherId !== teacherId) {
        throw new ForbiddenException(
          'Vous pouvez supprimer uniquement les notes des cours que vous enseignez.',
        );
      }
    }

    const deleted = await this.prisma.studentGrade.delete({ where: { id } });
    this.invalidateGradeCaches(existing.studentId);
    return deleted;
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
      (!isDeptScoped(currentUser.role) && currentUser.role !== UserRole.VIEWER)
    ) {
      return;
    }

    if (!departmentId || !currentUser.departmentIds.includes(departmentId)) {
      throw new ForbiddenException(
        'You can only manage grades in your own department',
      );
    }
  }

  private async getCurrentTeacherId(currentUser?: JwtPayload) {
    if (currentUser?.role !== UserRole.TEACHER) return null;
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: currentUser.sub },
      select: { id: true },
    });
    if (!teacher) {
      throw new ForbiddenException('Aucun profil enseignant lié à ce compte.');
    }
    return teacher.id;
  }

  private async teacherGradeScopeWhere(
    currentUser: JwtPayload,
  ): Promise<Prisma.StudentGradeWhereInput> {
    const teacherId = await this.getCurrentTeacherId(currentUser);
    const assignments = await this.prisma.coursClass.findMany({
      where: { teacherId },
      select: {
        classId: true,
        cours: {
          select: {
            elementModuleId: true,
            elementModule: { select: { moduleId: true } },
          },
        },
      },
    });

    if (assignments.length === 0) {
      return { id: -1 };
    }

    return {
      OR: [
        { teacherId },
        ...assignments.map((assignment) => ({
          classId: assignment.classId,
          ...(assignment.cours.elementModuleId
            ? { elementModuleId: assignment.cours.elementModuleId }
            : {}),
          ...(assignment.cours.elementModule?.moduleId
            ? { moduleId: assignment.cours.elementModule.moduleId }
            : {}),
        })),
      ],
    };
  }

  private async ensureTeacherCanEditGrade(
    context: GradeContext,
    currentUser?: JwtPayload,
  ) {
    if (currentUser?.role !== UserRole.TEACHER) return;
    const teacherId = await this.getCurrentTeacherId(currentUser);
    if (!context.resolvedClassId) {
      throw new BadRequestException('La classe est obligatoire pour un enseignant.');
    }

    const assignment = await this.prisma.coursClass.findFirst({
      where: {
        teacherId,
        classId: context.resolvedClassId,
        ...(context.resolvedElementModuleId || context.resolvedModuleId
          ? {
              cours: {
                ...(context.resolvedElementModuleId
                  ? { elementModuleId: context.resolvedElementModuleId }
                  : {}),
                ...(context.resolvedModuleId
                  ? {
                      elementModule: {
                        moduleId: context.resolvedModuleId,
                      },
                    }
                  : {}),
              },
            }
          : {}),
      },
      select: { id: true },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'Vous pouvez saisir les notes uniquement pour les cours que vous enseignez.',
      );
    }
  }

  private ensureValidScores(
    grades: Array<{ studentId: number; score: number }>,
    maxScore: number,
  ) {
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 20) {
      throw new BadRequestException('Le barème doit être compris entre 1 et 20.');
    }
    const invalid = grades.find(
      (grade) =>
        !Number.isFinite(grade.score) ||
        grade.score < 0 ||
        grade.score > maxScore,
    );
    if (invalid) {
      throw new BadRequestException(
        `La note de l'étudiant ${invalid.studentId} doit être comprise entre 0 et ${maxScore}.`,
      );
    }
  }

  private ensureValidOptionalScores(
    grades: Array<{ studentId: number; score?: number | null }>,
    maxScore: number,
    label: string,
  ) {
    if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 20) {
      throw new BadRequestException('Le barème doit être compris entre 1 et 20.');
    }
    const invalid = grades.find(
      (grade) =>
        grade.score !== undefined &&
        grade.score !== null &&
        (!Number.isFinite(grade.score) ||
          grade.score < 0 ||
          grade.score > maxScore),
    );
    if (invalid) {
      throw new BadRequestException(
        `${label} de l'étudiant ${invalid.studentId} doit être comprise entre 0 et ${maxScore}.`,
      );
    }
  }

  private resolveFinalGradeScore(grade: {
    score: number;
    maxScore: number;
    rattrapageScore?: number | null;
    rattrapageMaxScore?: number | null;
  }) {
    if (grade.rattrapageScore !== undefined && grade.rattrapageScore !== null) {
      return {
        score: grade.rattrapageScore,
        maxScore: grade.rattrapageMaxScore ?? grade.maxScore,
      };
    }
    return { score: grade.score, maxScore: grade.maxScore };
  }

  private normalizeGradeScore(grade: {
    score: number;
    maxScore: number;
    rattrapageScore?: number | null;
    rattrapageMaxScore?: number | null;
  }) {
    const finalGrade = this.resolveFinalGradeScore(grade);
    return finalGrade.maxScore > 0
      ? (finalGrade.score / finalGrade.maxScore) * 20
      : finalGrade.score;
  }

  private summarizePublication(
    grades: Array<{ publicationStatus: string; lockedAt: Date | null }>,
  ) {
    const summary = {
      draft: 0,
      published: 0,
      modified_after_publication: 0,
      locked: 0,
      total: grades.length,
    };
    for (const grade of grades) {
      if (grade.publicationStatus === 'published') summary.published += 1;
      else if (grade.publicationStatus === 'modified_after_publication') {
        summary.modified_after_publication += 1;
      } else summary.draft += 1;
      if (grade.lockedAt) summary.locked += 1;
    }
    return summary;
  }

  private async gradeScopeWhere(
    dto: PublishGradesDto,
    currentUser?: JwtPayload,
  ): Promise<Prisma.StudentGradeWhereInput> {
    const context = await this.resolveContext({
      classId: dto.classId,
      moduleId: dto.moduleId,
      elementModuleId: dto.elementModuleId,
      currentUser,
    });
    const academicYear = dto.academicYear.trim();
    if (!academicYear) {
      throw new BadRequestException('Choisissez une année académique.');
    }
    return {
      classId: dto.classId,
      academicYear,
      ...(dto.moduleId ? { moduleId: context.resolvedModuleId } : {}),
      ...(dto.elementModuleId
        ? { elementModuleId: context.resolvedElementModuleId }
        : {}),
      ...(dto.semester
        ? { semester: this.normalizeNullableString(dto.semester) }
        : {}),
    };
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

  private invalidateGradeCaches(studentId?: number) {
    this.listCache.invalidate();
    if (studentId !== undefined) {
      this.studentCache.invalidate(String(studentId));
    } else {
      this.studentCache.invalidate();
    }
  }
}
