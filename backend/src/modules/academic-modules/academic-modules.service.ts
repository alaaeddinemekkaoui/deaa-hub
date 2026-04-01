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
    const { page, limit, search, filiereId, optionId, sortBy, sortOrder } = query;
    const filters: Prisma.ModuleWhereInput[] = [];

    if (search) filters.push({ name: { contains: search, mode: 'insensitive' } });
    if (filiereId) filters.push({ filiereId });
    if (optionId) filters.push({ optionId });

    const where: Prisma.ModuleWhereInput = filters.length ? { AND: filters } : {};

    const [data, total] = await Promise.all([
      this.prisma.module.findMany({
        where,
        include: {
          filiere: { select: { id: true, name: true } },
          option: { select: { id: true, name: true } },
          _count: { select: { elements: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.module.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
  }

  async findOne(id: number) {
    const mod = await this.prisma.module.findUnique({
      where: { id },
      include: {
        filiere: { select: { id: true, name: true } },
        option: { select: { id: true, name: true } },
        elements: { orderBy: { name: 'asc' } },
      },
    });
    if (!mod) throw new NotFoundException(`Module ${id} not found`);
    return mod;
  }

  async create(dto: CreateModuleDto) {
    if (dto.filiereId) await this.ensureFiliereExists(dto.filiereId);
    if (dto.optionId) await this.ensureOptionExists(dto.optionId);
    return this.prisma.module.create({
      data: { name: dto.name, semestre: dto.semestre ?? null, filiereId: dto.filiereId ?? null, optionId: dto.optionId ?? null },
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
}
