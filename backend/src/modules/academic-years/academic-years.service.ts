import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TtlCache } from '../../common/utils/ttl-cache';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';

@Injectable()
export class AcademicYearsService {
  private readonly listCache = new TtlCache<
    Awaited<ReturnType<PrismaService['academicYear']['findMany']>>
  >({
    key: 'academic-years:list',
    ttlMs: 5 * 60 * 1000,
    staleTtlMs: 30 * 60 * 1000,
  });

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.listCache.getOrLoad(async () =>
      this.prisma.academicYear.findMany({
        orderBy: [{ isCurrent: 'desc' }, { label: 'desc' }],
      }),
    );
  }

  async findOne(id: number) {
    const item = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`AcademicYear ${id} not found`);
    return item;
  }

  async create(dto: CreateAcademicYearDto) {
    await this.ensureLabelAvailable(dto.label);
    const years = this.resolveYearRange(dto.label, dto.startYear, dto.endYear);

    // If marking as current, unset other current years first
    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const created = await this.prisma.academicYear.create({
      data: {
        label: dto.label.trim(),
        startYear: years.startYear,
        endYear: years.endYear,
        isCurrent: dto.isCurrent ?? false,
      },
    });
    this.listCache.invalidate();
    return created;
  }

  async update(id: number, dto: UpdateAcademicYearDto) {
    const existing = await this.findOne(id);
    if (dto.label) await this.ensureLabelAvailable(dto.label, id);

    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { isCurrent: true, id: { not: id } },
        data: { isCurrent: false },
      });
    }

    const updated = await this.prisma.academicYear.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.label !== undefined ||
        dto.startYear !== undefined ||
        dto.endYear !== undefined
          ? this.resolveYearRange(
              dto.label ?? existing.label,
              dto.startYear ?? existing.startYear ?? undefined,
              dto.endYear ?? existing.endYear ?? undefined,
            )
          : {}),
        ...(dto.isCurrent !== undefined ? { isCurrent: dto.isCurrent } : {}),
      },
    });
    this.listCache.invalidate();
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    const deleted = await this.prisma.academicYear.delete({ where: { id } });
    this.listCache.invalidate();
    return deleted;
  }

  private async ensureLabelAvailable(label: string, excludeId?: number) {
    const existing = await this.prisma.academicYear.findFirst({
      where: {
        label: { equals: label.trim(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`Année académique "${label}" already exists`);
    }
  }

  private resolveYearRange(
    label?: string,
    startYear?: number,
    endYear?: number,
  ) {
    const match = (label ?? '').trim().match(/^(\d{4})\/(\d{4})$/);
    const resolvedStart = startYear ?? (match ? Number(match[1]) : undefined);
    const resolvedEnd = endYear ?? (match ? Number(match[2]) : undefined);
    return {
      startYear: resolvedStart ?? null,
      endYear: resolvedEnd ?? null,
    };
  }
}
