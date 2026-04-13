import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFiliereDto } from './dto/create-filiere.dto';
import { UpdateFiliereDto } from './dto/update-filiere.dto';
import { FiliereQueryDto } from './dto/filiere-query.dto';

@Injectable()
export class FilieresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: FiliereQueryDto) {
    const { page, limit, search, departmentId, sortBy, sortOrder } = query;
    const where = {
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                code: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(departmentId ? { departmentId } : {}),
    };

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

    return this.prisma.filiere.create({ data: dto });
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

    return this.prisma.filiere.update({ where: { id }, data: dto });
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

    return this.prisma.filiere.delete({ where: { id } });
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
