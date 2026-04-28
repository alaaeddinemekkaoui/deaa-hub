import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TtlCache } from '../../common/utils/ttl-cache.util';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';

@Injectable()
export class DocumentTypesService {
  private readonly cache = new TtlCache<any[]>();

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const cached = this.cache.get('all');
    if (cached) return cached;
    const result = await this.prisma.documentType.findMany({
      orderBy: { name: 'asc' },
    });
    this.cache.set('all', result, 5 * 60_000);
    return result;
  }

  async findOne(id: number) {
    const dt = await this.prisma.documentType.findUnique({ where: { id } });
    if (!dt) throw new NotFoundException(`Document type #${id} not found`);
    return dt;
  }

  async create(dto: CreateDocumentTypeDto) {
    const existing = await this.prisma.documentType.findUnique({
      where: { name: dto.name },
    });
    if (existing)
      throw new ConflictException(`Document type "${dto.name}" already exists`);
    const result = await this.prisma.documentType.create({
      data: { name: dto.name, description: dto.description },
    });
    this.cache.del('all');
    return result;
  }

  async update(id: number, dto: UpdateDocumentTypeDto) {
    await this.findOne(id);
    if (dto.name) {
      const conflict = await this.prisma.documentType.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (conflict)
        throw new ConflictException(
          `Document type "${dto.name}" already exists`,
        );
    }
    const result = await this.prisma.documentType.update({
      where: { id },
      data: dto,
    });
    this.cache.del('all');
    return result;
  }

  async remove(id: number) {
    await this.findOne(id);
    const result = await this.prisma.documentType.delete({ where: { id } });
    this.cache.del('all');
    return result;
  }
}
