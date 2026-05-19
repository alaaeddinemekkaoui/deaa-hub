import { DocumentsService } from './documents.service';
import { UserRole } from '../../common/types/role.type';

describe('DocumentsService', () => {
  it('uploads student documents through object storage and keeps metadata in PostgreSQL', async () => {
    const prisma = {
      student: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 7, codeMassar: 'M123', userId: 99 }),
      },
      document: {
        create: jest.fn().mockResolvedValue({
          id: 11,
          name: 'attestation.pdf',
          path: 'minio://deaa-original-documents/students/m123/attestation.pdf',
        }),
      },
      activityLog: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    } as any;
    const storage = {
      uploadBuffer: jest.fn().mockResolvedValue({
        bucket: 'deaa-original-documents',
        key: 'students/m123/attestation.pdf',
        reference:
          'minio://deaa-original-documents/students/m123/attestation.pdf',
        hash: 'sha256',
        size: 9,
      }),
    } as any;

    const service = new DocumentsService(prisma, storage);
    const file = {
      originalname: 'attestation.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF-test'),
      size: 9,
    } as Express.Multer.File;

    const result = await service.create({ studentId: 7 }, file, {
      sub: 99,
      email: 'student@example.com',
      role: UserRole.STUDENT,
      departmentIds: [],
    });

    expect(storage.uploadBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        bucketName: 'originalDocuments',
        folder: 'students/M123',
      }),
    );
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        path: 'minio://deaa-original-documents/students/m123/attestation.pdf',
        storageProvider: 'minio',
        bucket: 'deaa-original-documents',
        objectKey: 'students/m123/attestation.pdf',
        fileHash: 'sha256',
        size: 9,
      }),
    });
    expect(prisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 99, action: 'document.upload' }),
    });
    expect(result.id).toBe(11);
  });

  it('generates a student releve PDF and stores it through object storage', async () => {
    const prisma = {
      student: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          fullName: 'Aya Rahmani',
          codeMassar: 'M123',
          codeEtudiant: 'E123',
          anneeAcademique: '2025/2026',
          userId: 99,
          academicClass: {
            id: 3,
            name: 'Agronomie 1A',
            academicYear: '2025/2026',
          },
          filiere: { id: 2, name: 'Agronomie', code: 'AGR' },
        }),
      },
      documentTemplate: {
        findUnique: jest.fn().mockResolvedValue({
          id: 4,
          name: 'Relevé officiel',
          type: 'releve_note',
          header: 'DEAA Hub\nRelevé de notes',
          body: 'Relevé pour {{studentName}} en {{academicYear}}.',
          footer: 'Moyenne: {{average}}',
          primaryColor: '#0f766e',
          signatureLabel: 'Direction',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      studentGrade: {
        findMany: jest.fn().mockResolvedValue([
          {
            score: 16,
            maxScore: 20,
            rattrapageScore: null,
            rattrapageMaxScore: null,
            academicYear: '2025/2026',
            semester: 'S1',
            subject: 'Biologie',
            publicationStatus: 'draft',
            module: { name: 'Sciences du vivant' },
            elementModule: { name: 'Biologie', coefficient: 1 },
            academicClass: { name: 'Agronomie 1A' },
          },
        ]),
      },
      document: {
        create: jest.fn().mockResolvedValue({
          id: 22,
          name: 'releve-de-notes-aya-rahmani.pdf',
          path: 'minio://deaa-signed-documents/generated/releves/M123/releve.pdf',
        }),
      },
      activityLog: { create: jest.fn().mockResolvedValue({ id: 1 }) },
    } as any;
    const storage = {
      uploadBuffer: jest.fn().mockResolvedValue({
        bucket: 'deaa-signed-documents',
        key: 'generated/releves/M123/releve.pdf',
        reference:
          'minio://deaa-signed-documents/generated/releves/M123/releve.pdf',
        hash: 'sha256',
        size: 512,
      }),
    } as any;

    const service = new DocumentsService(prisma, storage);
    const result = await service.generateStudentRelevePdf(
      7,
      { templateId: 4 },
      {
        sub: 99,
        email: 'student@example.com',
        role: UserRole.STUDENT,
        departmentIds: [],
      },
    );

    expect(storage.uploadBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        bucketName: 'signedDocuments',
        mimeType: 'application/pdf',
        folder: 'generated/releves/M123',
        buffer: expect.any(Buffer),
      }),
    );
    const uploaded = storage.uploadBuffer.mock.calls[0][0].buffer as Buffer;
    expect(uploaded.subarray(0, 5).toString()).toBe('%PDF-');
    expect(prisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        storageProvider: 'minio',
        studentId: 7,
        category: 'Relevé de notes généré',
      }),
    });
    expect(result.id).toBe(22);
  });
});
