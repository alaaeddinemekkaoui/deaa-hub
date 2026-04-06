import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { existsSync, mkdirSync, renameSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  private getUploadBaseDir() {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      return join(tmpdir(), 'deaa-hub', 'uploads');
    }

    return join(process.cwd(), 'uploads');
  }

  findAll() {
    return this.prisma.document.findMany({
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            codeMassar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.document.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            codeMassar: true,
          },
        },
      },
    });
  }

  async create(dto: CreateDocumentDto, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true, codeMassar: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const studentDir = join(this.getUploadBaseDir(), student.codeMassar);
    if (!existsSync(studentDir)) {
      mkdirSync(studentDir, { recursive: true });
    }

    const finalPath = join(studentDir, file.originalname);
    renameSync(file.path, finalPath);

    return this.prisma.document.create({
      data: {
        name: file.originalname,
        mimeType: file.mimetype,
        path: finalPath,
        studentId: student.id,
      },
    });
  }

  findByStudent(studentId: number) {
    return this.prisma.document.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  update(id: number, dto: { name?: string; studentId?: number }) {
    return this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.studentId ? { studentId: dto.studentId } : {}),
      },
    });
  }

  remove(id: number) {
    return this.prisma.document.delete({ where: { id } });
  }

  async missingDocuments(studentId: number) {
    const required = ['cin', 'bac', 'photo'];
    const docs = await this.prisma.document.findMany({ where: { studentId } });
    const existing: string[] = docs.map((d) => d.name.toLowerCase());

    return required.filter(
      (item) => !existing.some((name) => name.includes(item)),
    );
  }
}
