import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DepartmentQueryDto) {
    const { page, limit, search, sortBy, sortOrder } = query;
    const where = search
      ? {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : undefined;

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
}
