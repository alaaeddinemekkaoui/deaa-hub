import { CursusService } from './cursus.service';

describe('CursusService', () => {
  let service: CursusService;
  let prisma: any;
  let tx: any;

  beforeEach(() => {
    tx = {
      cursusYearAssignment: {
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      cursus: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      academicClass: { findUnique: jest.fn() },
      academicYear: { findUnique: jest.fn() },
      module: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      elementModule: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      cursusYearAssignment: { count: jest.fn() },
      cursus: { findUnique: jest.fn() },
      academicClass: { findUnique: jest.fn() },
      academicYear: { findUnique: jest.fn() },
    };
    service = new CursusService(prisma);
  });

  it('updates the same cursus when it is linked to one academic year', async () => {
    tx.cursusYearAssignment.findUnique.mockResolvedValue({
      cursusId: 10,
      cursus: { id: 10 },
    });
    tx.cursusYearAssignment.count.mockResolvedValue(1);
    tx.cursus.update.mockResolvedValue({ id: 10 });
    tx.cursus.findUniqueOrThrow.mockResolvedValue({
      id: 10,
      name: 'Cursus direct',
      version: 1,
      modules: [],
      yearAssignments: [],
    });
    prisma.cursusYearAssignment.count.mockResolvedValue(1);

    const result = await service.updateCursusForClassAndYear(1, 2026, {
      name: 'Cursus direct',
    });

    expect(tx.cursus.create).not.toHaveBeenCalled();
    expect(tx.cursusYearAssignment.update).not.toHaveBeenCalled();
    expect(tx.cursus.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { name: 'Cursus direct' },
    });
    expect(result.canEditDirectly).toBe(true);
  });

  it('duplicates then reassigns only the selected year when the cursus is shared', async () => {
    tx.cursusYearAssignment.findUnique.mockResolvedValue({
      cursusId: 10,
      cursus: { id: 10 },
    });
    tx.cursusYearAssignment.count.mockResolvedValue(3);
    tx.cursus.findUnique.mockResolvedValue({
      id: 10,
      name: 'Shared cursus',
      classId: 1,
      version: 1,
      modules: [],
      yearAssignments: [
        { classId: 1, academicYearId: 2024 },
        { classId: 1, academicYearId: 2025 },
        { classId: 1, academicYearId: 2026 },
      ],
    });
    tx.cursus.create.mockResolvedValue({ id: 20 });
    tx.cursus.findUniqueOrThrow
      .mockResolvedValueOnce({
        id: 20,
        name: 'Shared cursus',
        version: 2,
        modules: [],
        yearAssignments: [],
      })
      .mockResolvedValueOnce({
        id: 20,
        name: 'Cursus 2026',
        version: 2,
        modules: [],
        yearAssignments: [],
      });
    prisma.cursusYearAssignment.count.mockResolvedValue(1);

    await service.updateCursusForClassAndYear(1, 2026, {
      name: 'Cursus 2026',
    });

    expect(tx.cursus.create).toHaveBeenCalledWith({
      data: {
        name: 'Shared cursus',
        classId: 1,
        version: 2,
        clonedFromId: 10,
      },
    });
    expect(tx.cursusYearAssignment.update).toHaveBeenCalledWith({
      where: { classId_academicYearId: { classId: 1, academicYearId: 2026 } },
      data: { cursusId: 20 },
    });
    expect(tx.cursus.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { name: 'Cursus 2026' },
    });
  });
});
