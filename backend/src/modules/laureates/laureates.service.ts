import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLaureateDto } from './dto/create-laureate.dto';
import { UpdateLaureateDto } from './dto/update-laureate.dto';

@Injectable()
export class LaureatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.laureate.findMany({
      include: {
        student: {
          include: {
            filiere: true,
          },
        },
        proofDocument: true,
      },
      orderBy: { graduationYear: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.laureate.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            filiere: true,
          },
        },
        proofDocument: true,
      },
    });
  }

  create(dto: CreateLaureateDto) {
    return this.prisma.laureate.create({
      data: {
        studentId: dto.studentId,
        graduationYear: dto.graduationYear,
        diplomaStatus: dto.diplomaStatus ?? 'not_retrieved',
        proofDocumentId: dto.proofDocumentId,
      },
    });
  }

  update(id: number, dto: UpdateLaureateDto) {
    return this.prisma.laureate.update({ where: { id }, data: dto });
  }

  remove(id: number) {
    return this.prisma.laureate.delete({ where: { id } });
  }
}
