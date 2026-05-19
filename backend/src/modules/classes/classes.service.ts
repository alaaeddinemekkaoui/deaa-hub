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
import { KeyedTtlCache } from '../../common/utils/keyed-ttl-cache';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassQueryDto } from './dto/class-query.dto';
import { TransferClassDto } from './dto/transfer-class.dto';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole, isDeptScoped } from '../../common/types/role.type';

@Injectable()
export class ClassesService {
  private readonly listCache = new KeyedTtlCache<unknown>({
    prefix: 'classes:list',
    ttlMs: 45 * 1000,
    staleTtlMs: 3 * 60 * 1000,
  });

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ClassQueryDto, departmentIds?: number[]) {
    const {
      page,
      limit,
      search,
      filiereId,
      departmentId,
      year,
      academicYear,
      semestre,
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
    if (academicYear) filters.push({ academicYear });
    if (semestre) filters.push({ semestre });
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

    const cacheKey = JSON.stringify({
      page,
      limit,
      search: search ?? null,
      filiereId: filiereId ?? null,
      departmentId: departmentId ?? null,
      year: year ?? null,
      academicYear: academicYear ?? null,
      semestre: semestre ?? null,
      cycleId: cycleId ?? null,
      optionId: optionId ?? null,
      sortBy,
      sortOrder,
      departmentIds: departmentIds ?? null,
    });

    return this.listCache.getOrLoad(cacheKey, async () => {
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
    });
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
    if (dto.academicYear) await this.ensureAcademicYearExists(dto.academicYear);

    const departmentId = dto.filiereId
      ? await this.getDepartmentIdFromFiliereId(dto.filiereId)
      : null;
    this.ensureCanManageDepartment(departmentId, currentUser);

    const academicYear =
      dto.academicYear ?? (await this.getCurrentAcademicYearLabel());

    await this.ensureClassIdentityAvailable(
      dto.name,
      dto.year,
      academicYear,
      dto.semestre ?? null,
    );

    const classData = {
        name: dto.name,
        year: dto.year,
        academicYear,
        semestre: dto.semestre ?? null,
        classType: dto.classType ?? null,
        cycleId: dto.cycleId ?? null,
        optionId: dto.optionId ?? null,
        filiereId: dto.filiereId ?? null,
      };

    if (dto.createNextSemestre && dto.semestre !== 'S1') {
      throw new BadRequestException(
        'La création automatique du semestre suivant est disponible uniquement depuis S1.',
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const primary = await tx.academicClass.create({ data: classData });

      if (dto.createNextSemestre && dto.semestre === 'S1') {
        await this.ensureClassIdentityAvailable(
          dto.name,
          dto.year,
          academicYear,
          'S2',
        );
        await tx.academicClass.create({
          data: {
            ...classData,
            semestre: 'S2',
          },
        });
      }

      return primary;
    });
    this.listCache.invalidate();
    return created;
  }

  async update(id: number, dto: UpdateClassDto, currentUser?: JwtPayload) {
    const existing = await this.prisma.academicClass.findUnique({
      where: { id },
      select: { id: true, name: true, year: true, academicYear: true, semestre: true, filiereId: true },
    });

    if (!existing) throw new NotFoundException(`Class ${id} not found`);

    if (typeof dto.filiereId === 'number')
      await this.ensureFiliereExists(dto.filiereId);
    if (typeof dto.cycleId === 'number')
      await this.ensureCycleExists(dto.cycleId);
    if (typeof dto.optionId === 'number')
      await this.ensureOptionExists(dto.optionId);
    if (dto.academicYear) await this.ensureAcademicYearExists(dto.academicYear);

    const nextFiliereId =
      dto.filiereId !== undefined ? dto.filiereId : existing.filiereId;
    const departmentId = nextFiliereId
      ? await this.getDepartmentIdFromFiliereId(nextFiliereId)
      : null;
    this.ensureCanManageDepartment(departmentId, currentUser);

    const nextName = dto.name ?? existing.name;
    const nextYear = dto.year ?? existing.year;
    const nextAcademicYear =
      dto.academicYear !== undefined
        ? (dto.academicYear ?? null)
        : existing.academicYear;
    const nextSemestre =
      dto.semestre !== undefined ? (dto.semestre ?? null) : existing.semestre;
    await this.ensureClassIdentityAvailable(nextName, nextYear, nextAcademicYear, nextSemestre, id);

    const updated = await this.prisma.academicClass.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.academicYear !== undefined
          ? { academicYear: dto.academicYear ?? null }
          : {}),
        ...(dto.semestre !== undefined
          ? { semestre: dto.semestre ?? null }
          : {}),
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
    this.listCache.invalidate();
    return updated;
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

    const deleted = await this.prisma.academicClass.delete({ where: { id } });
    this.listCache.invalidate();
    return deleted;
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
    const transferMode =
      dto.transferMode ?? (dto.createTargetClass ? 'duplicate' : 'existing');
    const targetClassId = dto.destinationClassId ?? dto.targetClassId;
    const destinationAcademicYear =
      dto.destinationAcademicYear ?? dto.academicYear;
    const destinationSemestre = dto.destinationSemestre ?? dto.targetSemestre;

    if (transferMode === 'existing' && !targetClassId) {
      throw new BadRequestException('Target class is required');
    }

    if (targetClassId && id === targetClassId) {
      throw new BadRequestException(
        'Source and target class cannot be the same',
      );
    }

    const source = await this.prisma.academicClass.findUnique({
      where: { id },
      include: {
        modules: {
          include: {
            module: { include: { elements: true } },
          },
        },
        teachers: true,
      },
    });

    if (!source) throw new NotFoundException(`Source class ${id} not found`);
    if (dto.sourceAcademicYear && source.academicYear !== dto.sourceAcademicYear) {
      throw new BadRequestException(
        "La classe source ne correspond pas à l'année académique sélectionnée.",
      );
    }
    if (destinationAcademicYear) {
      await this.ensureAcademicYearExists(destinationAcademicYear);
    }

    let target = targetClassId
      ? await this.prisma.academicClass.findUnique({
          where: { id: targetClassId },
          select: { id: true, name: true, year: true, academicYear: true },
        })
      : null;

    if (transferMode === 'duplicate') {
      const targetSemestre = destinationSemestre ?? null;
      const targetAcademicYear =
        destinationAcademicYear ?? source.academicYear ?? (await this.getCurrentAcademicYearLabel());

      if (
        source.academicYear === targetAcademicYear &&
        (source.semestre ?? null) === targetSemestre
      ) {
        throw new BadRequestException(
          'La destination doit être différente de la classe, année et semestre source.',
        );
      }

      await this.ensureClassIdentityAvailable(
        source.name,
        source.year,
        targetAcademicYear,
        targetSemestre,
      );

      target = await this.prisma.academicClass.create({
        data: {
          name: source.name,
          year: source.year,
          academicYear: targetAcademicYear,
          semestre: targetSemestre,
          classType: source.classType,
          cycleId: source.cycleId,
          optionId: source.optionId,
          filiereId: source.filiereId,
        },
        select: { id: true, name: true, year: true, academicYear: true },
      });
    }

    if (!target)
      throw new NotFoundException(
        `Target class ${targetClassId} not found`,
      );

    if (
      transferMode === 'existing' &&
      source.id === target.id &&
      source.academicYear === destinationAcademicYear &&
      (source.semestre ?? null) === (destinationSemestre ?? null)
    ) {
      throw new BadRequestException(
        'Impossible de copier vers la même classe, année et semestre.',
      );
    }

    const [sourceDepartmentId, targetDepartmentId] = await Promise.all([
      this.getDepartmentIdFromClassId(source.id),
      this.getDepartmentIdFromClassId(target.id),
    ]);

    this.ensureCanManageDepartment(sourceDepartmentId, currentUser);
    this.ensureCanManageDepartment(targetDepartmentId, currentUser);

    const targetId = target.id;

    const result = await this.prisma.$transaction(async (tx) => {
      // Clone each module + its elements, then assign to the target class.
      const sourceModules = dto.sourceSemestre
        ? source.modules.filter((mc) => mc.module.semestre === dto.sourceSemestre)
        : source.modules;

      if (sourceModules.length === 0) {
        throw new BadRequestException(
          'Aucun module ne correspond au semestre source sélectionné.',
        );
      }

      for (const mc of sourceModules) {
        const srcModule = mc.module;

        const newModule = await tx.module.create({
          data: {
            name: srcModule.name,
            semestre: destinationSemestre ?? srcModule.semestre,
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
              ponderation: el.ponderation,
              coefficient: 1,
              sessionDurationMinutes: el.sessionDurationMinutes,
            },
          });
        }

        await tx.moduleClass.create({
          data: { moduleId: newModule.id, classId: targetId },
        });
      }

      for (const tc of source.teachers) {
        const exists = await tx.teacherClass.findUnique({
          where: {
            teacherId_classId: { teacherId: tc.teacherId, classId: targetId },
          },
        });
        if (!exists) {
          await tx.teacherClass.create({
            data: { teacherId: tc.teacherId, classId: targetId },
          });
        }
      }

      const updatedTarget = await tx.academicClass.findUnique({
        where: { id: targetId },
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
        academicYear: destinationAcademicYear ?? updatedTarget?.academicYear ?? null,
      };
    });

    this.listCache.invalidate();
    return result;

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

  private async ensureAcademicYearExists(label: string) {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { label },
      select: { id: true },
    });
    if (!academicYear) {
      throw new NotFoundException(`Academic year ${label} not found`);
    }
  }

  private async getCurrentAcademicYearLabel(): Promise<string | null> {
    const current = await this.prisma.academicYear.findFirst({
      where: { isCurrent: true },
      select: { label: true },
    });
    if (current) return current.label;

    const latest = await this.prisma.academicYear.findFirst({
      orderBy: { label: 'desc' },
      select: { label: true },
    });
    return latest?.label ?? null;
  }

  private async ensureClassIdentityAvailable(
    name: string,
    year: number,
    academicYear?: string | null,
    semestre?: string | null,
    excludeId?: number,
  ) {
    const existing = await this.prisma.academicClass.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        year,
        academicYear: academicYear ?? null,
        semestre: semestre ?? null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `A class named "${name}" already exists for year ${year}${semestre ? ` / ${semestre}` : ''}`,
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
      (!isDeptScoped(currentUser.role) && currentUser.role !== UserRole.VIEWER)
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

  async importFromModules(currentUser?: JwtPayload) {
    const academicYear =
      (await this.getCurrentAcademicYearLabel()) ??
      `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;
    const classYear = new Date().getFullYear();
    const modules = await this.prisma.module.findMany({
      where: { filiereId: { not: null } },
      include: {
        filiere: { select: { id: true, name: true, code: true, departmentId: true } },
        option: { select: { id: true, name: true, code: true } },
        elements: { select: { id: true } },
        classes: { select: { classId: true } },
      },
      orderBy: [{ filiereId: 'asc' }, { semestre: 'asc' }, { name: 'asc' }],
    });

    let created = 0;
    let linkedModules = 0;
    let linkedElements = 0;
    const errors: string[] = [];

    for (const module of modules) {
      try {
        if (!module.filiere) continue;
        this.ensureCanManageDepartment(module.filiere.departmentId, currentUser);
        const semester = module.semestre ?? 'S1';
        const optionPart = module.option?.code ?? module.option?.name;
        const baseName = [
          module.filiere.code ?? module.filiere.name,
          optionPart,
          semester,
        ].filter(Boolean).join('-');

        const academicClass = await this.prisma.academicClass.upsert({
          where: {
            name_year_semestre_academicYear: {
              name: baseName,
              year: classYear,
              semestre: semester,
              academicYear,
            },
          },
          update: {
            filiereId: module.filiereId,
            optionId: module.optionId,
          },
          create: {
            name: baseName,
            year: classYear,
            academicYear,
            semestre: semester,
            filiereId: module.filiereId,
            optionId: module.optionId,
            classType: 'Auto',
          },
        });

        if (!module.classes.some((item) => item.classId === academicClass.id)) {
          await this.prisma.moduleClass.create({
            data: { moduleId: module.id, classId: academicClass.id },
          });
          linkedModules++;
        }

        const result = await this.prisma.elementModule.updateMany({
          where: { moduleId: module.id, classId: null },
          data: { classId: academicClass.id },
        });
        linkedElements += result.count;
        if (academicClass.createdAt.getTime() === academicClass.updatedAt.getTime()) {
          created++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${module.name}: ${message}`);
      }
    }

    this.listCache.invalidate();
    return { created, linkedModules, linkedElements, errors };
  }
}
