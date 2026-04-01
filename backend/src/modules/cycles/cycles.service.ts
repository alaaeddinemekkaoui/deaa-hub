import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';

@Injectable()
export class CyclesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.cycle.findMany({
      include: { _count: { select: { classes: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const cycle = await this.prisma.cycle.findUnique({
      where: { id },
      include: { _count: { select: { classes: true } } },
    });
    if (!cycle) throw new NotFoundException(`Cycle ${id} not found`);
    return cycle;
  }

  async create(dto: CreateCycleDto) {
    await this.ensureNameAvailable(dto.name);
    return this.prisma.cycle.create({ data: { name: dto.name, code: dto.code ?? null } });
  }

  async update(id: number, dto: UpdateCycleDto) {
    const existing = await this.prisma.cycle.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException(`Cycle ${id} not found`);
    if (dto.name) await this.ensureNameAvailable(dto.name, id);
    return this.prisma.cycle.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code ?? null } : {}),
      },
    });
  }

  async remove(id: number) {
    const cycle = await this.prisma.cycle.findUnique({ where: { id }, select: { id: true } });
    if (!cycle) throw new NotFoundException(`Cycle ${id} not found`);
    return this.prisma.cycle.delete({ where: { id } });
  }

  private async ensureNameAvailable(name: string, excludeId?: number) {
    const ex = await this.prisma.cycle.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (ex) throw new ConflictException(`Cycle "${name}" already exists`);
  }
}
