import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createReadStream, existsSync, mkdirSync, renameSync } from 'fs';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import type { Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../../common/types/role.type';
import { UpdateCoursResourceDto } from './dto/update-cours-resource.dto';
import { UploadCoursResourceDto } from './dto/upload-cours-resource.dto';

const RESOURCE_INCLUDE = {
  cours: { select: { id: true, name: true, type: true } },
  class: { select: { id: true, name: true, year: true } },
  teacher: { select: { id: true, firstName: true, lastName: true } },
  uploadedBy: { select: { id: true, fullName: true, role: true } },
} satisfies Prisma.CoursResourceInclude;

@Injectable()
export class CoursResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  private getUploadBaseDir() {
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      return join(tmpdir(), 'deaa-hub', 'uploads', 'cours-resources');
    }

    return join(process.cwd(), 'uploads', 'cours-resources');
  }

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
    const classDir = join(
      this.getUploadBaseDir(),
      `class-${dto.classId}`,
      `cours-${dto.coursId}`,
    );
    if (!existsSync(classDir)) mkdirSync(classDir, { recursive: true });

    const safeTitle = dto.title?.trim() || file.originalname;
    const finalName = `${Date.now()}-${this.slugify(file.originalname) || basename(file.filename)}`;
    const finalPath = join(classDir, finalName);
    renameSync(file.path, finalPath);

    return this.prisma.coursResource.create({
      data: {
        coursId: dto.coursId,
        classId: dto.classId,
        teacherId,
        uploadedById: user.sub,
        title: safeTitle,
        fileName: file.originalname,
        mimeType: file.mimetype,
        path: finalPath,
        size: file.size,
      },
      include: RESOURCE_INCLUDE,
    });
  }

  async download(
    id: number,
    user: JwtPayload,
    res: Response,
    disposition: 'inline' | 'attachment',
  ) {
    const resource = await this.getAuthorizedResource(id, user);
    if (!existsSync(resource.path)) {
      throw new NotFoundException('Fichier introuvable');
    }

    res.setHeader('Content-Type', resource.mimeType);
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(resource.fileName)}"`,
    );
    return new StreamableFile(createReadStream(resource.path));
  }

  async remove(id: number, user: JwtPayload) {
    const resource = await this.getAuthorizedResource(id, user);
    await this.ensureCanManageResource(resource, user);
    return this.prisma.coursResource.delete({ where: { id: resource.id } });
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
}
