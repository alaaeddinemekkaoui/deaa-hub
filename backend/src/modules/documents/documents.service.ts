import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { CreateDocumentTemplateDto } from './dto/create-document-template.dto';
import { GenerateReleveDto } from './dto/generate-releve.dto';
import { UpdateDocumentTemplateDto } from './dto/update-document-template.dto';
import { createReadStream, existsSync } from 'fs';
import type { Readable } from 'stream';
import type { Response } from 'express';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../../common/types/role.type';
import { ObjectStorageService } from '../../common/storage/object-storage.service';

type ReleveTemplate = {
  id: number;
  name: string;
  type: string;
  documentTypeId: number | null;
  header: string;
  body: string;
  footer: string | null;
  primaryColor: string | null;
  signatureLabel: string | null;
  eSignatureEnabled?: boolean;
  eSignatureSignerName?: string | null;
  eSignatureSignerTitle?: string | null;
  eSignatureStampText?: string | null;
  eSignaturePositionX?: number;
  eSignaturePositionY?: number;
  eSignatureWidth?: number;
  eSignatureHeight?: number;
  docxTemplatePath?: string | null;
  docxTemplateName?: string | null;
  docxTemplateMimeType?: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type StudentForGeneratedDocument = Prisma.StudentGetPayload<{
  include: {
    academicClass: { select: { id: true; name: true; academicYear: true } };
    filiere: { select: { id: true; name: true; code: true } };
  };
}>;

type GradeForGeneratedDocument = Prisma.StudentGradeGetPayload<{
  include: {
    module: { select: { name: true } };
    elementModule: { select: { name: true; coefficient: true } };
    academicClass: { select: { name: true } };
  };
}>;

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

  listTemplates() {
    return this.prisma.documentTemplate.findMany({
      include: {
        documentType: { select: { id: true, name: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async createTemplate(dto: CreateDocumentTemplateDto) {
    const data = this.cleanTemplateData(dto);
    if (data.isDefault) {
      await this.prisma.documentTemplate.updateMany({
        where: { type: data.type ?? 'releve_note' },
        data: { isDefault: false },
      });
    }

    return this.prisma.documentTemplate.create({
      data: {
        name: dto.name.trim(),
        type: dto.type?.trim() || 'releve_note',
        documentTypeId: dto.documentTypeId ?? undefined,
        header: dto.header.trim(),
        body: dto.body.trim(),
        footer: dto.footer?.trim(),
        primaryColor: dto.primaryColor ?? '#0f766e',
        signatureLabel:
          dto.signatureLabel?.trim() ?? 'Direction des Affaires Académiques',
        eSignatureEnabled: dto.eSignatureEnabled ?? true,
        eSignatureSignerName: dto.eSignatureSignerName?.trim() ?? 'DEAA Hub',
        eSignatureSignerTitle:
          dto.eSignatureSignerTitle?.trim() ??
          'Direction des Affaires Académiques',
        eSignatureStampText:
          dto.eSignatureStampText?.trim() ?? 'Signé électroniquement',
        eSignaturePositionX: dto.eSignaturePositionX ?? 0.62,
        eSignaturePositionY: dto.eSignaturePositionY ?? 0.82,
        eSignatureWidth: dto.eSignatureWidth ?? 0.24,
        eSignatureHeight: dto.eSignatureHeight ?? 0.08,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async updateTemplate(id: number, dto: UpdateDocumentTemplateDto) {
    const existing = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Document template not found');

    const data = this.cleanTemplateData(dto);
    if (data.isDefault) {
      await this.prisma.documentTemplate.updateMany({
        where: {
          id: { not: id },
          type: data.type ?? existing.type,
        },
        data: { isDefault: false },
      });
    }

    return this.prisma.documentTemplate.update({
      where: { id },
      data,
    });
  }

  async deleteTemplate(id: number) {
    const existing = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Document template not found');

    return this.prisma.documentTemplate.delete({ where: { id } });
  }

  async uploadTemplateDocx(
    id: number,
    file?: Express.Multer.File,
    currentUser?: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('DOCX file is required');
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Document template not found');

    const stored = await this.storage.uploadBuffer({
      bucketName: 'originalDocuments',
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: `templates/${this.slugify(template.name)}`,
      allowedMimeTypes: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      maxSizeBytes: 5 * 1024 * 1024,
    });

    if (
      template.docxTemplatePath &&
      (template.docxTemplateStorageProvider === 'minio' ||
        this.storage.parseReference(template.docxTemplatePath))
    ) {
      await this.storage.deleteObject(template.docxTemplatePath);
    }

    const updated = await this.prisma.documentTemplate.update({
      where: { id },
      data: {
        docxTemplatePath: stored.reference,
        docxTemplateName: file.originalname,
        docxTemplateMimeType: file.mimetype,
        docxTemplateStorageProvider: 'minio',
        docxTemplateBucket: stored.bucket,
        docxTemplateObjectKey: stored.key,
        docxTemplateFileHash: stored.hash,
        docxTemplateSize: stored.size,
      },
    });
    await this.audit(currentUser?.sub, 'document.template.docx.upload', {
      templateId: id,
    });
    return updated;
  }

  async getESignature() {
    return this.prisma.eSignatureAsset.findFirst({
      where: { active: true },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async uploadESignature(
    file?: Express.Multer.File,
    currentUser?: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('Signature image is required');

    const stored = await this.storage.uploadBuffer({
      bucketName: 'signatureAssets',
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      folder: 'official',
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg'],
      maxSizeBytes: 2 * 1024 * 1024,
    });

    const previous = await this.getESignature();
    if (previous?.path) {
      await this.storage.deleteObject(previous.path);
    }

    const signature = await this.prisma.eSignatureAsset.upsert({
      where: { id: 1 },
      update: {
        name: file.originalname,
        mimeType: file.mimetype,
        path: stored.reference,
        storageProvider: 'minio',
        bucket: stored.bucket,
        objectKey: stored.key,
        fileHash: stored.hash,
        size: stored.size,
        active: true,
      },
      create: {
        id: 1,
        name: file.originalname,
        mimeType: file.mimetype,
        path: stored.reference,
        storageProvider: 'minio',
        bucket: stored.bucket,
        objectKey: stored.key,
        fileHash: stored.hash,
        size: stored.size,
        active: true,
      },
    });
    await this.audit(currentUser?.sub, 'document.esignature.upload', {
      signatureId: signature.id,
    });
    return signature;
  }

  async streamESignatureImage(res: Response) {
    const signature = await this.getESignature();
    if (!signature) throw new NotFoundException('E-signature not found');

    res.setHeader('Content-Type', signature.mimeType);
    res.setHeader('Content-Disposition', 'inline; filename="e-signature"');
    return new StreamableFile(await this.storage.getObject(signature.path));
  }

  async generateStudentDocumentDocx(
    studentId: number,
    dto: GenerateReleveDto,
    currentUser?: JwtPayload,
  ) {
    const student = await this.loadStudentForGeneration(studentId, currentUser);
    const template = await this.resolveTemplate(dto);
    if (!template.docxTemplatePath) {
      throw new BadRequestException(
        'No DOCX template is attached to this document template',
      );
    }

    const includeGrades = template.type === 'releve_note';
    const grades = includeGrades ? await this.loadGrades(student.id) : [];
    const generatedAt = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date());
    const vars = this.buildDocumentVars(student, grades, template, generatedAt);
    const fallbackText = this.buildGeneratedDocxText(
      student,
      grades,
      template,
      vars,
    );
    const sourceBuffer = await this.readStreamToBuffer(
      await this.storage.getObject(template.docxTemplatePath),
    );
    const docxBuffer = this.renderDocxTemplate(
      sourceBuffer,
      vars,
      fallbackText,
    );

    const safeName = this.slugify(student.fullName || `student-${student.id}`);
    const documentTypeName = template.name.replace(/^Modèle - /, '');
    const safeDocumentType = includeGrades
      ? 'releve-de-notes'
      : this.slugify(documentTypeName || 'document');
    const fileName = `${safeDocumentType}-${safeName}.docx`;
    const mimeType =
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const stored = await this.storage.uploadBuffer({
      bucketName: 'signedDocuments',
      buffer: docxBuffer,
      originalName: fileName,
      mimeType,
      folder: `generated-docx/${safeDocumentType}/${student.codeMassar}`,
      allowedMimeTypes: [mimeType],
      maxSizeBytes: 10 * 1024 * 1024,
    });

    const document = await this.prisma.document.create({
      data: {
        name: fileName,
        mimeType,
        path: stored.reference,
        storageProvider: 'minio',
        bucket: stored.bucket,
        objectKey: stored.key,
        fileHash: stored.hash,
        size: stored.size,
        studentId: student.id,
        category: includeGrades
          ? 'Relevé de notes DOCX généré'
          : `${documentTypeName} DOCX généré`,
      },
    });

    await this.audit(currentUser?.sub, 'document.generate.student.docx', {
      documentId: document.id,
      studentId: student.id,
      templateId: template.id,
    });

    return document;
  }

  async generateStudentRelevePdf(
    studentId: number,
    dto: GenerateReleveDto,
    currentUser?: JwtPayload,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        academicClass: { select: { id: true, name: true, academicYear: true } },
        filiere: { select: { id: true, name: true, code: true } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (
      currentUser?.role === UserRole.STUDENT &&
      student.userId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'Vous pouvez générer uniquement vos propres relevés.',
      );
    }

    const template = dto.templateId
      ? await this.prisma.documentTemplate.findUnique({
          where: { id: dto.templateId },
        })
      : dto.documentTypeId
        ? await this.prisma.documentTemplate.findUnique({
            where: { documentTypeId: dto.documentTypeId },
          })
        : await this.prisma.documentTemplate.findFirst({
            where: { type: 'releve_note', isDefault: true },
          });
    if (dto.templateId && !template) {
      throw new NotFoundException('Document template not found');
    }
    if (dto.documentTypeId && !template) {
      throw new NotFoundException(
        'No template is configured for this document type',
      );
    }

    const resolvedTemplate = template ?? this.defaultReleveTemplate();
    const includeGrades = resolvedTemplate.type === 'releve_note';
    const grades = includeGrades
      ? await this.prisma.studentGrade.findMany({
          where: { studentId },
          include: {
            module: { select: { name: true } },
            elementModule: { select: { name: true, coefficient: true } },
            academicClass: { select: { name: true } },
          },
          orderBy: [
            { academicYear: 'desc' },
            { semester: 'asc' },
            { subject: 'asc' },
          ],
        })
      : [];
    const signatureImage = await this.getActiveSignatureImageBuffer();

    const pdfBuffer = await this.buildRelevePdfBuffer({
      student,
      grades,
      template: resolvedTemplate,
      signatureImage,
    });
    const safeName = this.slugify(student.fullName || `student-${student.id}`);
    const documentTypeName = resolvedTemplate.name.replace(/^Modèle - /, '');
    const safeDocumentType = includeGrades
      ? 'releve-de-notes'
      : this.slugify(documentTypeName || 'document');
    const fileName = `${safeDocumentType}-${safeName}.pdf`;
    const stored = await this.storage.uploadBuffer({
      bucketName: 'signedDocuments',
      buffer: pdfBuffer,
      originalName: fileName,
      mimeType: 'application/pdf',
      folder: `generated/${safeDocumentType}/${student.codeMassar}`,
      allowedMimeTypes: ['application/pdf'],
      maxSizeBytes: 10 * 1024 * 1024,
    });

    const document = await this.prisma.document.create({
      data: {
        name: fileName,
        mimeType: 'application/pdf',
        path: stored.reference,
        storageProvider: 'minio',
        bucket: stored.bucket,
        objectKey: stored.key,
        fileHash: stored.hash,
        size: stored.size,
        studentId: student.id,
        category: includeGrades
          ? 'Relevé de notes généré'
          : `${documentTypeName} généré`,
      },
    });

    await this.audit(currentUser?.sub, 'document.generate.student', {
      documentId: document.id,
      studentId: student.id,
      templateId: resolvedTemplate.id || null,
    });

    return document;
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

  private cleanTemplateData(
    dto: CreateDocumentTemplateDto | UpdateDocumentTemplateDto,
  ) {
    return {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.type !== undefined ? { type: dto.type.trim() } : {}),
      ...(dto.documentTypeId !== undefined
        ? { documentTypeId: dto.documentTypeId }
        : {}),
      ...(dto.header !== undefined ? { header: dto.header.trim() } : {}),
      ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
      ...(dto.footer !== undefined ? { footer: dto.footer?.trim() } : {}),
      ...(dto.primaryColor !== undefined
        ? { primaryColor: dto.primaryColor }
        : {}),
      ...(dto.signatureLabel !== undefined
        ? { signatureLabel: dto.signatureLabel?.trim() }
        : {}),
      ...(dto.eSignatureEnabled !== undefined
        ? { eSignatureEnabled: dto.eSignatureEnabled }
        : {}),
      ...(dto.eSignatureSignerName !== undefined
        ? { eSignatureSignerName: dto.eSignatureSignerName?.trim() }
        : {}),
      ...(dto.eSignatureSignerTitle !== undefined
        ? { eSignatureSignerTitle: dto.eSignatureSignerTitle?.trim() }
        : {}),
      ...(dto.eSignatureStampText !== undefined
        ? { eSignatureStampText: dto.eSignatureStampText?.trim() }
        : {}),
      ...(dto.eSignaturePositionX !== undefined
        ? { eSignaturePositionX: dto.eSignaturePositionX }
        : {}),
      ...(dto.eSignaturePositionY !== undefined
        ? { eSignaturePositionY: dto.eSignaturePositionY }
        : {}),
      ...(dto.eSignatureWidth !== undefined
        ? { eSignatureWidth: dto.eSignatureWidth }
        : {}),
      ...(dto.eSignatureHeight !== undefined
        ? { eSignatureHeight: dto.eSignatureHeight }
        : {}),
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
    };
  }

  private defaultReleveTemplate() {
    return {
      id: 0,
      name: 'Relevé de notes officiel',
      type: 'releve_note',
      documentTypeId: null,
      header:
        'DEAA Hub\nDirection des Affaires Académiques\nRelevé de notes officiel',
      body: 'Le présent relevé récapitule les notes enregistrées pour {{studentName}} durant {{academicYear}}.',
      footer:
        'Document généré le {{generatedAt}}. Vérifier les informations avant signature ou remise officielle.',
      primaryColor: '#0f766e',
      signatureLabel: 'Direction des Affaires Académiques',
      eSignatureEnabled: true,
      eSignatureSignerName: 'DEAA Hub',
      eSignatureSignerTitle: 'Direction des Affaires Académiques',
      eSignatureStampText: 'Signé électroniquement',
      eSignaturePositionX: 0.62,
      eSignaturePositionY: 0.82,
      eSignatureWidth: 0.24,
      eSignatureHeight: 0.08,
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private replaceTemplateVars(
    value: string | null | undefined,
    vars: Record<string, string>,
  ) {
    if (!value) return '';
    return Object.entries(vars).reduce(
      (text, [key, replacement]) =>
        text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), replacement),
      value,
    );
  }

  private async loadStudentForGeneration(
    studentId: number,
    currentUser?: JwtPayload,
  ): Promise<StudentForGeneratedDocument> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        academicClass: { select: { id: true, name: true, academicYear: true } },
        filiere: { select: { id: true, name: true, code: true } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    if (
      currentUser?.role === UserRole.STUDENT &&
      student.userId !== currentUser.sub
    ) {
      throw new ForbiddenException(
        'Vous pouvez générer uniquement vos propres documents.',
      );
    }

    return student;
  }

  private async resolveTemplate(dto: GenerateReleveDto): Promise<ReleveTemplate> {
    const template = dto.templateId
      ? await this.prisma.documentTemplate.findUnique({
          where: { id: dto.templateId },
        })
      : dto.documentTypeId
        ? await this.prisma.documentTemplate.findUnique({
            where: { documentTypeId: dto.documentTypeId },
          })
        : await this.prisma.documentTemplate.findFirst({
            where: { type: 'releve_note', isDefault: true },
          });

    if (dto.templateId && !template) {
      throw new NotFoundException('Document template not found');
    }
    if (dto.documentTypeId && !template) {
      throw new NotFoundException(
        'No template is configured for this document type',
      );
    }

    return template ?? this.defaultReleveTemplate();
  }

  private loadGrades(studentId: number) {
    return this.prisma.studentGrade.findMany({
      where: { studentId },
      include: {
        module: { select: { name: true } },
        elementModule: { select: { name: true, coefficient: true } },
        academicClass: { select: { name: true } },
      },
      orderBy: [
        { academicYear: 'desc' },
        { semester: 'asc' },
        { subject: 'asc' },
      ],
    });
  }

  private buildDocumentVars(
    student: StudentForGeneratedDocument,
    grades: GradeForGeneratedDocument[],
    template: ReleveTemplate,
    generatedAt: string,
  ) {
    const academicYear =
      student.academicClass?.academicYear ?? student.anneeAcademique;
    const average = this.calculateAverage(grades);
    const baseVars: Record<string, string> = {
      studentName: student.fullName,
      codeMassar: student.codeMassar,
      codeEtudiant: student.codeEtudiant ?? '',
      className: student.academicClass?.name ?? '',
      filiereName: student.filiere?.name ?? '',
      academicYear,
      generatedAt,
      average: average === null ? '-' : average.toFixed(2),
      documentTypeName: template.name.replace(/^Modèle - /, ''),
      gradesText: this.formatGradesText(grades),
    };

    return {
      ...baseVars,
      body: this.replaceTemplateVars(template.body, baseVars),
      footer: this.replaceTemplateVars(template.footer, baseVars),
      signatureLabel: this.replaceTemplateVars(
        template.signatureLabel,
        baseVars,
      ),
    };
  }

  private formatGradesText(grades: GradeForGeneratedDocument[]) {
    if (grades.length === 0) return 'Aucune note enregistrée.';
    return grades
      .map((grade) => {
        const moduleName = grade.module?.name ?? grade.subject;
        const elementName = grade.elementModule?.name ?? grade.subject;
        const score = `${grade.score.toFixed(2)} / ${grade.maxScore ?? 20}`;
        const rattrapage =
          grade.rattrapageScore === null
            ? ''
            : `, rattrapage ${grade.rattrapageScore.toFixed(2)} / ${
                grade.rattrapageMaxScore ?? 20
              }`;
        return `${grade.academicYear} ${grade.semester ?? ''} - ${moduleName} - ${elementName}: ${score}${rattrapage}`;
      })
      .join('\n');
  }

  private buildGeneratedDocxText(
    student: StudentForGeneratedDocument,
    grades: GradeForGeneratedDocument[],
    template: ReleveTemplate,
    vars: Record<string, string>,
  ) {
    const lines = [
      vars.documentTypeName,
      '',
      vars.body,
      '',
      `Étudiant: ${student.fullName}`,
      `Code Massar: ${student.codeMassar}`,
      `Classe: ${student.academicClass?.name ?? '-'}`,
      `Filière: ${student.filiere?.name ?? '-'}`,
    ];

    if (template.type === 'releve_note') {
      lines.push('', `Moyenne générale: ${vars.average} / 20`, '', vars.gradesText);
    }

    if (vars.footer) {
      lines.push('', vars.footer);
    }
    if (vars.signatureLabel) {
      lines.push('', vars.signatureLabel);
    }

    return lines.join('\n');
  }

  private renderDocxTemplate(
    sourceBuffer: Buffer,
    vars: Record<string, string>,
    fallbackText: string,
  ) {
    const zip = new PizZip(sourceBuffer);
    const documentXml = zip.file('word/document.xml')?.asText() ?? '';
    const shouldAppendFallback = !documentXml.includes('{{');
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    try {
      doc.render(vars);
    } catch {
      throw new BadRequestException(
        'The DOCX template contains invalid placeholders',
      );
    }

    const renderedZip = doc.getZip();
    if (shouldAppendFallback) {
      this.appendDocxText(renderedZip, fallbackText);
    }

    return renderedZip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    }) as Buffer;
  }

  private appendDocxText(zip: PizZip, text: string) {
    const file = zip.file('word/document.xml');
    const xml = file?.asText();
    if (!file || !xml) return;

    const paragraphs = text
      .split('\n')
      .map(
        (line) =>
          `<w:p><w:r><w:t xml:space="preserve">${this.escapeXml(line)}</w:t></w:r></w:p>`,
      )
      .join('');
    const sectionIndex = xml.lastIndexOf('<w:sectPr');
    const nextXml =
      sectionIndex >= 0
        ? `${xml.slice(0, sectionIndex)}${paragraphs}${xml.slice(sectionIndex)}`
        : xml.replace('</w:body>', `${paragraphs}</w:body>`);
    zip.file('word/document.xml', nextXml);
  }

  private escapeXml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private calculateAverage(
    grades: Array<{ score: number; maxScore: number | null }>,
  ) {
    if (grades.length === 0) return null;
    const normalized = grades.map((grade) =>
      grade.maxScore ? (grade.score / grade.maxScore) * 20 : grade.score,
    );
    return (
      normalized.reduce((total, score) => total + score, 0) / normalized.length
    );
  }

  private async buildRelevePdfBuffer(params: {
    student: Prisma.StudentGetPayload<{
      include: {
        academicClass: { select: { id: true; name: true; academicYear: true } };
        filiere: { select: { id: true; name: true; code: true } };
      };
    }>;
    grades: Array<
      Prisma.StudentGradeGetPayload<{
        include: {
          module: { select: { name: true } };
          elementModule: { select: { name: true; coefficient: true } };
          academicClass: { select: { name: true } };
        };
      }>
    >;
    template: ReleveTemplate;
    signatureImage?: Buffer;
  }) {
    const { student, grades, template, signatureImage } = params;
    const generatedAt = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date());
    const academicYear =
      student.academicClass?.academicYear ?? student.anneeAcademique;
    const average = this.calculateAverage(grades);
    const vars = {
      studentName: student.fullName,
      codeMassar: student.codeMassar,
      codeEtudiant: student.codeEtudiant ?? '',
      className: student.academicClass?.name ?? '',
      filiereName: student.filiere?.name ?? '',
      academicYear,
      generatedAt,
      average: average === null ? '-' : average.toFixed(2),
      documentTypeName: template.name.replace(/^Modèle - /, ''),
    };
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 42,
        bufferPages: true,
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .fontSize(16)
        .text(vars.documentTypeName, 42, 42);

      doc
        .moveDown(0.5)
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#374151')
        .text(this.replaceTemplateVars(template.body, vars), {
          width: doc.page.width - 84,
        });

      const detailsTop = doc.y + 18;
      doc
        .roundedRect(42, detailsTop, doc.page.width - 84, 104, 6)
        .strokeColor('#d1d5db')
        .stroke();
      const leftX = 58;
      const rightX = 320;
      doc.fillColor('#111827').fontSize(10).font('Helvetica-Bold');
      doc.text('Étudiant', leftX, detailsTop + 16);
      doc.text('Classe', rightX, detailsTop + 16);
      doc.font('Helvetica').fillColor('#374151');
      doc.text(student.fullName, leftX, detailsTop + 34);
      doc.text(student.academicClass?.name ?? '-', rightX, detailsTop + 34);
      doc.font('Helvetica-Bold').fillColor('#111827');
      doc.text('Code Massar', leftX, detailsTop + 58);
      doc.text('Filière', rightX, detailsTop + 58);
      doc.font('Helvetica').fillColor('#374151');
      doc.text(student.codeMassar, leftX, detailsTop + 76);
      doc.text(student.filiere?.name ?? '-', rightX, detailsTop + 76);

      doc.y = detailsTop + 130;
      const grouped = new Map<string, typeof grades>();
      grades.forEach((grade) => {
        const key = `${grade.academicYear} - ${grade.semester ?? 'Semestre non défini'}`;
        grouped.set(key, [...(grouped.get(key) ?? []), grade]);
      });

      if (template.type !== 'releve_note') {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#374151')
          .text('Ce document est généré à partir du modèle administratif configuré.', {
            width: doc.page.width - 84,
          });
      } else if (grades.length === 0) {
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#991b1b')
          .text('Aucune note enregistrée pour cet étudiant.');
      } else {
        grouped.forEach((items, groupName) => {
          if (doc.y > 680) doc.addPage();
          doc
            .font('Helvetica-Bold')
            .fontSize(12)
            .fillColor('#111827')
            .text(groupName);
          this.drawGradeTable(doc, items);
          const groupAverage = this.calculateAverage(items);
          doc
            .moveDown(0.4)
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor('#111827')
            .text(
              `Moyenne ${groupName}: ${
                groupAverage === null ? '-' : groupAverage.toFixed(2)
              } / 20`,
              { align: 'right' },
            )
            .moveDown(0.8);
        });
      }

      doc
        .moveDown(1)
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#4b5563')
        .text(this.replaceTemplateVars(template.footer, vars), {
          width: doc.page.width - 84,
        });

      if (template.eSignatureEnabled ?? true) {
        this.drawElectronicSignature(
          doc,
          template,
          signatureImage,
        );
      } else {
        doc
          .moveDown(2)
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#111827')
          .text(template.signatureLabel ?? '', { align: 'right' });
      }

      doc.end();
    });
  }

  private drawElectronicSignature(
    doc: PDFKit.PDFDocument,
    template: ReleveTemplate,
    signatureImage?: Buffer,
  ) {
    if (!signatureImage) return;

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const width = pageWidth * Math.min(Math.max(template.eSignatureWidth ?? 0.24, 0.05), 1);
    const height = pageHeight * Math.min(Math.max(template.eSignatureHeight ?? 0.08, 0.03), 1);
    const x = Math.min(
      Math.max(pageWidth * (template.eSignaturePositionX ?? 0.62), 0),
      pageWidth - width,
    );
    const y = Math.min(
      Math.max(pageHeight * (template.eSignaturePositionY ?? 0.82), 0),
      pageHeight - height,
    );

    try {
      doc.image(signatureImage, x, y, {
        fit: [width, height],
        align: 'center',
        valign: 'center',
      });
    } catch {
      return;
    }
  }

  private async getActiveSignatureImageBuffer() {
    const signature = await this.getESignature();
    if (!signature) return undefined;

    try {
      return this.readStreamToBuffer(await this.storage.getObject(signature.path));
    } catch {
      return undefined;
    }
  }

  private readStreamToBuffer(stream: Readable) {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private drawGradeTable(
    doc: PDFKit.PDFDocument,
    grades: Array<
      Prisma.StudentGradeGetPayload<{
        include: {
          module: { select: { name: true } };
          elementModule: { select: { name: true; coefficient: true } };
          academicClass: { select: { name: true } };
        };
      }>
    >,
  ) {
    const startX = 42;
    const widths = [150, 140, 74, 74, 80];
    const headers = ['Module', 'Élément', 'Note', 'Rattrapage', 'Statut'];
    let y = doc.y + 8;
    const rowHeight = 22;

    const drawRow = (cells: string[], fill: string, bold = false) => {
      if (y > 728) {
        doc.addPage();
        y = 62;
      }
      let x = startX;
      doc
        .rect(
          startX,
          y,
          widths.reduce((a, b) => a + b, 0),
          rowHeight,
        )
        .fill(fill);
      cells.forEach((cell, index) => {
        doc
          .fillColor(bold ? '#111827' : '#374151')
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(8.5)
          .text(cell, x + 6, y + 7, {
            width: widths[index] - 10,
            ellipsis: true,
          });
        x += widths[index];
      });
      y += rowHeight;
    };

    drawRow(headers, '#f3f4f6', true);
    grades.forEach((grade, index) => {
      const score = `${grade.score.toFixed(2)} / ${grade.maxScore}`;
      const rattrapage =
        grade.rattrapageScore === null
          ? '-'
          : `${grade.rattrapageScore.toFixed(2)} / ${
              grade.rattrapageMaxScore ?? 20
            }`;
      drawRow(
        [
          grade.module?.name ?? grade.subject,
          grade.elementModule?.name ?? grade.subject,
          score,
          rattrapage,
          grade.publicationStatus,
        ],
        index % 2 === 0 ? '#ffffff' : '#f9fafb',
      );
    });

    doc.y = y + 4;
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
