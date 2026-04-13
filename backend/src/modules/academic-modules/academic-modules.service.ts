import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { ModuleQueryDto } from './dto/module-query.dto';

@Injectable()
export class AcademicModulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ModuleQueryDto) {
    const { page, limit, search, filiereId, optionId, classYear, sortBy, sortOrder } = query;
    const filters: Prisma.ModuleWhereInput[] = [];

    if (search) filters.push({ name: { contains: search, mode: 'insensitive' } });
    if (filiereId) filters.push({ filiereId });
    if (optionId) filters.push({ optionId });
    // Filter modules that are assigned to classes of a specific year
    if (classYear) {
      filters.push({ classes: { some: { class: { year: classYear } } } });
    }

    const where: Prisma.ModuleWhereInput = filters.length ? { AND: filters } : {};

    const [data, total] = await Promise.all([
      this.prisma.module.findMany({
        where,
        include: {
          filiere: { select: { id: true, name: true } },
          option: { select: { id: true, name: true } },
          classes: {
            include: {
              class: { select: { id: true, name: true, year: true } },
            },
          },
          _count: { select: { elements: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.module.count({ where }),
    ]);

    return {
      data,
      meta: {
        page, limit, total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: number) {
    const mod = await this.prisma.module.findUnique({
      where: { id },
      include: {
        filiere: { select: { id: true, name: true } },
        option: { select: { id: true, name: true } },
        classes: {
          include: {
            class: { select: { id: true, name: true, year: true, filiereId: true, optionId: true } },
          },
        },
        elements: { orderBy: { name: 'asc' } },
      },
    });
    if (!mod) throw new NotFoundException(`Module ${id} not found`);
    return mod;
  }

  async create(dto: CreateModuleDto) {
    if (dto.filiereId) await this.ensureFiliereExists(dto.filiereId);
    if (dto.optionId) await this.ensureOptionExists(dto.optionId);
    for (const classId of dto.classIds) {
      await this.ensureClassExists(classId);
    }

    return this.prisma.module.create({
      data: {
        name: dto.name,
        semestre: dto.semestre ?? null,
        filiereId: dto.filiereId ?? null,
        optionId: dto.optionId ?? null,
        classes: { create: dto.classIds.map((classId) => ({ classId })) },
      },
      include: {
        classes: { include: { class: { select: { id: true, name: true, year: true } } } },
        _count: { select: { elements: true } },
      },
    });
  }

  async update(id: number, dto: UpdateModuleDto) {
    await this.ensureExists(id);
    if (dto.filiereId) await this.ensureFiliereExists(dto.filiereId);
    if (dto.optionId) await this.ensureOptionExists(dto.optionId);
    return this.prisma.module.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.semestre !== undefined ? { semestre: dto.semestre ?? null } : {}),
        ...(dto.filiereId !== undefined ? { filiereId: dto.filiereId ?? null } : {}),
        ...(dto.optionId !== undefined ? { optionId: dto.optionId ?? null } : {}),
      },
    });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    return this.prisma.module.delete({ where: { id } });
  }

  async assignClass(moduleId: number, classId: number) {
    await this.ensureExists(moduleId);
    await this.ensureClassExists(classId);

    const existing = await this.prisma.moduleClass.findUnique({
      where: { moduleId_classId: { moduleId, classId } },
    });
    if (!existing) {
      await this.prisma.moduleClass.create({ data: { moduleId, classId } });
    }

    const elements = await this.prisma.elementModule.findMany({
      where: { moduleId },
      select: { id: true, name: true, cours: { select: { id: true } } },
    });

    for (const el of elements) {
      await this.ensureCoursAndCoursClass(el, classId);
    }

    return this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        classes: { include: { class: { select: { id: true, name: true, year: true } } } },
      },
    });
  }

  async removeClass(moduleId: number, classId: number) {
    await this.ensureExists(moduleId);
    const existing = await this.prisma.moduleClass.findUnique({
      where: { moduleId_classId: { moduleId, classId } },
    });
    if (!existing)
      throw new NotFoundException(`Class ${classId} is not assigned to module ${moduleId}`);
    await this.prisma.moduleClass.delete({ where: { moduleId_classId: { moduleId, classId } } });
    return { success: true };
  }

  async ensureCoursAndCoursClass(
    el: { id: number; name: string; cours: { id: number } | null },
    classId: number,
  ) {
    let coursId: number;

    if (el.cours) {
      coursId = el.cours.id;
    } else {
      const existing = await this.prisma.cours.findFirst({
        where: { name: { equals: el.name, mode: 'insensitive' } },
        select: { id: true, elementModuleId: true },
      });

      if (existing) {
        if (!existing.elementModuleId) {
          await this.prisma.cours.update({ where: { id: existing.id }, data: { elementModuleId: el.id } });
        }
        coursId = existing.id;
      } else {
        let coursName = el.name;
        const conflict = await this.prisma.cours.findFirst({
          where: { name: { equals: coursName, mode: 'insensitive' }, elementModuleId: { not: null } },
        });
        if (conflict) coursName = `${el.name} (${el.id})`;
        const created = await this.prisma.cours.create({ data: { name: coursName, elementModuleId: el.id } });
        coursId = created.id;
      }
    }

    const existingCC = await this.prisma.coursClass.findFirst({ where: { coursId, classId, teacherId: null } });
    if (!existingCC) {
      await this.prisma.coursClass.create({ data: { coursId, classId, teacherId: null } });
    }
  }

  private async ensureExists(id: number) {
    const m = await this.prisma.module.findUnique({ where: { id }, select: { id: true } });
    if (!m) throw new NotFoundException(`Module ${id} not found`);
  }

  private async ensureFiliereExists(id: number) {
    const f = await this.prisma.filiere.findUnique({ where: { id }, select: { id: true } });
    if (!f) throw new NotFoundException(`Filiere ${id} not found`);
  }

  private async ensureOptionExists(id: number) {
    const o = await this.prisma.option.findUnique({ where: { id }, select: { id: true } });
    if (!o) throw new NotFoundException(`Option ${id} not found`);
  }

  private async ensureClassExists(id: number) {
    const c = await this.prisma.academicClass.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException(`Class ${id} not found`);
  }
}
