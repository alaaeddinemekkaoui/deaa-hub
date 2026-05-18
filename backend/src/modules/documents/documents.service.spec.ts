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
});
