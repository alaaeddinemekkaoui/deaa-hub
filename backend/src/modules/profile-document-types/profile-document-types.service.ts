import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TtlCache } from '../../common/utils/ttl-cache.util';

@Injectable()
export class ProfileDocumentTypesService {
  private readonly cache = new TtlCache<any[]>();

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const cached = this.cache.get('all');
    if (cached) return cached;
    const result = await this.prisma.profileDocumentType.findMany({
      orderBy: { name: 'asc' },
    });
    this.cache.set('all', result, 5 * 60_000);
    return result;
  }

  async create(name: string, description?: string) {
    const result = await this.prisma.profileDocumentType.create({
      data: {
        name: name.trim(),
        description: description?.trim() || undefined,
      },
    });
    this.cache.del('all');
    return result;
  }

  async update(id: number, name?: string, description?: string) {
    const existing = await this.prisma.profileDocumentType.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Type not found');
    const result = await this.prisma.profileDocumentType.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined
          ? { description: description?.trim() || null }
          : {}),
      },
    });
    this.cache.del('all');
    return result;
  }

  async remove(id: number) {
    const existing = await this.prisma.profileDocumentType.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Type not found');
    const result = await this.prisma.profileDocumentType.delete({
      where: { id },
    });
    this.cache.del('all');
    return result;
  }
}
