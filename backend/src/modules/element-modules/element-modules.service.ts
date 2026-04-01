import { Injectable, NotFoundException } from '@nestjs/common';
import { ElementType, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateElementDto } from './dto/create-element.dto';
import { UpdateElementDto } from './dto/update-element.dto';
import { ElementQueryDto } from './dto/element-query.dto';

@Injectable()
export class ElementModulesService {
  constructor(private readonly prisma: PrismaService) {}

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
          module: { include: { filiere: { select: { id: true, name: true } }, option: { select: { id: true, name: true } } } },
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
        module: { include: { filiere: true, option: true } },
        class: { select: { id: true, name: true, year: true } },
        sessions: { include: { class: true, teacher: { select: { id: true, firstName: true, lastName: true } }, room: { select: { id: true, name: true } } } },
      },
    });
    if (!el) throw new NotFoundException(`ElementModule ${id} not found`);
    return el;
  }

  async create(dto: CreateElementDto) {
    await this.ensureModuleExists(dto.moduleId);
    if (dto.classId) await this.ensureClassExists(dto.classId);

    const element = await this.prisma.elementModule.create({
      data: { name: dto.name, moduleId: dto.moduleId, volumeHoraire: dto.volumeHoraire ?? null, type: dto.type ?? 'CM', classId: dto.classId ?? null },
    });

    // Auto-create a matching Cours if one doesn't already exist for this element
    const existingCours = await this.prisma.cours.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' }, elementModuleId: null },
      select: { id: true },
    });

    if (existingCours) {
      // Link the existing cours to this element
      await this.prisma.cours.update({
        where: { id: existingCours.id },
        data: { elementModuleId: element.id },
      });
    } else {
      // Create a new cours linked to this element
      const cours = await this.prisma.cours.create({
        data: { name: dto.name, elementModuleId: element.id },
      });
      // If the element is linked to a class, assign the cours to that class too
      if (dto.classId) {
        await this.prisma.coursClass.create({
          data: { coursId: cours.id, classId: dto.classId },
        });
      }
    }

    return element;
  }

  async update(id: number, dto: UpdateElementDto) {
    await this.ensureExists(id);
    if (dto.moduleId) await this.ensureModuleExists(dto.moduleId);
    if (dto.classId) await this.ensureClassExists(dto.classId);
    return this.prisma.elementModule.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.moduleId !== undefined ? { moduleId: dto.moduleId } : {}),
        ...(dto.volumeHoraire !== undefined ? { volumeHoraire: dto.volumeHoraire ?? null } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.classId !== undefined ? { classId: dto.classId ?? null } : {}),
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

  private async ensureClassExists(id: number) {
    const c = await this.prisma.academicClass.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException(`Class ${id} not found`);
  }
}
