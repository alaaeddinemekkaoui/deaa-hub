import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClassesService } from './classes.service';

describe('ClassesService academic structure', () => {
  let service: ClassesService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      academicClass: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn(),
      },
      classGroup: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new ClassesService(prisma);
  });

  it('creates groups under a class', async () => {
    prisma.academicClass.findUnique.mockResolvedValue({
      departmentId: 4,
      filiere: { departmentId: 4 },
    });
    prisma.classGroup.create.mockResolvedValue({
      id: 1,
      classId: 10,
      name: 'TP A',
      type: 'TP',
    });

    const result = await service.createGroup(10, { name: 'TP A', type: 'TP' });

    expect(prisma.classGroup.create).toHaveBeenCalledWith({
      data: { classId: 10, name: 'TP A', type: 'TP' },
    });
    expect(result.name).toBe('TP A');
  });

  it('surfaces duplicate class group names as a conflict', async () => {
    prisma.academicClass.findUnique.mockResolvedValue({
      departmentId: 4,
      filiere: { departmentId: 4 },
    });
    prisma.classGroup.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Duplicate', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.createGroup(10, { name: 'TD 1', type: 'TD' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('filters classes by direct department or filiere department', async () => {
    await service.findAll({
      page: 1,
      limit: 25,
      departmentId: 3,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(prisma.academicClass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { departmentId: 3 },
                { filiere: { is: { departmentId: 3 } } },
              ],
            },
          ],
        },
      }),
    );
  });
});
