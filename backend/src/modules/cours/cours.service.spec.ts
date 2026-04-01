import { NotFoundException } from '@nestjs/common';
import { CoursService } from './cours.service';

describe('CoursService', () => {
  let service: CoursService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      cours: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      academicClass: {
        findUnique: jest.fn(),
      },
      teacher: {
        findUnique: jest.fn(),
      },
      coursClass: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      elementModule: {
        findMany: jest.fn(),
      },
    };

    service = new CoursService(prisma);
  });

  it('assignToClass should create one row per teacher when teacherIds are provided', async () => {
    prisma.cours.findUnique.mockResolvedValue({ id: 10 });
    prisma.academicClass.findUnique.mockResolvedValue({ id: 20 });
    prisma.teacher.findUnique
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 });
    prisma.coursClass.findFirst.mockResolvedValue(null);
    prisma.coursClass.create.mockResolvedValue({});
    prisma.coursClass.findMany.mockResolvedValue([
      { id: 1, coursId: 10, classId: 20, teacherId: 1 },
      { id: 2, coursId: 10, classId: 20, teacherId: 2 },
    ]);

    const result = await service.assignToClass(10, {
      classId: 20,
      teacherIds: [1, 2],
      groupLabel: 'Group A',
    });

    expect(prisma.coursClass.create).toHaveBeenCalledTimes(2);
    expect(prisma.coursClass.create).toHaveBeenNthCalledWith(1, {
      data: { coursId: 10, classId: 20, teacherId: 1, groupLabel: 'Group A' },
    });
    expect(prisma.coursClass.create).toHaveBeenNthCalledWith(2, {
      data: { coursId: 10, classId: 20, teacherId: 2, groupLabel: 'Group A' },
    });
    expect(result).toHaveLength(2);
  });

  it('assignToClass should update existing unassigned row when no teacher is provided', async () => {
    prisma.cours.findUnique.mockResolvedValue({ id: 10 });
    prisma.academicClass.findUnique.mockResolvedValue({ id: 20 });
    prisma.coursClass.findFirst.mockResolvedValue({ id: 555 });
    prisma.coursClass.update.mockResolvedValue({ id: 555, groupLabel: 'TP-A' });

    const result = await service.assignToClass(10, {
      classId: 20,
      groupLabel: 'TP-A',
    });

    expect(prisma.coursClass.update).toHaveBeenCalledWith({
      where: { id: 555 },
      data: { groupLabel: 'TP-A' },
      include: {
        class: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    expect(prisma.coursClass.create).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 555, groupLabel: 'TP-A' });
  });

  it('assignToClass should deduplicate duplicate teacherIds', async () => {
    prisma.cours.findUnique.mockResolvedValue({ id: 10 });
    prisma.academicClass.findUnique.mockResolvedValue({ id: 20 });
    prisma.teacher.findUnique
      .mockResolvedValueOnce({ id: 1 })
      .mockResolvedValueOnce({ id: 2 });
    prisma.coursClass.findFirst.mockResolvedValue(null);
    prisma.coursClass.create.mockResolvedValue({});
    prisma.coursClass.findMany.mockResolvedValue([]);

    await service.assignToClass(10, {
      classId: 20,
      teacherIds: [1, 1, 2],
      groupLabel: 'TD',
    });

    expect(prisma.coursClass.create).toHaveBeenCalledTimes(2);
    expect(prisma.teacher.findUnique).toHaveBeenCalledTimes(2);
  });

  it('assignToClass should fallback to teacherId when teacherIds is not provided', async () => {
    prisma.cours.findUnique.mockResolvedValue({ id: 10 });
    prisma.academicClass.findUnique.mockResolvedValue({ id: 20 });
    prisma.teacher.findUnique.mockResolvedValue({ id: 9 });
    prisma.coursClass.findFirst.mockResolvedValue(null);
    prisma.coursClass.create.mockResolvedValue({});
    prisma.coursClass.findMany.mockResolvedValue([{ id: 1 }]);

    await service.assignToClass(10, {
      classId: 20,
      teacherId: 9,
      groupLabel: 'CM',
    });

    expect(prisma.coursClass.create).toHaveBeenCalledWith({
      data: { coursId: 10, classId: 20, teacherId: 9, groupLabel: 'CM' },
    });
  });

  it('removeFromClass should remove only targeted teacher assignment when teacherId is provided', async () => {
    prisma.coursClass.findFirst.mockResolvedValue({ id: 99 });
    prisma.coursClass.delete.mockResolvedValue({ id: 99 });

    const result = await service.removeFromClass(10, 20, 3);

    expect(prisma.coursClass.delete).toHaveBeenCalledWith({ where: { id: 99 } });
    expect(prisma.coursClass.deleteMany).not.toHaveBeenCalled();
    expect(result).toEqual({ id: 99 });
  });

  it('removeFromClass should remove all class assignments when teacherId is omitted', async () => {
    prisma.coursClass.findFirst.mockResolvedValue({ id: 100 });
    prisma.coursClass.deleteMany.mockResolvedValue({ count: 2 });

    const result = await service.removeFromClass(10, 20);

    expect(prisma.coursClass.deleteMany).toHaveBeenCalledWith({
      where: { coursId: 10, classId: 20 },
    });
    expect(result).toEqual({ count: 2 });
  });

  it('removeFromClass should throw when assignment does not exist', async () => {
    prisma.coursClass.findFirst.mockResolvedValue(null);

    await expect(service.removeFromClass(10, 20, 3)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.coursClass.delete).not.toHaveBeenCalled();
    expect(prisma.coursClass.deleteMany).not.toHaveBeenCalled();
  });

  it('importFromClass should link existing cours by name and create class assignment if missing', async () => {
    prisma.academicClass.findUnique.mockResolvedValue({ id: 20, filiereId: 8 });
    prisma.elementModule.findMany.mockResolvedValue([
      { id: 500, name: 'Biostatistiques — CM', cours: null },
    ]);
    prisma.cours.findFirst.mockResolvedValue({ id: 600, elementModuleId: null });
    prisma.cours.update.mockResolvedValue({ id: 600, elementModuleId: 500 });
    prisma.coursClass.findFirst.mockResolvedValue(null);
    prisma.coursClass.create.mockResolvedValue({ id: 700 });

    const result = await service.importFromClass(20);

    expect(prisma.cours.create).not.toHaveBeenCalled();
    expect(prisma.cours.update).toHaveBeenCalledWith({
      where: { id: 600 },
      data: { elementModuleId: 500 },
    });
    expect(prisma.coursClass.create).toHaveBeenCalledWith({
      data: { coursId: 600, classId: 20, teacherId: null },
    });
    expect(result).toEqual({ created: 0, existing: 1, total: 1 });
  });

  it('importFromClass should throw when class does not exist', async () => {
    prisma.academicClass.findUnique.mockResolvedValue(null);

    await expect(service.importFromClass(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('importFromClass should avoid duplicate class assignment when unassigned row already exists', async () => {
    prisma.academicClass.findUnique.mockResolvedValue({ id: 20, filiereId: 8 });
    prisma.elementModule.findMany.mockResolvedValue([
      { id: 500, name: 'Cours Existant', cours: { id: 601 } },
    ]);
    prisma.coursClass.findFirst.mockResolvedValue({ id: 701 });

    const result = await service.importFromClass(20);

    expect(prisma.coursClass.create).not.toHaveBeenCalled();
    expect(result).toEqual({ created: 0, existing: 1, total: 1 });
  });
});
