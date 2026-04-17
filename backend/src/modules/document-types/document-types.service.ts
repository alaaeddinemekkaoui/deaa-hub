import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';

@Injectable()
export class DocumentTypesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.documentType.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const dt = await this.prisma.documentType.findUnique({ where: { id } });
    if (!dt) throw new NotFoundException(`Document type #${id} not found`);
    return dt;
  }

  async create(dto: CreateDocumentTypeDto) {
    const existing = await this.prisma.documentType.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Document type "${dto.name}" already exists`);
    return this.prisma.documentType.create({ data: { name: dto.name, description: dto.description } });
  }

  async update(id: number, dto: UpdateDocumentTypeDto) {
    await this.findOne(id);
    if (dto.name) {
      const conflict = await this.prisma.documentType.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Document type "${dto.name}" already exists`);
    }
    return this.prisma.documentType.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.documentType.delete({ where: { id } });
  }
}
