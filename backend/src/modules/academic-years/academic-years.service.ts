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
        orderBy: { label: 'desc' },
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

    // If marking as current, unset other current years first
    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
    }

    const created = await this.prisma.academicYear.create({
      data: { label: dto.label.trim(), isCurrent: dto.isCurrent ?? false },
    });
    this.listCache.invalidate();
    return created;
  }

  async update(id: number, dto: UpdateAcademicYearDto) {
    await this.findOne(id);
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
}
