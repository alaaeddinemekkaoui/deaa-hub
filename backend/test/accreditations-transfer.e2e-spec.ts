import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { AccreditationsService } from '../src/modules/accreditations/accreditations.service';

describe('Accreditations Transfer (e2e)', () => {
  let app: INestApplication<App>;
  const mockAccreditationsService = {
    transferClassAssignment: jest.fn((classId: number, dto: { fromAcademicYear: string; toAcademicYear: string; targetPlanName?: string }) => {
      if (dto.fromAcademicYear === dto.toAcademicYear) {
        throw new BadRequestException('Source and target academic years must be different');
      }

      if (classId === 999999) {
        throw new NotFoundException('Class not found');
      }

      if (classId === 888888) {
        throw new ConflictException('Target academic year already has an assignment');
      }

      const normalizedName = dto.targetPlanName?.trim() || 'APESA 1 Plan (Transferred)';

      return {
        id: 501,
        classId,
        academicYear: dto.toAcademicYear,
        planId: 1001,
        class: { id: classId, name: 'Class A', code: 'A1' },
        plan: {
          id: 1001,
          name: normalizedName,
          academicYear: dto.toAcademicYear,
          sourcePlanId: 10,
          status: 'draft',
          _count: { lines: 4 },
        },
      };
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(AccreditationsService)
      .useValue(mockAccreditationsService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /accreditations/classes/:classId/assignments/transfer', () => {
    it('should return 400 Bad Request for identical years', () => {
      return request(app.getHttpServer())
        .post('/accreditations/classes/1/assignments/transfer')
        .send({
          fromAcademicYear: '2025-2026',
          toAcademicYear: '2025-2026',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 Bad Request for missing required fields', () => {
      return request(app.getHttpServer())
        .post('/accreditations/classes/1/assignments/transfer')
        .send({
          fromAcademicYear: '2025-2026',
          // Missing toAcademicYear
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 404 Not Found for non-existent class', () => {
      return request(app.getHttpServer())
        .post('/accreditations/classes/999999/assignments/transfer')
        .send({
          fromAcademicYear: '2025-2026',
          toAcademicYear: '2026-2027',
        })
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toContain('not found');
        });
    });

    it('should return 404 Not Found for missing source assignment', () => {
      mockAccreditationsService.transferClassAssignment.mockImplementationOnce(
        () => {
          throw new NotFoundException('Source assignment not found for class 1 in 2024-2025');
        },
      );

      return request(app.getHttpServer())
        .post('/accreditations/classes/1/assignments/transfer')
        .send({
          fromAcademicYear: '2024-2025', // Non-existent
          toAcademicYear: '2025-2026',
        })
        .expect(HttpStatus.NOT_FOUND)
        .expect((res) => {
          expect(res.body.message).toContain('assignment');
        });
    });

    it('should return 409 Conflict for existing target assignment', () => {
      return request(app.getHttpServer())
        .post('/accreditations/classes/888888/assignments/transfer')
        .send({
          fromAcademicYear: '2024-2025',
          toAcademicYear: '2025-2026', // Already exists
        })
        .expect(HttpStatus.CONFLICT)
        .expect((res) => {
          expect(res.body.message).toContain('already has');
        });
    });

    it('should accept custom targetPlanName', () => {
      return request(app.getHttpServer())
        .post('/accreditations/classes/1/assignments/transfer')
        .send({
          fromAcademicYear: '2025-2026',
          toAcademicYear: '2026-2027',
          targetPlanName: '  Custom Plan Name  ',
        })
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.plan.name).toBe('Custom Plan Name');
        });
    });

    it('should return 201 Created with transferred assignment', () => {
      return request(app.getHttpServer())
        .post('/accreditations/classes/1/assignments/transfer')
        .send({
          fromAcademicYear: '2025-2026',
          toAcademicYear: '2026-2027',
        })
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('class');
          expect(res.body).toHaveProperty('plan');
          expect(res.body.plan.academicYear).toBe('2026-2027');
          expect(res.body.plan.sourcePlanId).toBeDefined();
          expect(res.body.plan.status).toBe('draft');
        });
    });

    it('should preserve line count metadata in success response', () => {
      return request(app.getHttpServer())
        .post('/accreditations/classes/1/assignments/transfer')
        .send({
          fromAcademicYear: '2025-2026',
          toAcademicYear: '2027-2028',
        })
        .expect(HttpStatus.CREATED)
        .expect((res) => {
          expect(res.body.plan._count.lines).toBe(4);
        });
    });
  });
});
