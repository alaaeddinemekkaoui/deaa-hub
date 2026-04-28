import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { KeyedTtlCache } from '../../common/utils/keyed-ttl-cache';
import { CreateFiliereDto } from './dto/create-filiere.dto';
import { UpdateFiliereDto } from './dto/update-filiere.dto';
import { FiliereQueryDto } from './dto/filiere-query.dto';

@Injectable()
export class FilieresService {
  private readonly listCache = new KeyedTtlCache<unknown>({
    prefix: 'filieres:list',
    ttlMs: 60 * 1000,
    staleTtlMs: 5 * 60 * 1000,
  });

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FiliereQueryDto, departmentIds?: number[]) {
    const { page, limit, search, departmentId, sortBy, sortOrder } = query;

    // departmentIds (from JWT scope) narrows to specific departments;
    // departmentId (from query param) further narrows within that set.
    const effectiveDeptIds: number[] | undefined =
      departmentIds !== undefined && departmentId
        ? [departmentId].filter((id) => departmentIds.includes(id))
        : departmentIds !== undefined
          ? departmentIds
          : departmentId
            ? [departmentId]
            : undefined;

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { code: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(effectiveDeptIds !== undefined
        ? { departmentId: { in: effectiveDeptIds } }
        : {}),
    };

    const cacheKey = JSON.stringify({
      page,
      limit,
      search: search ?? null,
      departmentId: departmentId ?? null,
      departmentIds: departmentIds ?? null,
      sortBy,
      sortOrder,
    });

    return this.listCache.getOrLoad(cacheKey, async () => {
      const [data, total] = await Promise.all([
        this.prisma.filiere.findMany({
          where,
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                students: true,
                teachers: true,
                classes: true,
              },
            },
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        this.prisma.filiere.count({ where }),
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
    const filiere = await this.prisma.filiere.findUnique({
      where: { id },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        classes: {
          select: {
            id: true,
            name: true,
            year: true,
            classType: true,
            _count: {
              select: {
                students: true,
                teachers: true,
              },
            },
          },
          orderBy: [{ year: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: {
            students: true,
            teachers: true,
            classes: true,
          },
        },
      },
    });

    if (!filiere) {
      throw new NotFoundException(`Filiere ${id} not found`);
    }

    return filiere;
  }

  async create(dto: CreateFiliereDto) {
    await this.ensureDepartmentExists(dto.departmentId);
    await this.ensureNameAvailable(dto.name);
    await this.ensureCodeAvailable(dto.code);

    const created = await this.prisma.filiere.create({ data: dto });
    this.listCache.invalidate();
    return created;
  }

  async update(id: number, dto: UpdateFiliereDto) {
    await this.ensureFiliereExists(id);

    if (dto.departmentId) {
      await this.ensureDepartmentExists(dto.departmentId);
    }
    if (dto.name) {
      await this.ensureNameAvailable(dto.name, id);
    }
    if (dto.code) {
      await this.ensureCodeAvailable(dto.code, id);
    }

    const updated = await this.prisma.filiere.update({
      where: { id },
      data: dto,
    });
    this.listCache.invalidate();
    return updated;
  }

  async remove(id: number) {
    const filiere = await this.prisma.filiere.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            students: true,
            teachers: true,
            classes: true,
          },
        },
      },
    });

    if (!filiere) {
      throw new NotFoundException(`Filiere ${id} not found`);
    }

    if (
      filiere._count.students > 0 ||
      filiere._count.teachers > 0 ||
      filiere._count.classes > 0
    ) {
      throw new BadRequestException(
        'Filiere cannot be deleted while classes, students, or teachers are still attached',
      );
    }

    const deleted = await this.prisma.filiere.delete({ where: { id } });
    this.listCache.invalidate();
    return deleted;
  }

  private async ensureDepartmentExists(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException(`Department ${id} not found`);
    }
  }

  private async ensureFiliereExists(id: number) {
    const filiere = await this.prisma.filiere.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!filiere) {
      throw new NotFoundException(`Filiere ${id} not found`);
    }
  }

  private async ensureNameAvailable(name: string, excludeId?: number) {
    const existing = await this.prisma.filiere.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Filiere "${name}" already exists`);
    }
  }

  private async ensureCodeAvailable(code: string, excludeId?: number) {
    const existing = await this.prisma.filiere.findFirst({
      where: {
        code: {
          equals: code,
          mode: 'insensitive',
        },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(`Filiere code "${code}" already exists`);
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
        const code = String(row['code'] ?? row['Code'] ?? '').trim();
        const name = String(row['name'] ?? row['Nom'] ?? '').trim();
        const departmentId = Number(row['departmentId'] ?? 0);
        if (!code || !name || !departmentId) {
          errors.push(
            `Row ${i + 2}: code, name, and departmentId are required`,
          );
          continue;
        }
        await this.prisma.filiere.create({
          data: {
            code,
            name,
            departmentId,
            filiereType: row['filiereType']
              ? String(row['filiereType']).trim()
              : null,
          },
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
