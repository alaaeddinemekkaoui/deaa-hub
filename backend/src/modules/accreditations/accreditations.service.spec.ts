import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AccreditationsService } from './accreditations.service';

describe('AccreditationsService', () => {
  const prisma = {
    academicClass: {
      findUnique: jest.fn(),
    },
    classAccreditationAssignment: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    accreditationPlan: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    accreditationPlanLine: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const tx = {
    accreditationPlan: {
      findFirst: prisma.accreditationPlan.findFirst,
      create: prisma.accreditationPlan.create,
    },
    accreditationPlanLine: {
      createMany: prisma.accreditationPlanLine.createMany,
    },
    classAccreditationAssignment: {
      create: prisma.classAccreditationAssignment.create,
    },
  };

  let service: AccreditationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx));
    service = new AccreditationsService(prisma as never);
  });

  it('transfers class assignment to next year and clones source plan lines', async () => {
    prisma.academicClass.findUnique.mockResolvedValue({ id: 3 });
    prisma.classAccreditationAssignment.findUnique
      .mockResolvedValueOnce({
        classId: 3,
        academicYear: '2025-2026',
        planId: 10,
        plan: {
          id: 10,
          name: 'APESA 1 Plan',
          academicYear: '2025-2026',
          levelYear: 1,
          filiereId: 5,
          optionId: null,
          cycleId: 2,
          lines: [
            {
              id: 100,
              coursId: 200,
              moduleId: 20,
              elementId: 30,
              semestre: 'S1',
              volumeHoraire: 24,
              isMandatory: true,
            },
          ],
        },
      })
      .mockResolvedValueOnce(null);

    prisma.accreditationPlan.findFirst.mockResolvedValue(null);
    prisma.accreditationPlan.create.mockResolvedValue({
      id: 11,
      name: 'APESA 1 Plan (2026-2027)',
      academicYear: '2026-2027',
    });
    prisma.accreditationPlanLine.createMany.mockResolvedValue({ count: 1 });
    prisma.classAccreditationAssignment.create.mockResolvedValue({
      id: 501,
      class: { id: 3, name: 'APESA 1', year: 1 },
      plan: {
        id: 11,
        name: 'APESA 1 Plan (2026-2027)',
        academicYear: '2026-2027',
        status: 'draft',
        sourcePlanId: 10,
      },
    });

    const result = await service.transferClassAssignment(3, {
      fromAcademicYear: '2025-2026',
      toAcademicYear: '2026-2027',
    });

    expect(prisma.accreditationPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourcePlanId: 10,
          academicYear: '2026-2027',
        }),
      }),
    );
    expect(prisma.accreditationPlanLine.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            planId: 11,
            coursId: 200,
            originLineId: 100,
          }),
        ],
      }),
    );
    expect(prisma.classAccreditationAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          classId: 3,
          academicYear: '2026-2027',
          planId: 11,
        },
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 501,
        plan: expect.objectContaining({ id: 11 }),
      }),
    );
  });

  it('throws when source and target years are identical', async () => {
    prisma.academicClass.findUnique.mockResolvedValue({ id: 3 });

    await expect(
      service.transferClassAssignment(3, {
        fromAcademicYear: '2026-2027',
        toAcademicYear: '2026-2027',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when source assignment does not exist', async () => {
    prisma.academicClass.findUnique.mockResolvedValue({ id: 3 });
    prisma.classAccreditationAssignment.findUnique.mockResolvedValue(null);

    await expect(
      service.transferClassAssignment(3, {
        fromAcademicYear: '2025-2026',
        toAcademicYear: '2026-2027',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when target year assignment already exists', async () => {
    prisma.academicClass.findUnique.mockResolvedValue({ id: 3 });
    prisma.classAccreditationAssignment.findUnique
      .mockResolvedValueOnce({
        classId: 3,
        academicYear: '2025-2026',
        planId: 10,
        plan: {
          id: 10,
          name: 'APESA 1 Plan',
          academicYear: '2025-2026',
          levelYear: 1,
          filiereId: 5,
          optionId: null,
          cycleId: 2,
          lines: [],
        },
      })
      .mockResolvedValueOnce({
        id: 900,
        plan: { id: 88, name: 'Existing target plan', academicYear: '2026-2027' },
      });

    await expect(
      service.transferClassAssignment(3, {
        fromAcademicYear: '2025-2026',
        toAcademicYear: '2026-2027',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
