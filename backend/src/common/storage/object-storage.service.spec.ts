import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ObjectStorageService } from './object-storage.service';

describe('ObjectStorageService', () => {
  it('builds and parses MinIO object references without exposing credentials', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ObjectStorageService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    const service = moduleRef.get(ObjectStorageService);
    const reference = service.objectReference(
      'deaa-original-documents',
      'students/a/file.pdf',
    );

    expect(reference).toBe(
      'minio://deaa-original-documents/students/a/file.pdf',
    );
    expect(service.parseReference(reference)).toEqual({
      bucket: 'deaa-original-documents',
      key: 'students/a/file.pdf',
    });
    await expect(service.healthCheck()).resolves.toBe(false);
  });
});
