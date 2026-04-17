import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TtlCache } from '../../common/utils/ttl-cache';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeacherQueryDto } from './dto/teacher-query.dto';
import { CreateTeacherRoleDto } from './dto/create-teacher-role.dto';
import { UpdateTeacherRoleDto } from './dto/update-teacher-role.dto';
import { CreateTeacherGradeDto } from './dto/create-teacher-grade.dto';
import { UpdateTeacherGradeDto } from './dto/update-teacher-grade.dto';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole, isDeptScoped } from '../../common/types/role.type';

@Injectable()
export class TeachersService {
  private readonly rolesCache = new TtlCache<unknown[]>({
    key: 'teachers:roles',
    ttlMs: 5 * 60 * 1000,
    staleTtlMs: 30 * 60 * 1000,
  });
  private readonly gradesCache = new TtlCache<unknown[]>({
    key: 'teachers:grades',
    ttlMs: 5 * 60 * 1000,
    staleTtlMs: 30 * 60 * 1000,
  });

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: TeacherQueryDto) {
    const {
      page,
      limit,
      search,
      departmentId,
      filiereId,
      roleId,
      gradeId,
      sortBy,
      sortOrder,
    } = query;

    const filters: Prisma.TeacherWhereInput[] = [];

    if (search) {
      filters.push({
        OR: [
          {
            firstName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            phoneNumber: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            cin: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            role: {
              is: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            grade: {
              is: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      });
    }

    if (departmentId) {
      filters.push({ departmentId });
    }

    if (filiereId) {
      filters.push({ filiereId });
    }

    if (roleId) {
      filters.push({ roleId });
    }

    if (gradeId) {
      filters.push({ gradeId });
    }

    const where: Prisma.TeacherWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const [data, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        include: this.buildTeacherInclude(),
        skip: (page - 1) * limit,
        take: limit,
        orderBy:
          sortBy === 'lastName'
            ? [{ lastName: sortOrder }, { firstName: sortOrder }]
            : [
                { [sortBy]: sortOrder },
                { lastName: 'asc' },
                { firstName: 'asc' },
              ],
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: this.buildTeacherInclude(),
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher ${id} not found`);
    }

    return teacher;
  }

  async create(dto: CreateTeacherDto, currentUser?: JwtPayload) {
    const departmentId = dto.departmentId;
    this.ensureCanManageDepartment(departmentId, currentUser);

    const filiereId = dto.filiereId ?? null;
    const classIds = await this.ensureClassAssignmentsExist(dto.classIds ?? []);

    await this.ensureDepartmentExists(departmentId);
    await this.ensureRoleExists(dto.roleId);
    await this.ensureGradeExists(dto.gradeId);

    if (filiereId) {
      await this.ensureFiliereBelongsToDepartment(filiereId, departmentId);
    }

    try {
      return await this.prisma.teacher.create({
        data: {
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          cin: this.normalizeOptionalValue(dto.cin) ?? null,
          email: this.normalizeOptionalValue(dto.email)?.toLowerCase() ?? null,
          phoneNumber: this.normalizeOptionalValue(dto.phoneNumber) ?? null,
          dateInscription: dto.dateInscription
            ? new Date(dto.dateInscription)
            : undefined,
          departmentId,
          filiereId,
          roleId: dto.roleId,
          gradeId: dto.gradeId,
          taughtClasses: classIds.length
            ? {
                create: classIds.map((classId) => ({ classId })),
              }
            : undefined,
        },
        include: this.buildTeacherInclude(),
      });
    } catch (error) {
      this.handleTeacherUniqueErrors(error);
      throw error;
    }
  }

  async update(id: number, dto: UpdateTeacherDto, currentUser?: JwtPayload) {
    const existing = await this.prisma.teacher.findUnique({
      where: { id },
      select: {
        id: true,
        departmentId: true,
        filiereId: true,
        roleId: true,
        gradeId: true,
        taughtClasses: {
          select: {
            classId: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Teacher ${id} not found`);
    }

    const nextDepartmentId = dto.departmentId ?? existing.departmentId;
    this.ensureCanManageDepartment(nextDepartmentId, currentUser);

    const nextFiliereId =
      dto.filiereId !== undefined
        ? (dto.filiereId ?? null)
        : existing.filiereId;
    const nextRoleId = dto.roleId ?? existing.roleId;
    const nextGradeId = dto.gradeId ?? existing.gradeId;

    await this.ensureDepartmentExists(nextDepartmentId);
    await this.ensureRoleExists(nextRoleId);
    await this.ensureGradeExists(nextGradeId);

    if (nextFiliereId) {
      await this.ensureFiliereBelongsToDepartment(
        nextFiliereId,
        nextDepartmentId,
      );
    }

    const nextClassIds =
      dto.classIds !== undefined
        ? await this.ensureClassAssignmentsExist(dto.classIds)
        : await this.ensureClassAssignmentsExist(
            existing.taughtClasses.map((entry) => entry.classId),
          );

    const oldClassIds = existing.taughtClasses.map((e) => e.classId);

    let result: Awaited<ReturnType<typeof this.prisma.teacher.update>>;
    try {
      result = await this.prisma.teacher.update({
        where: { id },
        data: {
          ...(dto.firstName !== undefined
            ? { firstName: dto.firstName.trim() }
            : {}),
          ...(dto.lastName !== undefined
            ? { lastName: dto.lastName.trim() }
            : {}),
          ...(dto.cin !== undefined
            ? {
                cin: this.normalizeOptionalValue(dto.cin) ?? null,
              }
            : {}),
          ...(dto.email !== undefined
            ? {
                email:
                  this.normalizeOptionalValue(dto.email)?.toLowerCase() ?? null,
              }
            : {}),
          ...(dto.phoneNumber !== undefined
            ? {
                phoneNumber:
                  this.normalizeOptionalValue(dto.phoneNumber) ?? null,
              }
            : {}),
          ...(dto.dateInscription !== undefined
            ? {
                dateInscription: new Date(dto.dateInscription),
              }
            : {}),
          ...(dto.departmentId !== undefined
            ? { departmentId: nextDepartmentId }
            : {}),
          ...(dto.filiereId !== undefined ? { filiereId: nextFiliereId } : {}),
          ...(dto.roleId !== undefined ? { roleId: nextRoleId } : {}),
          ...(dto.gradeId !== undefined ? { gradeId: nextGradeId } : {}),
          ...(dto.classIds !== undefined
            ? {
                taughtClasses: {
                  deleteMany: {},
                  create: nextClassIds.map((classId) => ({ classId })),
                },
              }
            : {}),
        },
        include: this.buildTeacherInclude(),
      });
    } catch (error) {
      this.handleTeacherUniqueErrors(error);
      throw error;
    }

    if (currentUser?.sub && dto.classIds !== undefined) {
      await this.prisma.activityLog.create({
        data: {
          userId: currentUser.sub,
          action: 'UPDATE_TEACHER_CLASSES',
          metadata: {
            teacherId: id,
            previousClassIds: oldClassIds,
            newClassIds: nextClassIds,
          },
        },
      });
    }

    return result;
  }

  async remove(id: number, currentUser?: JwtPayload) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      select: { id: true, departmentId: true },
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher ${id} not found`);
    }

    this.ensureCanManageDepartment(teacher.departmentId, currentUser);

    return this.prisma.teacher.delete({ where: { id } });
  }

  private ensureCanManageDepartment(
    departmentId: number | null | undefined,
    currentUser?: JwtPayload,
  ) {
    if (
      !currentUser ||
      (!isDeptScoped(currentUser.role as UserRole) &&
        currentUser.role !== UserRole.VIEWER)
    ) {
      return;
    }

    if (!departmentId || !currentUser.departmentIds.includes(departmentId)) {
      throw new ForbiddenException(
        'You can only manage teachers in your own department',
      );
    }
  }

  async findCours(teacherId: number) {
    await this.ensureTeacherExists(teacherId);
    return this.prisma.coursClass.findMany({
      where: { teacherId },
      include: {
        cours: { select: { id: true, name: true, type: true } },
        class: {
          select: {
            id: true,
            name: true,
            year: true,
            filiere: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findClassLogs(teacherId: number) {
    return this.prisma.activityLog.findMany({
      where: {
        action: 'UPDATE_TEACHER_CLASSES',
        metadata: {
          path: ['teacherId'],
          equals: teacherId,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
      select: {
        id: true,
        action: true,
        metadata: true,
        timestamp: true,
        user: { select: { email: true } },
      },
    });
  }

  async findRoles() {
    return this.rolesCache.getOrLoad(() =>
      this.prisma.teacherRole.findMany({
        include: { _count: { select: { teachers: true } } },
        orderBy: { name: 'asc' },
      }),
    );
  }

  async createRole(dto: CreateTeacherRoleDto) {
    try {
      const result = await this.prisma.teacherRole.create({
        data: { name: dto.name.trim() },
        include: { _count: { select: { teachers: true } } },
      });
      this.rolesCache.invalidate();
      return result;
    } catch (error) {
      this.handleCatalogUniqueError(error, 'Teacher role');
      throw error;
    }
  }

  async updateRole(id: number, dto: UpdateTeacherRoleDto) {
    await this.ensureRoleExists(id);
    try {
      const result = await this.prisma.teacherRole.update({
        where: { id },
        data: { ...(dto.name !== undefined ? { name: dto.name.trim() } : {}) },
        include: { _count: { select: { teachers: true } } },
      });
      this.rolesCache.invalidate();
      return result;
    } catch (error) {
      this.handleCatalogUniqueError(error, 'Teacher role');
      throw error;
    }
  }

  async removeRole(id: number) {
    const role = await this.prisma.teacherRole.findUnique({
      where: { id },
      include: { _count: { select: { teachers: true } } },
    });

    if (!role) throw new NotFoundException(`Teacher role ${id} not found`);
    if (role._count.teachers > 0) {
      throw new BadRequestException(
        'Teacher role cannot be deleted while teachers are still attached',
      );
    }

    const result = await this.prisma.teacherRole.delete({ where: { id } });
    this.rolesCache.invalidate();
    return result;
  }

  async findGrades() {
    return this.gradesCache.getOrLoad(() =>
      this.prisma.teacherGrade.findMany({
        include: { _count: { select: { teachers: true } } },
        orderBy: { name: 'asc' },
      }),
    );
  }

  async createGrade(dto: CreateTeacherGradeDto) {
    try {
      const result = await this.prisma.teacherGrade.create({
        data: { name: dto.name.trim() },
        include: { _count: { select: { teachers: true } } },
      });
      this.gradesCache.invalidate();
      return result;
    } catch (error) {
      this.handleCatalogUniqueError(error, 'Teacher grade');
      throw error;
    }
  }

  async updateGrade(id: number, dto: UpdateTeacherGradeDto) {
    await this.ensureGradeExists(id);
    try {
      const result = await this.prisma.teacherGrade.update({
        where: { id },
        data: { ...(dto.name !== undefined ? { name: dto.name.trim() } : {}) },
        include: { _count: { select: { teachers: true } } },
      });
      this.gradesCache.invalidate();
      return result;
    } catch (error) {
      this.handleCatalogUniqueError(error, 'Teacher grade');
      throw error;
    }
  }

  async removeGrade(id: number) {
    const grade = await this.prisma.teacherGrade.findUnique({
      where: { id },
      include: { _count: { select: { teachers: true } } },
    });

    if (!grade) throw new NotFoundException(`Teacher grade ${id} not found`);
    if (grade._count.teachers > 0) {
      throw new BadRequestException(
        'Teacher grade cannot be deleted while teachers are still attached',
      );
    }

    const result = await this.prisma.teacherGrade.delete({ where: { id } });
    this.gradesCache.invalidate();
    return result;
  }

  private buildTeacherInclude(): Prisma.TeacherInclude {
    return {
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      filiere: {
        select: {
          id: true,
          name: true,
          departmentId: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
      grade: {
        select: {
          id: true,
          name: true,
        },
      },
      taughtClasses: {
        include: {
          class: {
            include: {
              filiere: {
                include: {
                  department: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          class: {
            year: 'desc',
          },
        },
      },
    };
  }

  private normalizeOptionalValue(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private async ensureDepartmentExists(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException(`Department ${id} not found`);
    }
  }

  private async ensureFiliereBelongsToDepartment(
    filiereId: number,
    departmentId: number,
  ) {
    const filiere = await this.prisma.filiere.findUnique({
      where: { id: filiereId },
      select: {
        id: true,
        departmentId: true,
      },
    });

    if (!filiere) {
      throw new NotFoundException(`Filiere ${filiereId} not found`);
    }

    if (filiere.departmentId !== departmentId) {
      throw new BadRequestException(
        'Selected filiere must belong to the chosen department',
      );
    }
  }

  private async ensureRoleExists(id: number) {
    const role = await this.prisma.teacherRole.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException(`Teacher role ${id} not found`);
    }
  }

  private async ensureGradeExists(id: number) {
    const grade = await this.prisma.teacherGrade.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!grade) {
      throw new NotFoundException(`Teacher grade ${id} not found`);
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

  private async ensureClassAssignmentsExist(classIds: number[]) {
    if (classIds.length === 0) {
      return [];
    }

    const uniqueClassIds = Array.from(new Set(classIds));
    const classes = await this.prisma.academicClass.findMany({
      where: {
        id: {
          in: uniqueClassIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (classes.length !== uniqueClassIds.length) {
      throw new BadRequestException('One or more assigned classes are invalid');
    }

    return uniqueClassIds;
  }

  private handleTeacherUniqueErrors(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const targets = Array.isArray(error.meta?.target)
        ? error.meta?.target
        : [];

      if (targets.includes('email')) {
        throw new ConflictException('Teacher email already exists');
      }

      if (targets.includes('cin')) {
        throw new ConflictException('Teacher CIN already exists');
      }
    }
  }

  private handleCatalogUniqueError(error: unknown, label: string) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(`${label} already exists`);
    }
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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const departmentId = Number(row['departmentId'] ?? 0);
        const roleId = Number(row['roleId'] ?? 0);
        const gradeId = Number(row['gradeId'] ?? 0);
        if (!departmentId || !roleId || !gradeId) {
          errors.push(
            `Row ${i + 2}: departmentId, roleId, and gradeId are required`,
          );
          continue;
        }
        await this.create({
          firstName: String(row['firstName'] ?? '').trim(),
          lastName: String(row['lastName'] ?? '').trim(),
          cin: row['cin'] ? String(row['cin']).trim() : undefined,
          email: row['email'] ? String(row['email']).trim() : undefined,
          phoneNumber: row['phoneNumber']
            ? String(row['phoneNumber']).trim()
            : undefined,
          departmentId,
          filiereId: row['filiereId'] ? Number(row['filiereId']) : undefined,
          roleId,
          gradeId,
          dateInscription: row['dateInscription']
            ? String(row['dateInscription']).trim()
            : undefined,
        });
        imported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Row ${i + 2}: ${message}`);
      }
    }

    return { imported, errors };
  }
}
