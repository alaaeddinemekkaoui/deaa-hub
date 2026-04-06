import { Injectable, NotFoundException } from '@nestjs/common';
import { ElementType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AcademicModulesService } from '../academic-modules/academic-modules.service';
import { CreateElementDto } from './dto/create-element.dto';
import { UpdateElementDto } from './dto/update-element.dto';
import { ElementQueryDto } from './dto/element-query.dto';

@Injectable()
export class ElementModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modulesService: AcademicModulesService,
  ) {}

  async findAll(query: ElementQueryDto) {
    const { page, limit, search, moduleId, classId, type, sortBy, sortOrder } = query;
    const filters: Prisma.ElementModuleWhereInput[] = [];

    if (search) filters.push({ name: { contains: search, mode: 'insensitive' } });
    if (moduleId) filters.push({ moduleId });
    if (classId) filters.push({ classId });
    if (type) filters.push({ type: type as ElementType });

    const where: Prisma.ElementModuleWhereInput = filters.length ? { AND: filters } : {};

    const [data, total] = await Promise.all([
      this.prisma.elementModule.findMany({
        where,
        include: {
          module: {
            include: {
              filiere: { select: { id: true, name: true } },
              option: { select: { id: true, name: true } },
              classes: { include: { class: { select: { id: true, name: true, year: true } } } },
            },
          },
          class: { select: { id: true, name: true, year: true } },
          _count: { select: { sessions: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.elementModule.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async findOne(id: number) {
    const el = await this.prisma.elementModule.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            filiere: true,
            option: true,
            classes: { include: { class: { select: { id: true, name: true, year: true } } } },
          },
        },
        class: { select: { id: true, name: true, year: true } },
        sessions: {
          include: {
            class: true,
            teacher: { select: { id: true, firstName: true, lastName: true } },
            room: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!el) throw new NotFoundException(`ElementModule ${id} not found`);
    return el;
  }

  async create(dto: CreateElementDto) {
    await this.ensureModuleExists(dto.moduleId);

    const element = await this.prisma.elementModule.create({
      data: {
        name: dto.name,
        moduleId: dto.moduleId,
        volumeHoraire: dto.volumeHoraire ?? null,
        type: dto.type ?? 'CM',
        // classId kept nullable; class context comes from ModuleClass
        classId: null,
      },
      select: { id: true, name: true, cours: { select: { id: true } } },
    });

    // Get all classes this module is assigned to
    const moduleClasses = await this.prisma.moduleClass.findMany({
      where: { moduleId: dto.moduleId },
      select: { classId: true },
    });

    // Auto-create Cours + CoursClass for each assigned class
    for (const { classId } of moduleClasses) {
      await this.modulesService.ensureCoursAndCoursClass(element, classId);
    }

    return this.prisma.elementModule.findUnique({
      where: { id: element.id },
      include: {
        module: { include: { classes: { include: { class: { select: { id: true, name: true, year: true } } } } } },
        _count: { select: { sessions: true } },
      },
    });
  }

  async update(id: number, dto: UpdateElementDto) {
    await this.ensureExists(id);
    if (dto.moduleId) await this.ensureModuleExists(dto.moduleId);
    return this.prisma.elementModule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.moduleId !== undefined ? { moduleId: dto.moduleId } : {}),
        ...(dto.volumeHoraire !== undefined ? { volumeHoraire: dto.volumeHoraire ?? null } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
      },
    });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    return this.prisma.elementModule.delete({ where: { id } });
  }

  private async ensureExists(id: number) {
    const e = await this.prisma.elementModule.findUnique({ where: { id }, select: { id: true } });
    if (!e) throw new NotFoundException(`ElementModule ${id} not found`);
  }

  private async ensureModuleExists(id: number) {
    const m = await this.prisma.module.findUnique({ where: { id }, select: { id: true } });
    if (!m) throw new NotFoundException(`Module ${id} not found`);
  }
}
