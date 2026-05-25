import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TransferStudentsDto } from './dto/transfer-students.dto';
import { ProgressStudentsDto } from './dto/progress-students.dto';
import { GroupType, PrepaYear, Prisma, Sex, StudentCycle } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KeyedTtlCache } from '../../common/utils/keyed-ttl-cache';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole, isDeptScoped } from '../../common/types/role.type';
import { UsersService } from '../users/users.service';

const STUDENT_LIST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  fullName: true,
  sex: true,
  cin: true,
  codeMassar: true,
  codeEtudiant: true,
  dateNaissance: true,
  email: true,
  telephone: true,
  linkedInUrl: true,
  bacType: true,
  firstYearEntry: true,
  anneeAcademique: true,
  dateInscription: true,
  filiereId: true,
  classId: true,
  userId: true,
  filiere: {
    select: {
      id: true,
      name: true,
      department: { select: { id: true, name: true } },
    },
  },
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
  },
  laureate: {
    select: { id: true, graduationYear: true, diplomaStatus: true },
  },
} satisfies Prisma.StudentSelect;

@Injectable()
export class StudentsService {
  private readonly listCache = new KeyedTtlCache<unknown>({
    prefix: 'students:list',
    ttlMs: 30 * 1000,
    staleTtlMs: 2 * 60 * 1000,
  });

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async findAll(
    pagination: PaginationDto,
    search?: string,
    filiereId?: number,
    departmentIds?: number[],
    options: {
      departmentId?: number;
      classId?: number;
      gender?: Sex;
      birthYear?: number;
      academicYear?: string;
      entryYear?: number;
      accountStatus?: 'with' | 'without';
      laureateStatus?: 'yes' | 'no';
    } = {},
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
    if (options.classId) filters.push({ classId: options.classId });
    if (options.gender) filters.push({ sex: options.gender });
    if (options.academicYear) filters.push({ anneeAcademique: options.academicYear });
    if (options.entryYear) filters.push({ firstYearEntry: options.entryYear });
    if (options.accountStatus === 'with') filters.push({ userId: { not: null } });
    if (options.accountStatus === 'without') filters.push({ userId: null });
    if (options.laureateStatus === 'yes') filters.push({ laureate: { isNot: null } });
    if (options.laureateStatus === 'no') filters.push({ laureate: { is: null } });
    if (options.departmentId) filters.push({ filiere: { departmentId: options.departmentId } });
    if (options.birthYear) {
      filters.push({
        dateNaissance: {
          gte: new Date(`${options.birthYear}-01-01T00:00:00.000Z`),
          lte: new Date(`${options.birthYear}-12-31T23:59:59.999Z`),
        },
      });
    }
    if (departmentIds !== undefined) {
      filters.push({ filiere: { departmentId: { in: departmentIds } } });
    }

    const where: Prisma.StudentWhereInput =
      filters.length > 1 ? { AND: filters } : (filters[0] ?? {});

    const cacheKey = JSON.stringify({
      page: pagination.page,
      limit: pagination.limit,
      search: search ?? null,
      filiereId: filiereId ?? null,
      departmentIds: departmentIds ?? null,
      departmentId: options.departmentId ?? null,
      classId: options.classId ?? null,
      gender: options.gender ?? null,
      birthYear: options.birthYear ?? null,
      academicYear: options.academicYear ?? null,
      entryYear: options.entryYear ?? null,
      accountStatus: options.accountStatus ?? null,
      laureateStatus: options.laureateStatus ?? null,
    });

    return this.listCache.getOrLoad(cacheKey, async () => {
      const [data, total] = await Promise.all([
        this.prisma.student.findMany({
          where,
          select: STUDENT_LIST_SELECT,
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
          orderBy: { id: 'desc' },
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
          hasNextPage: pagination.page * pagination.limit < total,
          hasPreviousPage: pagination.page > 1,
        },
      };
    });
  }

  async findOne(id: number, currentUser?: JwtPayload) {
    if (currentUser?.role === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: currentUser.sub },
        select: { id: true },
      });
      if (!student || student.id !== id) {
        throw new ForbiddenException('Vous ne pouvez consulter que votre propre profil');
      }
    }

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

