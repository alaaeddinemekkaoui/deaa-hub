import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KeyedTtlCache } from '../../common/utils/keyed-ttl-cache';
import { CreateOptionDto } from './dto/create-option.dto';
import { UpdateOptionDto } from './dto/update-option.dto';
import { OptionQueryDto } from './dto/option-query.dto';

@Injectable()
export class OptionsService {
  private readonly listCache = new KeyedTtlCache<unknown>({
    prefix: 'options:list',
    ttlMs: 60 * 1000,
    staleTtlMs: 5 * 60 * 1000,
  });

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
    if (departmentId) {
      filters.push({
        OR: [
          { departmentId },
          { filiere: { is: { departmentId } } },
        ],
      });
    }

    const where: Prisma.OptionWhereInput = filters.length
      ? { AND: filters }
      : {};

    const cacheKey = JSON.stringify({
      page,
      limit,
      search: search ?? null,
      filiereId: filiereId ?? null,
      departmentId: departmentId ?? null,
      sortBy,
      sortOrder,
    });

    return this.listCache.getOrLoad(cacheKey, async () => {
      const [data, total] = await Promise.all([
        this.prisma.option.findMany({
          where,
          include: {
            filiere: {
              include: { department: { select: { id: true, name: true } } },
            },
            department: { select: { id: true, name: true } },
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
    });
  }

  async findOne(id: number) {
    const opt = await this.prisma.option.findUnique({
      where: { id },
      include: {
        filiere: { include: { department: true } },
        department: true,
        modules: { include: { _count: { select: { elements: true } } } },
        _count: { select: { classes: true, modules: true } },
      },
    });
    if (!opt) throw new NotFoundException(`Option ${id} not found`);
    return opt;
  }

  async create(dto: CreateOptionDto) {
    await this.ensureFiliereExists(dto.filiereId);
    if (dto.departmentId) {
      await this.ensureFiliereDepartmentLinkExists(
        dto.filiereId,
        dto.departmentId,
      );
    }
    await this.ensureNameAvailable(dto.name, dto.filiereId, dto.departmentId);
    const created = await this.prisma.option.create({
      data: {
        name: dto.name,
        code: dto.code ?? null,
        filiereId: dto.filiereId,
        departmentId: dto.departmentId ?? null,
      },
    });
    this.listCache.invalidate();
    return created;
  }

  async update(id: number, dto: UpdateOptionDto) {
    const existing = await this.prisma.option.findUnique({
      where: { id },
      select: { id: true, name: true, filiereId: true, departmentId: true },
    });
    if (!existing) throw new NotFoundException(`Option ${id} not found`);
    const nextFiliereId = dto.filiereId ?? existing.filiereId;
    const nextDepartmentId =
      dto.departmentId !== undefined ? dto.departmentId : existing.departmentId;
    if (dto.filiereId) await this.ensureFiliereExists(dto.filiereId);
    if (nextDepartmentId) {
      await this.ensureFiliereDepartmentLinkExists(
        nextFiliereId,
        nextDepartmentId,
      );
    }
    if (dto.name || dto.filiereId || dto.departmentId !== undefined) {
      await this.ensureNameAvailable(
        dto.name ?? existing.name,
        nextFiliereId,
        nextDepartmentId,
        id,
      );
    }
    const updated = await this.prisma.option.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.code !== undefined ? { code: dto.code ?? null } : {}),
        ...(dto.filiereId !== undefined ? { filiereId: dto.filiereId } : {}),
        ...(dto.departmentId !== undefined
          ? { departmentId: dto.departmentId ?? null }
          : {}),
      },
    });
    this.listCache.invalidate();
    return updated;
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
    const deleted = await this.prisma.option.delete({ where: { id } });
    this.listCache.invalidate();
    return deleted;
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
    departmentId?: number | null,
    excludeId?: number,
  ) {
    const ex = await this.prisma.option.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        filiereId,
        departmentId: departmentId ?? null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (ex)
      throw new ConflictException(
        `Option "${name}" already exists in this filière`,
      );
  }

  private async ensureFiliereDepartmentLinkExists(
    filiereId: number,
    departmentId: number,
  ) {
    const link = await this.prisma.filiereDepartment.findFirst({
      where: {
        filiereId,
        departmentId,
      },
      select: { id: true },
    });
    if (link) return;

    const legacy = await this.prisma.filiere.findFirst({
      where: { id: filiereId, departmentId },
      select: { id: true },
    });
    if (legacy) return;

    throw new BadRequestException(
      'Selected department is not linked to the selected filière',
    );
  }
}
