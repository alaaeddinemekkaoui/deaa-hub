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
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassQueryDto } from './dto/class-query.dto';
import { TransferClassDto } from './dto/transfer-class.dto';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../../common/types/role.type';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ClassQueryDto, departmentIds?: number[]) {
    const {
      page,
      limit,
      search,
      filiereId,
      departmentId,
      year,
      cycleId,
      optionId,
      sortBy,
      sortOrder,
    } = query;

    const filters: Prisma.AcademicClassWhereInput[] = [];

    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { classType: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (typeof year === 'number') filters.push({ year });
    if (filiereId) filters.push({ filiereId });
    if (departmentId) filters.push({ filiere: { is: { departmentId } } });
    if (cycleId) filters.push({ cycleId });
    if (optionId) filters.push({ optionId });
    // JWT-scoped department filter
    if (departmentIds !== undefined) {
      filters.push({
        filiere: { is: { departmentId: { in: departmentIds } } },
      });
    }

    const where: Prisma.AcademicClassWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const [data, total] = await Promise.all([
      this.prisma.academicClass.findMany({
        where,
        include: {
          filiere: {
            include: { department: { select: { id: true, name: true } } },
          },
          academicOption: { select: { id: true, name: true, code: true } },
          cycle: { select: { id: true, name: true, code: true } },
          _count: { select: { students: true, teachers: true, cours: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy:
          sortBy === 'year'
            ? [{ year: sortOrder }, { name: 'asc' }]
            : [{ [sortBy]: sortOrder }, { year: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.academicClass.count({ where }),
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
    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id },
      include: {
        filiere: { include: { department: true } },
        academicOption: true,
        cycle: true,
        students: {
          select: {
            id: true,
            fullName: true,
            codeMassar: true,
            cin: true,
            anneeAcademique: true,
            firstYearEntry: true,
          },
          orderBy: { fullName: 'asc' },
        },
        teachers: {
          include: {
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!academicClass) throw new NotFoundException(`Class ${id} not found`);
    return academicClass;
  }

  async findCours(id: number) {
    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!academicClass) throw new NotFoundException(`Class ${id} not found`);

    return this.prisma.coursClass.findMany({
      where: { classId: id },
      include: {
        cours: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { cours: { name: 'asc' } },
    });
  }

  async create(dto: CreateClassDto, currentUser?: JwtPayload) {
    if (dto.filiereId) await this.ensureFiliereExists(dto.filiereId);
    if (dto.cycleId) await this.ensureCycleExists(dto.cycleId);
    if (dto.optionId) await this.ensureOptionExists(dto.optionId);

    const departmentId = dto.filiereId
      ? await this.getDepartmentIdFromFiliereId(dto.filiereId)
      : null;
    this.ensureCanManageDepartment(departmentId, currentUser);

    await this.ensureClassIdentityAvailable(dto.name, dto.year);

    return this.prisma.academicClass.create({
      data: {
        name: dto.name,
        year: dto.year,
        classType: dto.classType ?? null,
        cycleId: dto.cycleId ?? null,
        optionId: dto.optionId ?? null,
        filiereId: dto.filiereId ?? null,
      },
    });
  }

  async update(id: number, dto: UpdateClassDto, currentUser?: JwtPayload) {
    const existing = await this.prisma.academicClass.findUnique({
      where: { id },
      select: { id: true, name: true, year: true, filiereId: true },
    });

    if (!existing) throw new NotFoundException(`Class ${id} not found`);

    if (typeof dto.filiereId === 'number')
      await this.ensureFiliereExists(dto.filiereId);
    if (typeof dto.cycleId === 'number')
      await this.ensureCycleExists(dto.cycleId);
    if (typeof dto.optionId === 'number')
      await this.ensureOptionExists(dto.optionId);

    const nextFiliereId =
      dto.filiereId !== undefined ? dto.filiereId : existing.filiereId;
    const departmentId = nextFiliereId
      ? await this.getDepartmentIdFromFiliereId(nextFiliereId)
      : null;
    this.ensureCanManageDepartment(departmentId, currentUser);

    const nextName = dto.name ?? existing.name;
    const nextYear = dto.year ?? existing.year;
    await this.ensureClassIdentityAvailable(nextName, nextYear, id);

    return this.prisma.academicClass.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.classType !== undefined
          ? { classType: dto.classType ?? null }
          : {}),
        ...(dto.cycleId !== undefined ? { cycleId: dto.cycleId ?? null } : {}),
        ...(dto.optionId !== undefined
          ? { optionId: dto.optionId ?? null }
          : {}),
        ...(dto.filiereId !== undefined
          ? { filiereId: dto.filiereId ?? null }
          : {}),
      },
    });
  }

  async remove(id: number, currentUser?: JwtPayload) {
    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id },
      select: {
        id: true,
        filiere: { select: { departmentId: true } },
        _count: { select: { students: true, teachers: true } },
      },
    });

    if (!academicClass) throw new NotFoundException(`Class ${id} not found`);

    this.ensureCanManageDepartment(
      academicClass.filiere?.departmentId,
      currentUser,
    );

    if (
      academicClass._count.students > 0 ||
      academicClass._count.teachers > 0
    ) {
      throw new BadRequestException(
        'Class cannot be deleted while students or teachers are still attached',
      );
    }

    return this.prisma.academicClass.delete({ where: { id } });
  }

  /**
   * Transfer modules, elements, and teachers FROM source class TO an existing target class.
   *
   * For each module assigned to the source class:
   *   - Clones the Module record (same name/semestre/filiere/option)
   *   - Clones all ElementModule records of that module
   *   - Assigns the cloned module to the target class (skips if already assigned)
   * Also copies TeacherClass assignments to the target class (skips duplicates).
   *
   * The source class is left untouched. Each class remains fully independent.
   */
  async transfer(id: number, dto: TransferClassDto, currentUser?: JwtPayload) {
    if (id === dto.targetClassId) {
      throw new BadRequestException(
        'Source and target class cannot be the same',
      );
    }

    const [source, target] = await Promise.all([
      this.prisma.academicClass.findUnique({
        where: { id },
        include: {
          modules: {
            include: {
              module: { include: { elements: true } },
            },
          },
          teachers: true,
        },
      }),
      this.prisma.academicClass.findUnique({
        where: { id: dto.targetClassId },
        select: { id: true, name: true, year: true },
      }),
    ]);

    if (!source) throw new NotFoundException(`Source class ${id} not found`);
    if (!target)
      throw new NotFoundException(
        `Target class ${dto.targetClassId} not found`,
      );

    const [sourceDepartmentId, targetDepartmentId] = await Promise.all([
      this.getDepartmentIdFromClassId(source.id),
      this.getDepartmentIdFromClassId(target.id),
    ]);
    this.ensureCanManageDepartment(sourceDepartmentId, currentUser);
    this.ensureCanManageDepartment(targetDepartmentId, currentUser);

    return this.prisma.$transaction(async (tx) => {
      // Clone each module + its elements, then assign to the target class
      for (const mc of source.modules) {
        const srcModule = mc.module;

        const newModule = await tx.module.create({
          data: {
            name: srcModule.name,
            semestre: srcModule.semestre,
            filiereId: srcModule.filiereId,
            optionId: srcModule.optionId,
          },
        });

        for (const el of srcModule.elements) {
          await tx.elementModule.create({
            data: {
              name: el.name,
              moduleId: newModule.id,
              volumeHoraire: el.volumeHoraire,
              type: el.type,
            },
          });
        }

        // Assign cloned module to target class
        await tx.moduleClass.create({
          data: { moduleId: newModule.id, classId: target.id },
        });
      }

      // Copy teacher assignments (skip duplicates)
      for (const tc of source.teachers) {
        const exists = await tx.teacherClass.findUnique({
          where: {
            teacherId_classId: { teacherId: tc.teacherId, classId: target.id },
          },
        });
        if (!exists) {
          await tx.teacherClass.create({
            data: { teacherId: tc.teacherId, classId: target.id },
          });
        }
      }

      // Return the updated target class plus metadata
      const updatedTarget = await tx.academicClass.findUnique({
        where: { id: target.id },
        include: {
          filiere: {
            include: { department: { select: { id: true, name: true } } },
          },
          academicOption: { select: { id: true, name: true } },
          cycle: { select: { id: true, name: true } },
          _count: { select: { students: true, teachers: true, cours: true } },
        },
      });
      return {
        ...updatedTarget,
        academicYear: dto.academicYear ?? null,
      };
    });
  }

  private async ensureFiliereExists(id: number) {
    const f = await this.prisma.filiere.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!f) throw new NotFoundException(`Filiere ${id} not found`);
  }

  private async ensureCycleExists(id: number) {
    const c = await this.prisma.cycle.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!c) throw new NotFoundException(`Cycle ${id} not found`);
  }

  private async ensureOptionExists(id: number) {
    const o = await this.prisma.option.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!o) throw new NotFoundException(`Option ${id} not found`);
  }

  private async ensureClassIdentityAvailable(
    name: string,
    year: number,
    excludeId?: number,
  ) {
    const existing = await this.prisma.academicClass.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        year,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `A class named "${name}" already exists for year ${year}`,
      );
    }
  }

  private async getDepartmentIdFromFiliereId(
    filiereId: number,
  ): Promise<number | null> {
    const filiere = await this.prisma.filiere.findUnique({
      where: { id: filiereId },
      select: { departmentId: true },
    });

    if (!filiere) {
      throw new NotFoundException(`Filiere ${filiereId} not found`);
    }

    return filiere.departmentId;
  }

  private async getDepartmentIdFromClassId(
    classId: number,
  ): Promise<number | null> {
    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id: classId },
      select: { filiere: { select: { departmentId: true } } },
    });

    if (!academicClass) {
      throw new NotFoundException(`Class ${classId} not found`);
    }

    return academicClass.filiere?.departmentId ?? null;
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
        'You can only manage classes in your own department',
      );
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
        const name = String(row['name'] ?? row['Nom'] ?? '').trim();
        const year = Number(row['year'] ?? row['Année'] ?? 0);
        if (!name || !year) {
          errors.push(`Row ${i + 2}: name and year are required`);
          continue;
        }
        await this.create({
          name,
          year,
          filiereId: row['filiereId'] ? Number(row['filiereId']) : undefined,
          classType: row['classType']
            ? String(row['classType']).trim()
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