  async lookupProfileQr(rawCode: string | undefined, currentUser: JwtPayload) {
    const code = (rawCode ?? '').trim();
    if (!code) throw new BadRequestException('Code QR requis');

    const studentIdFromStructured = /^deaa:student:(\d+)$/i.exec(code)?.[1];
    const studentIdFromUrl = /\/students\/(\d+)/i.exec(code)?.[1];
    const userIdFromStructured = /^deaa:user:(\d+)$/i.exec(code)?.[1];

    if (userIdFromStructured && currentUser.role !== UserRole.STUDENT) {
      const user = await this.prisma.user.findUnique({
        where: { id: Number(userIdFromStructured) },
        select: { id: true, fullName: true, email: true },
      });
      if (!user) throw new NotFoundException('Utilisateur introuvable');
      return {
        type: 'user',
        title: user.fullName,
        subtitle: user.email,
        href: `/users?search=${encodeURIComponent(user.email)}`,
      };
    }

    const student = studentIdFromStructured || studentIdFromUrl
      ? await this.prisma.student.findUnique({
          where: { id: Number(studentIdFromStructured ?? studentIdFromUrl) },
          select: {
            id: true,
            fullName: true,
            codeEtudiant: true,
            codeMassar: true,
            userId: true,
            academicClass: { select: { name: true, year: true } },
          },
        })
      : await this.prisma.student.findFirst({
          where: {
            OR: [
              { codeEtudiant: { equals: code, mode: 'insensitive' } },
              { codeMassar: { equals: code, mode: 'insensitive' } },
              { email: { equals: code, mode: 'insensitive' } },
              { fullName: { equals: code, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            fullName: true,
            codeEtudiant: true,
            codeMassar: true,
            userId: true,
            academicClass: { select: { name: true, year: true } },
          },
        });

    if (!student) throw new NotFoundException('Profil introuvable');
    if (currentUser.role === UserRole.STUDENT && student.userId !== currentUser.sub) {
      throw new ForbiddenException('Vous ne pouvez scanner que votre propre profil');
    }

    return {
      type: 'student',
      title: student.fullName,
      subtitle: [
        student.codeEtudiant ?? student.codeMassar ?? '',
        student.academicClass ? `${student.academicClass.name} A${student.academicClass.year}` : '',
      ].filter(Boolean).join(' · '),
      href: `/students/${student.id}`,
    };
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
    this.listCache.invalidate();

    await this.upsertClassHistory(
      student.id,
      payload.classId ?? dto.classId,
      payload.anneeAcademique ?? dto.anneeAcademique,
      payload.firstYearEntry ?? dto.firstYearEntry,
    );

    // Auto-provision account (fire-and-forget; errors are suppressed)
    this.autoProvisionAccount(student.id, dto.codeMassar).catch(() => {
      /* non-blocking */
    });

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
    this.listCache.invalidate();

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

    // Sync group membership when class/filière changes
    if (dto.classId !== undefined || dto.filiereId !== undefined) {
      this.syncStudentGroupMembership(updated.id).catch(() => {
        /* non-blocking */
      });
    }

    return this.findOne(updated.id);
  }

  async remove(id: number, currentUser?: JwtPayload) {
    const existing = await this.prisma.student.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
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

    const deleted = await this.prisma.$transaction(async (tx) => {
      const removedStudent = await tx.student.delete({ where: { id } });

      if (existing.userId) {
        await tx.user.delete({ where: { id: existing.userId } });
      }

      return removedStudent;
    });

    this.listCache.invalidate();
    if (existing.userId) this.usersService.invalidateListCache();
    return deleted;
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
      (!isDeptScoped(currentUser.role) && currentUser.role !== UserRole.VIEWER)
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
      ...(dto.codeEtudiant !== undefined
        ? { codeEtudiant: dto.codeEtudiant ?? null }
        : {}),
      ...(dto.dateNaissance
        ? { dateNaissance: new Date(dto.dateNaissance) }
        : {}),
      ...(dto.email !== undefined ? { email: dto.email ?? null } : {}),
      ...(dto.telephone !== undefined
        ? { telephone: dto.telephone ?? null }
        : {}),
      ...(dto.linkedInUrl !== undefined
        ? { linkedInUrl: dto.linkedInUrl ?? null }
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
    semestre?: string,
    tx?: Prisma.TransactionClient,
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

    const db = tx ?? this.prisma;
    await db.studentClassHistory.upsert({
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
        ...(semestre ? { semestre } : {}),
      },
      create: {
        studentId,
        classId: normalizedClassId,
        academicYear,
        studyYear: computedStudyYear,
        ...(decisionStatus ? { decisionStatus } : {}),
        ...(semestre ? { semestre } : {}),
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

    // Single batch fetch instead of N individual findUnique calls
    const students = await this.prisma.student.findMany({
      where: { id: { in: dto.studentIds } },
      select: { id: true, fullName: true, firstYearEntry: true, classId: true },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const errors: string[] = [];
    const validStudents: (typeof students)[number][] = [];

    for (const studentId of dto.studentIds) {
      const student = studentMap.get(studentId);
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
      validStudents.push(student);
    }

    if (validStudents.length > 0) {
      // Single updateMany + history upserts in one transaction
      await this.prisma.$transaction(async (tx) => {
        await tx.student.updateMany({
          where: { id: { in: validStudents.map((s) => s.id) } },
          data: {
            classId: dto.toClassId,
            anneeAcademique: dto.academicYear,
            ...(toClass.filiereId ? { filiereId: toClass.filiereId } : {}),
          },
        });
        for (const student of validStudents) {
          await this.upsertClassHistory(
            student.id,
            dto.toClassId,
            dto.academicYear,
            student.firstYearEntry,
            undefined,
            dto.semestre,
            tx,
          );
        }
      });
      this.listCache.invalidate();
    }

    // Sync group membership for transferred students (non-blocking)
    for (const s of validStudents) {
      this.syncStudentGroupMembership(s.id).catch(() => {
        /* non-blocking */
      });
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
            transferred: validStudents.length,
            errors: errors.length,
          },
        },
      });
    }

    return { transferred: validStudents.length, errors };
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

    // Single batch fetch instead of N individual findUnique calls
    const students = await this.prisma.student.findMany({
      where: { id: { in: dto.students.map((e) => e.id) } },
      select: { id: true, fullName: true, firstYearEntry: true, classId: true },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));

    const errors: string[] = [];
    type ValidEntry = { id: number; firstYearEntry: number; status: string };
    const admisGroup: ValidEntry[] = [];
    const otherGroup: ValidEntry[] = [];

    for (const entry of dto.students) {
      const student = studentMap.get(entry.id);
      if (!student) {
        errors.push(`Étudiant ${entry.id}: introuvable`);
        continue;
      }
      if (student.classId !== dto.fromClassId) {
        errors.push(`${student.fullName}: non inscrit dans la classe source`);
        continue;
      }
      const record = {
        id: student.id,
        firstYearEntry: student.firstYearEntry,
        status: entry.status,
      };
      if (entry.status === 'admis') admisGroup.push(record);
      else otherGroup.push(record);
    }

    const processed = admisGroup.length + otherGroup.length;

    if (processed > 0) {
      // Two updateMany calls + history upserts in one transaction
      await this.prisma.$transaction(async (tx) => {
        if (admisGroup.length > 0) {
          await tx.student.updateMany({
            where: { id: { in: admisGroup.map((s) => s.id) } },
            data: {
              classId: dto.toClassId,
              anneeAcademique: dto.academicYear,
              ...(toClass.filiereId ? { filiereId: toClass.filiereId } : {}),
            },
          });
        }
        if (otherGroup.length > 0) {
          await tx.student.updateMany({
            where: { id: { in: otherGroup.map((s) => s.id) } },
            data: { anneeAcademique: dto.academicYear },
          });
        }
        for (const s of admisGroup) {
          await this.upsertClassHistory(
            s.id,
            dto.toClassId,
            dto.academicYear,
            s.firstYearEntry,
            'admis',
            undefined,
            tx,
          );
        }
        for (const s of otherGroup) {
          await this.upsertClassHistory(
            s.id,
            dto.fromClassId,
            dto.academicYear,
            s.firstYearEntry,
            s.status,
            undefined,
            tx,
          );
        }
      });
      this.listCache.invalidate();
    }

    // Sync group membership for promoted students (non-blocking)
    for (const s of admisGroup) {
      this.syncStudentGroupMembership(s.id).catch(() => {
        /* non-blocking */
      });
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
      const updated = await this.prisma.laureate.update({
        where: { studentId },
        data: { graduationYear },
      });
      this.listCache.invalidate();
      return updated;
    }

    // Create new laureate record
    const created = await this.prisma.laureate.create({
      data: {
        studentId,
        graduationYear,
      },
    });
    this.listCache.invalidate();
    return created;
  }

  async removeLaureate(studentId: number) {
    const laureate = await this.prisma.laureate.findUnique({
      where: { studentId },
    });

    if (!laureate) {
      // Not an error, just nothing to remove
      return null;
    }

    const deleted = await this.prisma.laureate.delete({
      where: { studentId },
    });
    this.listCache.invalidate();
    return deleted;
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
          codeEtudiant:
            cellString(row['codeEtudiant'], row['Code Étudiant']) || undefined,
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

    if (imported > 0) {
      this.listCache.invalidate();
    }

    return { imported, errors };
  }

  // ─── Account creation ────────────────────────────────────────────────────────

  /**
   * Create (or retrieve) a User account for a student.
   * Email: student.email if set, else {codeEtudiant}@iav.ac.ma, else {codeMassar}@iav.ac.ma
   * Role: student. Linked back via Student.userId.
   */
  async createAccount(
    studentId: number,
    password: string,
    currentUser?: JwtPayload,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        filiere: { select: { department: { select: { id: true } } } },
      },
    });
    if (!student) throw new NotFoundException(`Student ${studentId} not found`);

    const departmentId = student.filiere?.department?.id ?? null;
    this.ensureCanManageDepartment(departmentId, currentUser);

    if (student.userId) {
      throw new ConflictException('Student already has a user account');
    }

    const identifier = student.codeEtudiant ?? student.codeMassar;
    const email = student.email ?? `${identifier}@iav.ac.ma`;

    // Check email not already taken
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(
        `Email ${email} is already in use. Update the student's email first.`,
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          fullName: student.fullName,
          email,
          role: 'student',
          passwordHash,
          ...(departmentId
            ? { departments: { create: [{ departmentId }] } }
            : {}),
        },
        select: { id: true, fullName: true, email: true, role: true },
      }),
    ]);

    await this.prisma.student.update({
      where: { id: studentId },
      data: { userId: user.id },
    });
    this.listCache.invalidate();

    // Add new user to message groups (non-blocking)
    this.addUserToGroups(
      user.id,
      student.classId,
      student.filiereId,
      departmentId,
    ).catch(() => {
      /* non-blocking */
    });

    return { user, studentId };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Silently provision an account for a newly-created student.
   * Uses codeMassar as the default password. Skips if account already exists.
   */
  private async autoProvisionAccount(
    studentId: number,
    defaultPassword: string,
  ): Promise<void> {
    const s = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true },
    });
    if (s?.userId) return; // already has account

    try {
      await this.createAccount(studentId, defaultPassword);
    } catch {
      // ConflictException (duplicate email) or other — silently skip
    }
  }

  /**
   * Add a user to the relevant message groups:
   *  - EVERYONE (id=1)
   *  - CLASS group for their class
   *  - FILIERE group for their filière
   *  - DEPARTMENT group for their department
   */
  private async addUserToGroups(
    userId: number,
    classId: number | null | undefined,
    filiereId: number | null | undefined,
    departmentId: number | null | undefined,
  ): Promise<void> {
    // Always add to EVERYONE
    await this.prisma.messageGroupMember.upsert({
      where: { groupId_userId: { groupId: 1, userId } },
      update: {},
      create: { groupId: 1, userId, canSend: false },
    });

    if (classId) {
      const groupId = await this.ensureClassMessageGroup(classId);
      await this.prisma.messageGroupMember.upsert({
        where: { groupId_userId: { groupId, userId } },
        update: {},
        create: { groupId, userId, canSend: false },
      });
    }

    if (filiereId) {
      const fg = await this.prisma.messageGroup.findFirst({
        where: { type: GroupType.FILIERE, referenceId: filiereId },
        select: { id: true },
      });
      if (fg) {
        await this.prisma.messageGroupMember.upsert({
          where: { groupId_userId: { groupId: fg.id, userId } },
          update: {},
          create: { groupId: fg.id, userId, canSend: false },
        });
      }
    }

    if (departmentId) {
      const dg = await this.prisma.messageGroup.findFirst({
        where: { type: GroupType.DEPARTMENT, referenceId: departmentId },
        select: { id: true },
      });
      if (dg) {
        await this.prisma.messageGroupMember.upsert({
          where: { groupId_userId: { groupId: dg.id, userId } },
          update: {},
          create: { groupId: dg.id, userId, canSend: false },
        });
      }
    }
  }

  /** Sync a student's user account into the correct messaging groups based on current class/filière/dept. */
  private async syncStudentGroupMembership(studentId: number): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        userId: true,
        classId: true,
        filiereId: true,
        filiere: { select: { departmentId: true } },
        academicClass: {
          select: { filiere: { select: { departmentId: true } } },
        },
      },
    });
    if (!student?.userId) return;
    const departmentId =
      student.academicClass?.filiere?.departmentId ??
      student.filiere?.departmentId ??
      null;
    await this.addUserToGroups(
      student.userId,
      student.classId,
      student.filiereId,
      departmentId,
    );
  }

  /** Ensure a CLASS message group exists for the given classId, creating it if needed. */
  private async ensureClassMessageGroup(classId: number): Promise<number> {
    const existing = await this.prisma.messageGroup.findFirst({
      where: { type: GroupType.CLASS, referenceId: classId },
      select: { id: true },
    });
    if (existing) return existing.id;

    const cls = await this.prisma.academicClass.findUnique({
      where: { id: classId },
      select: { name: true },
    });
    const group = await this.prisma.messageGroup.create({
      data: {
        name: `Classe: ${cls?.name ?? classId}`,
        type: GroupType.CLASS,
        referenceId: classId,
      },
      select: { id: true },
    });
    return group.id;
  }

  /**
   * Bulk-create accounts for multiple students using one shared default password.
   * Skips students that already have an account. Returns counts + per-student errors.
   */
  async bulkCreateAccounts(
    studentIds: number[],
    defaultPassword: string,
    currentUser?: JwtPayload,
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;
    let skipped = 0;

    for (const id of studentIds) {
      try {
        await this.createAccount(id, defaultPassword, currentUser);
        created++;
      } catch (err: unknown) {
        if (
          err instanceof ConflictException &&
          (err.message.includes('already has') ||
            err.message.includes('already in use'))
        ) {
          skipped++;
        } else {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Student ${id}: ${msg}`);
        }
      }
    }

    return { created, skipped, errors };
  }

  async updatePhoto(id: number, path: string) {
    await this.prisma.student.update({
      where: { id },
      data: { photoPath: path },
    });
    return { success: true };
  }

  async getPhotoPath(id: number): Promise<string | null> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { photoPath: true },
    });
    return student?.photoPath ?? null;
  }
}
