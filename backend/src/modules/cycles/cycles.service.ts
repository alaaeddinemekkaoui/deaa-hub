import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TtlCache } from '../../common/utils/ttl-cache';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { UpdateCycleDto } from './dto/update-cycle.dto';

@Injectable()
export class CyclesService {
  private readonly cache = new TtlCache<unknown[]>(5 * 60 * 1000);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const cached = this.cache.get();
    if (cached) return cached;

    const data = await this.prisma.cycle.findMany({
      include: { _count: { select: { classes: true } } },
      orderBy: { name: 'asc' },
    });
    this.cache.set(data);
    return data;
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
    const result = await this.prisma.cycle.create({
      data: { name: dto.name, code: dto.code ?? null },
    });
    this.cache.invalidate();
    return result;
  }

  async update(id: number, dto: UpdateCycleDto) {
    const existing = await this.prisma.cycle.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException(`Cycle ${id} not found`);
    if (dto.name) await this.ensureNameAvailable(dto.name, id);
    const result = await this.prisma.cycle.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code ?? null } : {}),
      },
    });
    this.cache.invalidate();
    return result;
  }

  async remove(id: number) {
    const cycle = await this.prisma.cycle.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!cycle) throw new NotFoundException(`Cycle ${id} not found`);
    const result = await this.prisma.cycle.delete({ where: { id } });
    this.cache.invalidate();
    return result;
  }

  private async ensureNameAvailable(name: string, excludeId?: number) {
    const ex = await this.prisma.cycle.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (ex) throw new ConflictException(`Cycle "${name}" already exists`);
  }
}
