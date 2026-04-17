import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DepartmentQueryDto, departmentIds?: number[]) {
    const { page, limit, search, sortBy, sortOrder } = query;

    const filters: Prisma.DepartmentWhereInput[] = [];
    if (search)
      filters.push({ name: { contains: search, mode: 'insensitive' } });
    if (departmentIds !== undefined)
      filters.push({ id: { in: departmentIds } });

    const where: Prisma.DepartmentWhereInput =
      filters.length > 1 ? { AND: filters } : (filters[0] ?? {});

    const [data, total] = await Promise.all([
      this.prisma.department.findMany({
        where,
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              filieres: true,
              teachers: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.department.count({ where }),
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
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        filieres: {
          select: {
            id: true,
            name: true,
            code: true,
            _count: {
              select: {
                classes: true,
                students: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            filieres: true,
            teachers: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department ${id} not found`);
    }

    return department;
  }

  async create(dto: CreateDepartmentDto) {
    await this.ensureNameAvailable(dto.name);
    return this.prisma.department.create({ data: dto });
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    await this.ensureDepartmentExists(id);
    if (dto.name) {
      await this.ensureNameAvailable(dto.name, id);
    }

    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            filieres: true,
            teachers: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department ${id} not found`);
    }

    if (department._count.filieres > 0 || department._count.teachers > 0) {
      throw new BadRequestException(
        'Department cannot be deleted while filieres or teachers are still attached',
      );
    }

    return this.prisma.department.delete({ where: { id } });
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

  private async ensureNameAvailable(name: string, excludeId?: number) {
    const existing = await this.prisma.department.findFirst({
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
      throw new ConflictException(`Department "${name}" already exists`);
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
        const name = String(row['name'] ?? row['Nom'] ?? '').trim();
        if (!name) {
          errors.push(`Row ${i + 2}: name is required`);
          continue;
        }
        await this.create({ name });
        imported++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Row ${i + 2}: ${message}`);
      }
    }

    return { imported, errors };
  }
}
