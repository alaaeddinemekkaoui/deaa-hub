import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassQueryDto } from './dto/class-query.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ClassQueryDto) {
    const {
      page,
      limit,
      search,
      filiereId,
      departmentId,
      year,
      sortBy,
      sortOrder,
    } = query;

    const filters: Prisma.AcademicClassWhereInput[] = [];

    if (search) {
      filters.push({
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            classType: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (typeof year === 'number') {
      filters.push({ year });
    }

    if (filiereId) {
      filters.push({ filiereId });
    }

    if (departmentId) {
      filters.push({ filiere: { is: { departmentId } } });
    }

    const where: Prisma.AcademicClassWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const [data, total] = await Promise.all([
      this.prisma.academicClass.findMany({
        where,
        include: {
          filiere: {
            include: {
              department: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              students: true,
              teachers: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy:
          sortBy === 'year'
            ? [{ year: sortOrder }, { name: 'asc' }]
            : [{ [sortBy]: sortOrder }, { year: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.academicClass.count({ where }),
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
    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id },
      include: {
        filiere: {
          include: {
            department: true,
          },
        },
        students: true,
        teachers: {
          include: {
            teacher: true,
          },
        },
      },
    });

    if (!academicClass) {
      throw new NotFoundException(`Class ${id} not found`);
    }

    return academicClass;
  }

  async create(dto: CreateClassDto) {
    if (dto.filiereId) {
      await this.ensureFiliereExists(dto.filiereId);
    }

    await this.ensureClassIdentityAvailable(
      dto.name,
      dto.year,
    );

    return this.prisma.academicClass.create({
      data: {
        name: dto.name,
        year: dto.year,
        classType: dto.classType ?? null,
        filiereId: dto.filiereId ?? null,
      },
    });
  }

  async update(id: number, dto: UpdateClassDto) {
    const existing = await this.prisma.academicClass.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        year: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Class ${id} not found`);
    }

    if (typeof dto.filiereId === 'number') {
      await this.ensureFiliereExists(dto.filiereId);
    }

    const nextName = dto.name ?? existing.name;
    const nextYear = dto.year ?? existing.year;
    await this.ensureClassIdentityAvailable(
      nextName,
      nextYear,
      id,
    );

    return this.prisma.academicClass.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.classType !== undefined
          ? { classType: dto.classType ?? null }
          : {}),
        ...(dto.filiereId !== undefined
          ? { filiereId: dto.filiereId ?? null }
          : {}),
      },
    });
  }

  async remove(id: number) {
    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id },
      select: {
        id: true,
        _count: {
          select: {
            students: true,
            teachers: true,
          },
        },
      },
    });

    if (!academicClass) {
      throw new NotFoundException(`Class ${id} not found`);
    }

    if (
      academicClass._count.students > 0 ||
      academicClass._count.teachers > 0
    ) {
      throw new BadRequestException(
        'Class cannot be deleted while students or teachers are still attached',
      );
    }

    return this.prisma.academicClass.delete({ where: { id } });
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

  private async ensureClassIdentityAvailable(
    name: string,
    year: number,
    excludeId?: number,
  ) {
    const existing = await this.prisma.academicClass.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        year,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `A class named "${name}" already exists for year ${year}`,
      );
    }
  }
}
