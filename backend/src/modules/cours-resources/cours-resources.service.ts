import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createReadStream, existsSync } from 'fs';
import { basename } from 'path';
import type { Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../../common/types/role.type';
import { UpdateCoursResourceDto } from './dto/update-cours-resource.dto';
import { UploadCoursResourceDto } from './dto/upload-cours-resource.dto';
import { ObjectStorageService } from '../../common/storage/object-storage.service';

const RESOURCE_INCLUDE = {
  cours: { select: { id: true, name: true, type: true } },
  class: { select: { id: true, name: true, year: true } },
  teacher: { select: { id: true, firstName: true, lastName: true } },
  uploadedBy: { select: { id: true, fullName: true, role: true } },
} satisfies Prisma.CoursResourceInclude;

@Injectable()
export class CoursResourcesService {
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

  async findAll(
    query: { classId?: number; coursId?: number },
    user: JwtPayload,
  ) {
    const where: Prisma.CoursResourceWhereInput = {};
    if (query.classId) where.classId = query.classId;
    if (query.coursId) where.coursId = query.coursId;

    if (user.role === UserRole.STUDENT) {
      const student = await this.getStudentForUser(user.sub);
      if (!student.classId) return [];
      where.classId = student.classId;
    }

    return this.prisma.coursResource.findMany({
      where,
      include: RESOURCE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async upload(
    dto: UploadCoursResourceDto,
    file: Express.Multer.File | undefined,
    user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('File is required');
    await this.ensureCoursClassExists(dto.coursId, dto.classId);

    const teacherId = await this.resolveTeacherId(dto, user);
    const safeTitle = dto.title?.trim() || file.originalname;
    const folder = `cours-resources/class-${dto.classId}/cours-${dto.coursId}`;
    const stored = await this.storage.uploadBuffer({
      bucketName: 'originalDocuments',
      buffer: file.buffer,
      originalName:
        this.slugify(file.originalname) || basename(file.originalname),
      mimeType: file.mimetype,
      folder,
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/png',
        'image/jpeg',
        'image/jpg',
      ],
      maxSizeBytes: 25 * 1024 * 1024,
    });

    const resource = await this.prisma.coursResource.create({
      data: {
        coursId: dto.coursId,
        classId: dto.classId,
        teacherId,
        uploadedById: user.sub,
        title: safeTitle,
        fileName: file.originalname,
        mimeType: file.mimetype,
        path: stored.reference,
        storageProvider: 'minio',
        bucket: stored.bucket,
        objectKey: stored.key,
        fileHash: stored.hash,
        size: stored.size,
      },
      include: RESOURCE_INCLUDE,
    });
    await this.audit(user.sub, 'document.upload', {
      resourceId: resource.id,
      coursId: dto.coursId,
      classId: dto.classId,
    });
    return resource;
  }

  async download(
    id: number,
    user: JwtPayload,
    res: Response,
    disposition: 'inline' | 'attachment',
  ) {
    const resource = await this.getAuthorizedResource(id, user);
    res.setHeader('Content-Type', resource.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(resource.fileName)}"`,
    );
    await this.audit(user.sub, 'document.download', {
      resourceId: resource.id,
    });

    if (
      resource.storageProvider === 'minio' ||
      this.storage.parseReference(resource.path)
    ) {
      return new StreamableFile(await this.storage.getObject(resource.path));
    }

    if (!existsSync(resource.path)) {
      throw new NotFoundException('Fichier introuvable');
    }
    return new StreamableFile(createReadStream(resource.path));
  }

  async remove(id: number, user: JwtPayload) {
    const resource = await this.getAuthorizedResource(id, user);
    await this.ensureCanManageResource(resource, user);
    if (
      resource.storageProvider === 'minio' ||
      this.storage.parseReference(resource.path)
    ) {
      await this.storage.deleteObject(resource.path);
    }
    const deleted = await this.prisma.coursResource.delete({
      where: { id: resource.id },
    });
    await this.audit(user.sub, 'document.delete', { resourceId: resource.id });
    return deleted;
  }

  async update(id: number, dto: UpdateCoursResourceDto, user: JwtPayload) {
    const resource = await this.getAuthorizedResource(id, user);
    await this.ensureCanManageResource(resource, user);

    const nextCoursId = dto.coursId ?? resource.coursId;
    const nextClassId = dto.classId ?? resource.classId;
    if (dto.coursId || dto.classId) {
      await this.ensureCoursClassExists(nextCoursId, nextClassId);
    }

    if (dto.teacherId) {
      await this.ensureTeacherExists(dto.teacherId);
    }

    return this.prisma.coursResource.update({
      where: { id: resource.id },
      data: {
        ...(dto.title !== undefined
          ? { title: dto.title.trim() || resource.fileName }
          : {}),
        ...(dto.coursId !== undefined ? { coursId: dto.coursId } : {}),
        ...(dto.classId !== undefined ? { classId: dto.classId } : {}),
        ...(dto.teacherId !== undefined ? { teacherId: dto.teacherId } : {}),
      },
      include: RESOURCE_INCLUDE,
    });
  }

  private async getAuthorizedResource(id: number, user: JwtPayload) {
    const resource = await this.prisma.coursResource.findUnique({
      where: { id },
      include: RESOURCE_INCLUDE,
    });
    if (!resource) throw new NotFoundException('Ressource introuvable');

    if (user.role === UserRole.STUDENT) {
      const student = await this.getStudentForUser(user.sub);
      if (student.classId !== resource.classId) {
        throw new ForbiddenException('Insufficient role permissions');
      }
    }

    return resource;
  }

  private async ensureCanManageResource(
    resource: Prisma.CoursResourceGetPayload<{
      include: typeof RESOURCE_INCLUDE;
    }>,
    user: JwtPayload,
  ) {
    if (
      ![UserRole.ADMIN, UserRole.STAFF, UserRole.TEACHER].includes(user.role)
    ) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    if (user.role !== UserRole.TEACHER) return;

    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!teacher || resource.teacherId !== teacher.id) {
      throw new ForbiddenException('Insufficient role permissions');
    }
  }

  private async ensureCoursClassExists(coursId: number, classId: number) {
    const assignment = await this.prisma.coursClass.findFirst({
      where: { coursId, classId },
      select: { id: true },
    });
    if (!assignment) {
      throw new BadRequestException(
        'Ce cours n’est pas affecté à cette classe',
      );
    }
  }

  private async resolveTeacherId(
    dto: UploadCoursResourceDto,
    user: JwtPayload,
  ) {
    if (user.role !== UserRole.TEACHER) {
      if (dto.teacherId) {
        await this.ensureTeacherExists(dto.teacherId);
      }
      return dto.teacherId ?? null;
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException('Profil enseignant introuvable');

    const assignment = await this.prisma.coursClass.findFirst({
      where: {
        coursId: dto.coursId,
        classId: dto.classId,
        teacherId: teacher.id,
      },
      select: { id: true },
    });
    if (!assignment) {
      throw new ForbiddenException('Cours non affecté à cet enseignant');
    }

    return teacher.id;
  }

  private async ensureTeacherExists(teacherId: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException('Enseignant introuvable');
  }

  private async getStudentForUser(userId: number) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      select: { id: true, classId: true },
    });
    if (!student) throw new NotFoundException('Profil étudiant introuvable');
    return student;
  }

  private async audit(
    userId: number,
    action: string,
    metadata: Prisma.JsonObject,
  ) {
    await this.prisma.activityLog.create({
      data: { userId, action, metadata },
    });
  }
}
