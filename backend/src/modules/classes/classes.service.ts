import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
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
      cycleId,
      optionId,
      sortBy,
      sortOrder,
    } = query;

    const filters: Prisma.AcademicClassWhereInput[] = [];

    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { classType: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (typeof year === 'number') filters.push({ year });
    if (filiereId) filters.push({ filiereId });
    if (departmentId) filters.push({ filiere: { is: { departmentId } } });
    if (cycleId) filters.push({ cycleId });
    if (optionId) filters.push({ optionId });

    const where: Prisma.AcademicClassWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const [data, total] = await Promise.all([
      this.prisma.academicClass.findMany({
        where,
        include: {
          filiere: {
            include: {
              department: { select: { id: true, name: true } },
            },
          },
          academicOption: { select: { id: true, name: true, code: true } },
          cycle: { select: { id: true, name: true, code: true } },
          _count: {
            select: { students: true, teachers: true, cours: true },
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
        filiere: { include: { department: true } },
        academicOption: true,
        cycle: true,
        students: true,
        teachers: { include: { teacher: true } },
      },
    });

    if (!academicClass) throw new NotFoundException(`Class ${id} not found`);
    return academicClass;
  }

  async findCours(id: number) {
    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!academicClass) throw new NotFoundException(`Class ${id} not found`);

    return this.prisma.coursClass.findMany({
      where: { classId: id },
      include: {
        cours: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { cours: { name: 'asc' } },
    });
  }

  async create(dto: CreateClassDto) {
    if (dto.filiereId) await this.ensureFiliereExists(dto.filiereId);
    if (dto.cycleId) await this.ensureCycleExists(dto.cycleId);
    if (dto.optionId) await this.ensureOptionExists(dto.optionId);

    await this.ensureClassIdentityAvailable(dto.name, dto.year);

    return this.prisma.academicClass.create({
      data: {
        name: dto.name,
        year: dto.year,
        classType: dto.classType ?? null,
        cycleId: dto.cycleId ?? null,
        optionId: dto.optionId ?? null,
        filiereId: dto.filiereId ?? null,
      },
    });
  }

  async update(id: number, dto: UpdateClassDto) {
    const existing = await this.prisma.academicClass.findUnique({
      where: { id },
      select: { id: true, name: true, year: true },
    });

    if (!existing) throw new NotFoundException(`Class ${id} not found`);

    if (typeof dto.filiereId === 'number') await this.ensureFiliereExists(dto.filiereId);
    if (typeof dto.cycleId === 'number') await this.ensureCycleExists(dto.cycleId);
    if (typeof dto.optionId === 'number') await this.ensureOptionExists(dto.optionId);

    const nextName = dto.name ?? existing.name;
    const nextYear = dto.year ?? existing.year;
    await this.ensureClassIdentityAvailable(nextName, nextYear, id);

    return this.prisma.academicClass.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.classType !== undefined ? { classType: dto.classType ?? null } : {}),
        ...(dto.cycleId !== undefined ? { cycleId: dto.cycleId ?? null } : {}),
        ...(dto.optionId !== undefined ? { optionId: dto.optionId ?? null } : {}),
        ...(dto.filiereId !== undefined ? { filiereId: dto.filiereId ?? null } : {}),
      },
    });
  }

  async remove(id: number) {
    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id },
      select: {
        id: true,
        _count: { select: { students: true, teachers: true } },
      },
    });

    if (!academicClass) throw new NotFoundException(`Class ${id} not found`);

    if (academicClass._count.students > 0 || academicClass._count.teachers > 0) {
      throw new BadRequestException(
        'Class cannot be deleted while students or teachers are still attached',
      );
    }

    return this.prisma.academicClass.delete({ where: { id } });
  }

  private async ensureFiliereExists(id: number) {
    const f = await this.prisma.filiere.findUnique({ where: { id }, select: { id: true } });
    if (!f) throw new NotFoundException(`Filiere ${id} not found`);
  }

  private async ensureCycleExists(id: number) {
    const c = await this.prisma.cycle.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException(`Cycle ${id} not found`);
  }

  private async ensureOptionExists(id: number) {
    const o = await this.prisma.option.findUnique({ where: { id }, select: { id: true } });
    if (!o) throw new NotFoundException(`Option ${id} not found`);
  }

  private async ensureClassIdentityAvailable(
    name: string,
    year: number,
    excludeId?: number,
  ) {
    const existing = await this.prisma.academicClass.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
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

  async importFromBuffer(buffer: Buffer): Promise<{ imported: number; errors: string[] }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const name = String(row['name'] ?? row['Nom'] ?? '').trim();
        const year = Number(row['year'] ?? row['Année'] ?? 0);
        if (!name || !year) {
          errors.push(`Row ${i + 2}: name and year are required`);
          continue;
        }
        await this.create({
          name,
          year,
          filiereId: row['filiereId'] ? Number(row['filiereId']) : undefined,
          classType: row['classType'] ? String(row['classType']).trim() : undefined,
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
