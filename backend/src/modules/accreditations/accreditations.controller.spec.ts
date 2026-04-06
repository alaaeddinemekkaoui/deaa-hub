import { Test, TestingModule } from '@nestjs/testing';
import { AccreditationsController } from './accreditations.controller';
import { AccreditationsService } from './accreditations.service';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';

describe('AccreditationsController', () => {
  let controller: AccreditationsController;
  let service: AccreditationsService;

  const mockService = {
    findPlans: jest.fn(),
    findPlan: jest.fn(),
    createPlan: jest.fn(),
    updatePlan: jest.fn(),
    createLine: jest.fn(),
    removeLine: jest.fn(),
    diffWithSource: jest.fn(),
    assignPlanToClassYear: jest.fn(),
    findClassAssignments: jest.fn(),
    transferClassAssignment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccreditationsController],
      providers: [
        {
          provide: AccreditationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AccreditationsController>(
      AccreditationsController,
    );
    service = module.get<AccreditationsService>(AccreditationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /accreditations/classes/:classId/assignments/transfer', () => {
    it('should transfer class assignment successfully', async () => {
      const classId = 3;
      const transferDto = {
        fromAcademicYear: '2025-2026',
        toAcademicYear: '2026-2027',
      };
      const expectedResult = {
        id: 501,
        class: { id: 3, name: 'APESA 1', year: 1 },
        plan: {
          id: 11,
          name: 'APESA 1 Plan (2026-2027)',
          academicYear: '2026-2027',
          status: 'draft',
          sourcePlanId: 10,
        },
      };

      mockService.transferClassAssignment.mockResolvedValue(expectedResult);

      const result = await controller.transferClassAssignment(
        classId,
        transferDto,
      );

      expect(result).toEqual(expectedResult);
      expect(service.transferClassAssignment).toHaveBeenCalledWith(
        classId,
        transferDto,
      );
      expect(service.transferClassAssignment).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for identical years', async () => {
      const classId = 3;
      const transferDto = {
        fromAcademicYear: '2026-2027',
        toAcademicYear: '2026-2027',
      };

      mockService.transferClassAssignment.mockRejectedValue(
        new BadRequestException(
          'Source and target academic years must be different',
        ),
      );

      await expect(
        controller.transferClassAssignment(classId, transferDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should throw NotFoundException for missing source assignment', async () => {
      const classId = 3;
      const transferDto = {
        fromAcademicYear: '2025-2026',
        toAcademicYear: '2026-2027',
      };

      mockService.transferClassAssignment.mockRejectedValue(
        new NotFoundException(
          'No class accreditation assignment found for year 2025-2026',
        ),
      );

      await expect(
        controller.transferClassAssignment(classId, transferDto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw ConflictException for existing target assignment', async () => {
      const classId = 3;
      const transferDto = {
        fromAcademicYear: '2025-2026',
        toAcademicYear: '2026-2027',
      };

      mockService.transferClassAssignment.mockRejectedValue(
        new ConflictException(
          'Class already has an accreditation assignment for 2026-2027',
        ),
      );

      await expect(
        controller.transferClassAssignment(classId, transferDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should preserve source plan lines during transfer', async () => {
      const classId = 3;
      const transferDto = {
        fromAcademicYear: '2025-2026',
        toAcademicYear: '2026-2027',
      };
      const expectedResult = {
        id: 501,
        class: { id: 3, name: 'APESA 1', year: 1 },
        plan: {
          id: 11,
          name: 'APESA 1 Plan (2026-2027)',
          academicYear: '2026-2027',
          status: 'draft',
          sourcePlanId: 10,
          _count: { lines: 5 },
        },
      };

      mockService.transferClassAssignment.mockResolvedValue(expectedResult);

      const result = await controller.transferClassAssignment(
        classId,
        transferDto,
      );

      expect(result.plan._count.lines).toBe(5);
      expect(result.plan.sourcePlanId).toBe(10);
    });

    it('should handle custom target plan name', async () => {
      const classId = 3;
      const transferDto = {
        fromAcademicYear: '2025-2026',
        toAcademicYear: '2026-2027',
        targetPlanName: 'Custom Plan Name',
      };
      const expectedResult = {
        id: 501,
        class: { id: 3, name: 'APESA 1', year: 1 },
        plan: {
          id: 11,
          name: 'Custom Plan Name',
          academicYear: '2026-2027',
          status: 'draft',
          sourcePlanId: 10,
        },
      };

      mockService.transferClassAssignment.mockResolvedValue(expectedResult);

      const result = await controller.transferClassAssignment(
        classId,
        transferDto,
      );

      expect(result.plan.name).toBe('Custom Plan Name');
      expect(service.transferClassAssignment).toHaveBeenCalledWith(
        classId,
        transferDto,
      );
    });
  });

  describe('GET /accreditations/classes/:classId/assignments', () => {
    it('should return all class assignments ordered by academic year (desc)', async () => {
      const classId = 3;
      const expectedAssignments = [
        {
          id: 501,
          classId: 3,
          academicYear: '2026-2027',
          planId: 11,
          plan: {
            id: 11,
            name: 'APESA 1 Plan (2026-2027)',
            academicYear: '2026-2027',
            status: 'draft',
            _count: { lines: 5 },
          },
        },
        {
          id: 500,
          classId: 3,
          academicYear: '2025-2026',
          planId: 10,
          plan: {
            id: 10,
            name: 'APESA 1 Plan',
            academicYear: '2025-2026',
            status: 'published',
            _count: { lines: 5 },
          },
        },
      ];

      mockService.findClassAssignments.mockResolvedValue(expectedAssignments);

      const result = await controller.findClassAssignments(classId);

      expect(result).toEqual(expectedAssignments);
      expect(service.findClassAssignments).toHaveBeenCalledWith(classId);
    });

    it('should throw NotFoundException for non-existent class', async () => {
      const classId = 999;

      mockService.findClassAssignments.mockRejectedValue(
        new NotFoundException(`Class ${classId} not found`),
      );

      await expect(
        controller.findClassAssignments(classId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('POST /accreditations/plans/:id/assignments', () => {
    it('should assign plan to class year', async () => {
      const planId = 10;
      const assignDto = {
        classId: 3,
        academicYear: '2025-2026',
      };
      const expectedResult = {
        id: 500,
        classId: 3,
        academicYear: '2025-2026',
        planId: 10,
        class: { id: 3, name: 'APESA 1', year: 1 },
        plan: {
          id: 10,
          name: 'APESA 1 Plan',
          academicYear: '2025-2026',
          status: 'published',
        },
      };

      mockService.assignPlanToClassYear.mockResolvedValue(expectedResult);

      const result = await controller.assignPlanToClassYear(
        planId,
        assignDto,
      );

      expect(result).toEqual(expectedResult);
      expect(service.assignPlanToClassYear).toHaveBeenCalledWith(
        planId,
        assignDto,
      );
    });

    it('should upsert (update) existing assignment', async () => {
      const planId = 11;
      const assignDto = {
        classId: 3,
        academicYear: '2025-2026',
      };
      const expectedResult = {
        id: 500,
        classId: 3,
        academicYear: '2025-2026',
        planId: 11,
        class: { id: 3, name: 'APESA 1', year: 1 },
        plan: {
          id: 11,
          name: 'APESA 1 Plan (Revised)',
          academicYear: '2025-2026',
          status: 'draft',
        },
      };

      mockService.assignPlanToClassYear.mockResolvedValue(expectedResult);

      const result = await controller.assignPlanToClassYear(
        planId,
        assignDto,
      );

      expect(result).toEqual(expectedResult);
      expect(result.planId).toBe(11);
    });
  });
});
