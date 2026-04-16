import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransferStudentsDto } from './dto/transfer-students.dto';
import { ProgressStudentsDto } from './dto/progress-students.dto';
import { PrepaYear, Prisma, StudentCycle } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../../common/types/role.type';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    pagination: PaginationDto,
    search?: string,
    filiereId?: number,
    departmentIds?: number[],
  ) {
    const filters: Prisma.StudentWhereInput[] = [];
    if (search) {
      filters.push({
        OR: [
          { fullName: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { codeMassar: { contains: search } },
          { cin: { contains: search } },
        ],
      });
    }
    if (filiereId) filters.push({ filiereId });
    if (departmentIds !== undefined) {
      filters.push({ filiere: { departmentId: { in: departmentIds } } });
    }

    const where: Prisma.StudentWhereInput =
      filters.length > 1 ? { AND: filters } : (filters[0] ?? {});

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          filiere: { include: { department: true } },
          academicClass: {
            select: {
              id: true,
              name: true,
              year: true,
              filiere: { select: { id: true, name: true } },
            },
          },
          classHistory: {
            select: {
              id: true,
              academicYear: true,
              studyYear: true,
              academicClass: { select: { id: true, name: true, year: true } },
            },
            orderBy: { academicYear: 'desc' },
          },
          laureate: {
            select: { id: true, graduationYear: true, diplomaStatus: true },
          },
        },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    };
  }

  findOne(id: number) {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        filiere: { include: { department: true } },
        academicClass: {
          include: {
            filiere: true,
          },
        },
        classHistory: {
          include: {
            academicClass: true,
          },
          orderBy: {
            academicYear: 'desc',
          },
        },
      },
    });
  }

  async create(dto: CreateStudentDto, currentUser?: JwtPayload) {
    const departmentId = await this.resolveStudentDepartmentId(
      dto.filiereId,
      dto.classId,
    );
    this.ensureCanManageDepartment(departmentId, currentUser);

    const payload = (await this.buildStudentPayload(
      dto,
    )) as Prisma.StudentUncheckedCreateInput;

    const student = await this.prisma.student.create({
      data: payload,
    });

    await this.upsertClassHistory(
      student.id,
      payload.classId ?? dto.classId,
      payload.anneeAcademique ?? dto.anneeAcademique,
      payload.firstYearEntry ?? dto.firstYearEntry,
    );

    return this.findOne(student.id);
  }

  async update(id: number, dto: UpdateStudentDto, currentUser?: JwtPayload) {
    const existing = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        sex: true,
        cycle: true,
        prepaYear: true,
        prepaTrack: true,
        entryLevel: true,
        filiereId: true,
        classId: true,
        firstYearEntry: true,
        anneeAcademique: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Student ${id} not found`);
    }

    const nextFiliereId =
      dto.filiereId !== undefined
        ? (dto.filiereId ?? null)
        : (existing.filiereId ?? null);
    const nextClassId =
      dto.classId !== undefined
        ? (dto.classId ?? null)
        : (existing.classId ?? null);
    const departmentId = await this.resolveStudentDepartmentId(
      nextFiliereId,
      nextClassId,
    );
    this.ensureCanManageDepartment(departmentId, currentUser);

    const payload = (await this.buildStudentPayload(
      dto,
      existing,
    )) as Prisma.StudentUncheckedUpdateInput;

    const updated = await this.prisma.student.update({
      where: { id },
      data: payload,
    });

    await this.upsertClassHistory(
      updated.id,
      payload.classId !== undefined ? payload.classId : existing.classId,
      payload.anneeAcademique !== undefined
        ? payload.anneeAcademique
        : existing.anneeAcademique,
      payload.firstYearEntry !== undefined
        ? payload.firstYearEntry
        : existing.firstYearEntry,
    );

    return this.findOne(updated.id);
  }

  async remove(id: number, currentUser?: JwtPayload) {
    const existing = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        filiere: { select: { departmentId: true } },
        academicClass: {
          select: { filiere: { select: { departmentId: true } } },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Student ${id} not found`);
    }

    const departmentId =
      existing.academicClass?.filiere?.departmentId ??
      existing.filiere?.departmentId ??
      null;
    this.ensureCanManageDepartment(departmentId, currentUser);

    return this.prisma.student.delete({ where: { id } });
  }

  private async resolveStudentDepartmentId(
    filiereId?: number | null,
    classId?: number | null,
  ): Promise<number | null> {
    if (classId) {
      const cls = await this.prisma.academicClass.findUnique({
        where: { id: classId },
        select: { filiere: { select: { departmentId: true } } },
      });
      if (!cls) {
        throw new NotFoundException(`Class ${classId} not found`);
      }
      return cls.filiere?.departmentId ?? null;
    }

    if (filiereId) {
      const filiere = await this.prisma.filiere.findUnique({
        where: { id: filiereId },
        select: { departmentId: true },
      });
      if (!filiere) {
        throw new NotFoundException(`Filiere ${filiereId} not found`);
      }
      return filiere.departmentId;
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
        'You can only manage students in your own department',
      );
    }
  }

  private async buildStudentPayload(
    dto: CreateStudentDto | UpdateStudentDto,
    existing?: {
      id: number;
      sex: 'male' | 'female';
      cycle: StudentCycle;
      prepaYear: PrepaYear | null;
      prepaTrack: string | null;
      entryLevel: number | null;
      filiereId: number | null;
      classId: number | null;
      firstYearEntry: number;
      anneeAcademique: string;
    },
  ) {
    const normalizedNames = this.resolveStudentNames(dto, existing);
    const cycle = dto.cycle ?? existing?.cycle ?? StudentCycle.prepa;

    const filiereId =
      dto.filiereId !== undefined
        ? (dto.filiereId ?? null)
        : (existing?.filiereId ?? null);
    const classId =
      dto.classId !== undefined
        ? (dto.classId ?? null)
        : (existing?.classId ?? null);

    if (filiereId) {
      await this.ensureFiliereExists(filiereId);
    }

    if (classId) {
      const academicClass = await this.ensureClassExists(classId);
      if (
        filiereId &&
        academicClass.filiereId &&
        academicClass.filiereId !== filiereId
      ) {
        throw new BadRequestException(
          'Selected class does not belong to the selected filière',
        );
      }
    }

    const payload: Record<string, unknown> = {
      ...normalizedNames,
      ...(dto.sex !== undefined ? { sex: dto.sex } : {}),
      ...(dto.cin !== undefined ? { cin: dto.cin } : {}),
      ...(dto.codeMassar !== undefined ? { codeMassar: dto.codeMassar } : {}),
      ...(dto.dateNaissance
        ? { dateNaissance: new Date(dto.dateNaissance) }
        : {}),
      ...(dto.email !== undefined ? { email: dto.email ?? null } : {}),
      ...(dto.telephone !== undefined
        ? { telephone: dto.telephone ?? null }
        : {}),
      ...(dto.cycle !== undefined ? { cycle: dto.cycle } : {}),
      ...(dto.bacType !== undefined ? { bacType: dto.bacType ?? null } : {}),
      ...(dto.firstYearEntry !== undefined
        ? { firstYearEntry: dto.firstYearEntry }
        : {}),
      ...(dto.anneeAcademique !== undefined
        ? { anneeAcademique: dto.anneeAcademique }
        : {}),
      ...(dto.dateInscription
        ? { dateInscription: new Date(dto.dateInscription) }
        : {}),
      ...(dto.cycle !== undefined || !existing ? { cycle } : {}),
      ...(dto.filiereId !== undefined ? { filiereId } : {}),
      ...(dto.classId !== undefined ? { classId } : {}),
    };

    if (cycle === StudentCycle.prepa) {
      const nextPrepaYear = dto.prepaYear ?? existing?.prepaYear;
      payload.prepaYear = nextPrepaYear ?? null;
      payload.prepaTrack =
        dto.prepaTrack !== undefined
          ? (dto.prepaTrack ?? null)
          : (existing?.prepaTrack ?? null);
      payload.entryLevel = null;
    } else {
      const nextEntryLevel =
        dto.entryLevel !== undefined
          ? (dto.entryLevel ?? null)
          : (existing?.entryLevel ?? null);
      payload.entryLevel = nextEntryLevel;
      payload.prepaYear = null;
      payload.prepaTrack = null;
    }

    return payload;
  }

  private resolveStudentNames(
    dto: CreateStudentDto | UpdateStudentDto,
    existing?: {
      id: number;
      sex: 'male' | 'female';
      cycle: StudentCycle;
      prepaYear: PrepaYear | null;
      prepaTrack: string | null;
      entryLevel: number | null;
      filiereId: number | null;
      classId: number | null;
      firstYearEntry: number;
      anneeAcademique: string;
    },
  ) {
    const trimmedFirstName = dto.firstName?.trim();
    const trimmedLastName = dto.lastName?.trim();
    const trimmedFullName = dto.fullName?.trim();

    const hasProvidedFirstOrLast =
      dto.firstName !== undefined || dto.lastName !== undefined;

    if (!existing) {
      if (!trimmedFullName && (!trimmedFirstName || !trimmedLastName)) {
        throw new BadRequestException(
          'Provide fullName or both firstName and lastName',
        );
      }
    }

    if (hasProvidedFirstOrLast) {
      const nextFirstName = trimmedFirstName ?? null;
      const nextLastName = trimmedLastName ?? null;
      const nextFullName = trimmedFullName
        ? trimmedFullName
        : [nextFirstName, nextLastName].filter(Boolean).join(' ').trim() ||
          null;

      return {
        firstName: nextFirstName,
        lastName: nextLastName,
        ...(nextFullName ? { fullName: nextFullName } : {}),
      };
    }

    if (dto.fullName !== undefined && trimmedFullName) {
      const [firstPart, ...rest] = trimmedFullName.split(' ');
      const guessedFirstName = firstPart?.trim() || null;
      const guessedLastName = rest.join(' ').trim() || null;

      return {
        fullName: trimmedFullName,
        firstName: guessedFirstName,
        lastName: guessedLastName,
      };
    }

    return {};
  }

  private parseAcademicStartYear(value: unknown): number | null {
    if (typeof value !== 'string') {
      return null;
    }

    const match = value.match(/\d{4}/);
    if (!match) {
      return null;
    }

    const parsed = Number(match[0]);
    if (!Number.isInteger(parsed)) {
      return null;
    }

    return parsed;
  }

  private async upsertClassHistory(
    studentId: number,
    classId: unknown,
    academicYear: unknown,
    firstYearEntry: unknown,
    decisionStatus?: string,
  ) {
    const normalizedClassId = Number(classId);
    if (!Number.isInteger(normalizedClassId) || normalizedClassId < 1) {
      return;
    }

    if (typeof academicYear !== 'string' || !academicYear.trim()) {
      return;
    }

    const normalizedFirstYearEntry = Number(firstYearEntry);
    if (
      !Number.isInteger(normalizedFirstYearEntry) ||
      normalizedFirstYearEntry < 1900 ||
      normalizedFirstYearEntry > 2100
    ) {
      return;
    }

    const startYear = this.parseAcademicStartYear(academicYear);
    const computedStudyYear = startYear
      ? Math.max(1, startYear - normalizedFirstYearEntry + 1)
      : 1;

    await this.prisma.studentClassHistory.upsert({
      where: {
        studentId_academicYear: {
          studentId,
          academicYear,
        },
      },
      update: {
        classId: normalizedClassId,
        studyYear: computedStudyYear,
        ...(decisionStatus ? { decisionStatus } : {}),
      },
      create: {
        studentId,
        classId: normalizedClassId,
        academicYear,
        studyYear: computedStudyYear,
        ...(decisionStatus ? { decisionStatus } : {}),
      },
    });
  }

  private async ensureFiliereExists(id: number) {
    const filiere = await this.prisma.filiere.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!filiere) {
      throw new NotFoundException(`Filiere ${id} not found`);
    }
  }

  private async ensureClassExists(id: number) {
    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id },
      select: {
        id: true,
        filiereId: true,
      },
    });

    if (!academicClass) {
      throw new NotFoundException(`Class ${id} not found`);
    }

    return academicClass;
  }

  async findByClass(classId: number, pagination?: PaginationDto) {
    const query = {
      where: { classId },
      select: {
        id: true,
        fullName: true,
        codeMassar: true,
        anneeAcademique: true,
        firstYearEntry: true,
        filiere: { select: { id: true, name: true } },
      },
      orderBy: { fullName: 'asc' },
    } satisfies Prisma.StudentFindManyArgs;

    if (!pagination?.page || !pagination?.limit) {
      return this.prisma.student.findMany(query);
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        ...query,
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.student.count({ where: { classId } }),
    ]);

    return {
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit) || 1,
        hasNextPage: pagination.page * pagination.limit < total,
        hasPreviousPage: pagination.page > 1,
      },
    };
  }

  async transferStudents(
    dto: TransferStudentsDto,
    userId?: number,
  ): Promise<{ transferred: number; errors: string[] }> {
    const toClass = await this.prisma.academicClass.findUnique({
      where: { id: dto.toClassId },
      select: { id: true, name: true, filiereId: true },
    });
    if (!toClass) {
      throw new NotFoundException(`Target class ${dto.toClassId} not found`);
    }

    let transferred = 0;
    const errors: string[] = [];

    for (const studentId of dto.studentIds) {
      try {
        const student = await this.prisma.student.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            fullName: true,
            firstYearEntry: true,
            classId: true,
            filiereId: true,
            anneeAcademique: true,
          },
        });

        if (!student) {
          errors.push(`Student ${studentId}: not found`);
          continue;
        }

        if (student.classId !== dto.fromClassId) {
          errors.push(
            `Student ${student.fullName}: not enrolled in source class`,
          );
          continue;
        }

        await this.prisma.student.update({
          where: { id: studentId },
          data: {
            classId: dto.toClassId,
            anneeAcademique: dto.academicYear,
            ...(toClass.filiereId ? { filiereId: toClass.filiereId } : {}),
          },
        });

        await this.upsertClassHistory(
          studentId,
          dto.toClassId,
          dto.academicYear,
          student.firstYearEntry,
        );

        transferred++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Student ${studentId}: ${message}`);
      }
    }

    if (userId) {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'TRANSFER_STUDENTS',
          metadata: {
            fromClassId: dto.fromClassId,
            toClassId: dto.toClassId,
            academicYear: dto.academicYear,
            studentIds: dto.studentIds,
            transferred,
            errors: errors.length,
          },
        },
      });
    }

    return { transferred, errors };
  }

  async progressStudents(
    dto: ProgressStudentsDto,
    userId?: number,
  ): Promise<{ processed: number; errors: string[] }> {
    const toClass = await this.prisma.academicClass.findUnique({
      where: { id: dto.toClassId },
      select: { id: true, name: true, filiereId: true },
    });
    if (!toClass) {
      throw new NotFoundException(`Target class ${dto.toClassId} not found`);
    }

    let processed = 0;
    const errors: string[] = [];

    for (const entry of dto.students) {
      try {
        const student = await this.prisma.student.findUnique({
          where: { id: entry.id },
          select: {
            id: true,
            fullName: true,
            firstYearEntry: true,
            classId: true,
            filiereId: true,
            anneeAcademique: true,
          },
        });

        if (!student) {
          errors.push(`Étudiant ${entry.id}: introuvable`);
          continue;
        }

        if (student.classId !== dto.fromClassId) {
          errors.push(`${student.fullName}: non inscrit dans la classe source`);
          continue;
        }

        if (entry.status === 'admis') {
          // Move to target class
          await this.prisma.student.update({
            where: { id: entry.id },
            data: {
              classId: dto.toClassId,
              anneeAcademique: dto.academicYear,
              ...(toClass.filiereId ? { filiereId: toClass.filiereId } : {}),
            },
          });
          await this.upsertClassHistory(
            entry.id,
            dto.toClassId,
            dto.academicYear,
            student.firstYearEntry,
            'admis',
          );
        } else {
          // Stay in same class, just update academic year
          await this.prisma.student.update({
            where: { id: entry.id },
            data: { anneeAcademique: dto.academicYear },
          });
          await this.upsertClassHistory(
            entry.id,
            dto.fromClassId,
            dto.academicYear,
            student.firstYearEntry,
            entry.status,
          );
        }

        processed++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Étudiant ${entry.id}: ${message}`);
      }
    }

    if (userId) {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'PROGRESS_STUDENTS',
          metadata: {
            fromClassId: dto.fromClassId,
            toClassId: dto.toClassId,
            academicYear: dto.academicYear,
            processed,
            errors: errors.length,
          },
        },
      });
    }

    return { processed, errors };
  }

  async makeLaureate(studentId: number, graduationYear: number) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true },
    });

    if (!student) {
      throw new NotFoundException(`Student ${studentId} not found`);
    }

    // Check if already a laureate
    const existing = await this.prisma.laureate.findUnique({
      where: { studentId },
    });

    if (existing) {
      // Update graduation year if already laureate
      return this.prisma.laureate.update({
        where: { studentId },
        data: { graduationYear },
      });
    }

    // Create new laureate record
    return this.prisma.laureate.create({
      data: {
        studentId,
        graduationYear,
      },
    });
  }

  async removeLaureate(studentId: number) {
    const laureate = await this.prisma.laureate.findUnique({
      where: { studentId },
    });

    if (!laureate) {
      // Not an error, just nothing to remove
      return null;
    }

    return this.prisma.laureate.delete({
      where: { studentId },
    });
  }

  async importFromBuffer(
    buffer: Buffer,
  ): Promise<{ imported: number; errors: string[] }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });

    let imported = 0;
    const errors: string[] = [];
    const cellString = (...values: unknown[]) => {
      const value = values.find(
        (item) => typeof item === 'string' || typeof item === 'number',
      );
      return value === undefined ? '' : String(value).trim();
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const classIdRaw = Number(row['classId'] ?? row['ClassId'] ?? 0);
        if (!classIdRaw) {
          errors.push(`Row ${i + 2}: classId is required`);
          continue;
        }
        const dto: CreateStudentDto = {
          firstName: cellString(row['firstName'], row['Prénom']) || undefined,
          lastName: cellString(row['lastName'], row['Nom']) || undefined,
          fullName: cellString(row['fullName']) || undefined,
          cin: cellString(row['cin'], row['CIN']),
          codeMassar: cellString(row['codeMassar'], row['Code Massar']),
          sex: (['male', 'female'].includes(
            cellString(row['sex']).toLowerCase(),
          )
            ? cellString(row['sex']).toLowerCase()
            : 'male') as 'male' | 'female',
          firstYearEntry: Number(
            row['firstYearEntry'] ?? new Date().getFullYear(),
          ),
          anneeAcademique:
            cellString(row['anneeAcademique'], row['Année Académique']) ||
            '2025/2026',
          classId: classIdRaw,
          filiereId: row['filiereId'] ? Number(row['filiereId']) : undefined,
          email: cellString(row['email']) || undefined,
          telephone: cellString(row['telephone']) || undefined,
          bacType: cellString(row['bacType']) || undefined,
          dateNaissance: cellString(row['dateNaissance']) || '1990-01-01',
          dateInscription:
            cellString(row['dateInscription']) ||
            new Date().toISOString().split('T')[0],
        };
        await this.create(dto);
        imported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Row ${i + 2}: ${message}`);
      }
    }

    return { imported, errors };
  }
}
