import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { createReadStream, existsSync } from 'fs';
import type { Response } from 'express';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../../common/types/role.type';
import { ObjectStorageService } from '../../common/storage/object-storage.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorageService,
  ) {}

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
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
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            cin: true,
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
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            cin: true,
          },
        },
      },
    });
  }

  async create(
    dto: CreateDocumentDto,
    file?: Express.Multer.File,
    currentUser?: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const ownerCount =
      Number(Boolean(dto.studentId)) + Number(Boolean(dto.teacherId));
    if (ownerCount !== 1) {
      throw new BadRequestException(
        'Provide exactly one owner: either studentId or teacherId',
      );
    }

    if (dto.studentId) {
      const student = await this.prisma.student.findUnique({
        where: { id: dto.studentId },
        select: { id: true, codeMassar: true, userId: true },
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }
      if (
        currentUser?.role === UserRole.STUDENT &&
        student.userId !== currentUser.sub
      ) {
        throw new ForbiddenException(
          'Vous pouvez téléverser uniquement vos propres documents.',
        );
      }

      const stored = await this.storage.uploadBuffer({
        bucketName: 'originalDocuments',
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        folder: `students/${student.codeMassar}`,
        allowedMimeTypes: [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/jpg',
        ],
        maxSizeBytes: 10 * 1024 * 1024,
      });

      const document = await this.prisma.document.create({
        data: {
          name: file.originalname,
          mimeType: file.mimetype,
          path: stored.reference,
          storageProvider: 'minio',
          bucket: stored.bucket,
          objectKey: stored.key,
          fileHash: stored.hash,
          size: stored.size,
          studentId: student.id,
          ...(dto.category ? { category: dto.category.trim() } : {}),
        },
      });
      await this.audit(currentUser?.sub, 'document.upload', {
        documentId: document.id,
        studentId: student.id,
      });
      return document;
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: dto.teacherId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        cin: true,
        userId: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    if (
      currentUser?.role === UserRole.TEACHER &&
      teacher.userId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'Vous pouvez téléverser uniquement vos propres documents.',
      );
    }

    const teacherFolder = teacher.cin
      ? teacher.cin
      : `teacher-${teacher.id}-${this.slugify(
          `${teacher.firstName}-${teacher.lastName}`,
        )}`;
    const stored = await this.storage.uploadBuffer({
      bucketName: 'originalDocuments',
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: `teachers/${teacherFolder}`,
      allowedMimeTypes: [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
      ],
      maxSizeBytes: 10 * 1024 * 1024,
    });

    const document = await this.prisma.document.create({
      data: {
        name: file.originalname,
        mimeType: file.mimetype,
        path: stored.reference,
        storageProvider: 'minio',
        bucket: stored.bucket,
        objectKey: stored.key,
        fileHash: stored.hash,
        size: stored.size,
        teacherId: teacher.id,
        ...(dto.category ? { category: dto.category.trim() } : {}),
      },
    });
    await this.audit(currentUser?.sub, 'document.upload', {
      documentId: document.id,
      teacherId: teacher.id,
    });
    return document;
  }

  async streamFile(id: number, res: Response, user?: JwtPayload) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(doc.name)}"`,
    );

    if (
      doc.storageProvider === 'minio' ||
      this.storage.parseReference(doc.path)
    ) {
      await this.audit(user?.sub, 'document.download', { documentId: doc.id });
      return new StreamableFile(await this.storage.getObject(doc.path));
    }

    if (!existsSync(doc.path)) {
      throw new NotFoundException('File not found on disk');
    }
    await this.audit(user?.sub, 'document.download', { documentId: doc.id });
    return new StreamableFile(createReadStream(doc.path));
  }

  findByStudent(studentId: number) {
    return this.prisma.document.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByStudentForUser(studentId: number, user: JwtPayload) {
    if (user.role === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { userId: true },
      });
      if (!student || student.userId !== user.sub) {
        throw new ForbiddenException(
          'Vous ne pouvez consulter que vos propres documents',
        );
      }
    }

    return this.findByStudent(studentId);
  }

  findByTeacher(teacherId: number) {
    return this.prisma.document.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTeacherForUser(teacherId: number, user: JwtPayload) {
    if (user.role === UserRole.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: teacherId },
        select: { userId: true },
      });
      if (!teacher || teacher.userId !== user.sub) {
        throw new ForbiddenException(
          'Vous ne pouvez consulter que vos propres documents',
        );
      }
    }

    return this.findByTeacher(teacherId);
  }

  update(
    id: number,
    dto: { name?: string; studentId?: number; teacherId?: number },
  ) {
    const ownerCount =
      Number(Boolean(dto.studentId)) + Number(Boolean(dto.teacherId));
    if (ownerCount > 1) {
      throw new BadRequestException(
        'Document cannot be attached to both a student and a teacher',
      );
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.studentId ? { studentId: dto.studentId, teacherId: null } : {}),
        ...(dto.teacherId ? { teacherId: dto.teacherId, studentId: null } : {}),
      },
    });
  }

  async remove(id: number, user?: JwtPayload) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    if (
      doc.storageProvider === 'minio' ||
      this.storage.parseReference(doc.path)
    ) {
      await this.storage.deleteObject(doc.path);
    }
    const deleted = await this.prisma.document.delete({ where: { id } });
    await this.audit(user?.sub, 'document.delete', { documentId: id });
    return deleted;
  }

  async missingDocuments(studentId: number) {
    const required = ['cin', 'bac', 'photo'];
    const docs = await this.prisma.document.findMany({ where: { studentId } });
    const existing: string[] = docs.map((d) => d.name.toLowerCase());

    return required.filter(
      (item) => !existing.some((name) => name.includes(item)),
    );
  }

  private async audit(
    userId: number | undefined,
    action: string,
    metadata: Prisma.JsonObject,
  ) {
    if (!userId) return;
    await this.prisma.activityLog.create({
      data: { userId, action, metadata },
    });
  }
}
