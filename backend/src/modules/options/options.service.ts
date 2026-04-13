import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { OptionQueryDto } from './dto/option-query.dto';

@Injectable()
export class OptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: OptionQueryDto) {
    const { page, limit, search, filiereId, departmentId, sortBy, sortOrder } =
      query;
    const filters: Prisma.OptionWhereInput[] = [];

    if (search)
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      });
    if (filiereId) filters.push({ filiereId });
    if (departmentId) filters.push({ filiere: { is: { departmentId } } });

    const where: Prisma.OptionWhereInput = filters.length
      ? { AND: filters }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.option.findMany({
        where,
        include: {
          filiere: {
            include: { department: { select: { id: true, name: true } } },
          },
          _count: { select: { classes: true, modules: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.option.count({ where }),
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
    const opt = await this.prisma.option.findUnique({
      where: { id },
      include: {
        filiere: { include: { department: true } },
        modules: { include: { _count: { select: { elements: true } } } },
        _count: { select: { classes: true, modules: true } },
      },
    });
    if (!opt) throw new NotFoundException(`Option ${id} not found`);
    return opt;
  }

  async create(dto: CreateOptionDto) {
    await this.ensureFiliereExists(dto.filiereId);
    await this.ensureNameAvailable(dto.name, dto.filiereId);
    return this.prisma.option.create({
      data: {
        name: dto.name,
        code: dto.code ?? null,
        filiereId: dto.filiereId,
      },
    });
  }

  async update(id: number, dto: UpdateOptionDto) {
    const existing = await this.prisma.option.findUnique({
      where: { id },
      select: { id: true, name: true, filiereId: true },
    });
    if (!existing) throw new NotFoundException(`Option ${id} not found`);
    const nextFiliereId = dto.filiereId ?? existing.filiereId;
    if (dto.filiereId) await this.ensureFiliereExists(dto.filiereId);
    if (dto.name) await this.ensureNameAvailable(dto.name, nextFiliereId, id);
    return this.prisma.option.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code ?? null } : {}),
        ...(dto.filiereId !== undefined ? { filiereId: dto.filiereId } : {}),
      },
    });
  }

  async remove(id: number) {
    const opt = await this.prisma.option.findUnique({
      where: { id },
      select: {
        id: true,
        _count: { select: { classes: true, modules: true } },
      },
    });
    if (!opt) throw new NotFoundException(`Option ${id} not found`);
    return this.prisma.option.delete({ where: { id } });
  }

  private async ensureFiliereExists(id: number) {
    const f = await this.prisma.filiere.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!f) throw new NotFoundException(`Filiere ${id} not found`);
  }

  private async ensureNameAvailable(
    name: string,
    filiereId: number,
    excludeId?: number,
  ) {
    const ex = await this.prisma.option.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        filiereId,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (ex)
      throw new ConflictException(
        `Option "${name}" already exists in this filière`,
      );
  }
}
