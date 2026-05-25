import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CursusElementDto,
  CursusModuleDto,
  UpdateCursusDto,
} from './dto/update-cursus.dto';

const CURSUS_INCLUDE = {
  class: {
    include: {
      department: { select: { id: true, name: true } },
      filiere: { include: { department: { select: { id: true, name: true } } } },
      academicOption: { select: { id: true, name: true, code: true } },
    },
  },
  yearAssignments: {
    include: { academicYear: true },
    orderBy: { academicYear: { startYear: 'asc' } },
  },
  modules: {
    include: { elements: { orderBy: { name: 'asc' } } },
    orderBy: [{ semestre: 'asc' }, { name: 'asc' }],
  },
} satisfies Prisma.CursusInclude;

type Tx = Prisma.TransactionClient;

@Injectable()
export class CursusService {
  constructor(private readonly prisma: PrismaService) {}

  async getCursusForClassAndYear(classId: number, academicYearId: number) {
    await this.ensureClassAndAcademicYear(classId, academicYearId);

    const assignment = await this.prisma.cursusYearAssignment.findUnique({
      where: { classId_academicYearId: { classId, academicYearId } },
      include: { cursus: { include: CURSUS_INCLUDE }, academicYear: true },
    });

    if (assignment) return this.mapCursusResponse(assignment.cursus);

    const cursus = await this.prisma.$transaction((tx) =>
      this.createInitialCursusForYear(tx, classId, academicYearId),
    );
    return this.mapCursusResponse(cursus);
  }

  async canEditCursusDirectly(cursusId: number) {
    await this.ensureCursusExists(cursusId);
    const count = await this.prisma.cursusYearAssignment.count({
      where: { cursusId },
    });
    return count <= 1;
  }

  async duplicateCursusForYear(cursusId: number, academicYearId: number) {
    const cursus = await this.prisma.$transaction((tx) =>
      this.duplicateCursusForYearInTransaction(tx, cursusId, academicYearId),
    );
    return this.mapCursusResponse(cursus);
  }

  async updateCursusForClassAndYear(
    classId: number,
    academicYearId: number,
    dto: UpdateCursusDto,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      let assignment = await tx.cursusYearAssignment.findUnique({
        where: { classId_academicYearId: { classId, academicYearId } },
        include: { cursus: true },
      });

      if (!assignment) {
        const cursus = await this.createInitialCursusForYear(
          tx,
          classId,
          academicYearId,
        );
        assignment = await tx.cursusYearAssignment.findUnique({
          where: { classId_academicYearId: { classId, academicYearId } },
          include: { cursus: true },
        });
        if (!assignment) return cursus;
      }

      const sharedYearCount = await tx.cursusYearAssignment.count({
        where: { cursusId: assignment.cursusId },
      });

      const targetCursus =
        sharedYearCount > 1
          ? await this.duplicateCursusForYearInTransaction(
              tx,
              assignment.cursusId,
              academicYearId,
            )
          : assignment.cursus;

      await this.applyCursusUpdate(tx, targetCursus.id, dto);

      return tx.cursus.findUniqueOrThrow({
        where: { id: targetCursus.id },
        include: CURSUS_INCLUDE,
      });
    });

    return this.mapCursusResponse(updated);
  }

  private async createInitialCursusForYear(
    tx: Tx,
    classId: number,
    academicYearId: number,
  ) {
    const academicClass = await tx.academicClass.findUnique({
      where: { id: classId },
      include: {
        modules: { include: { module: { include: { elements: true } } } },
      },
    });
    if (!academicClass) throw new NotFoundException(`Class ${classId} not found`);

    const academicYear = await tx.academicYear.findUnique({
      where: { id: academicYearId },
      select: { id: true },
    });
    if (!academicYear) {
      throw new NotFoundException(`AcademicYear ${academicYearId} not found`);
    }

    const cursus = await tx.cursus.create({
      data: {
        classId,
        name: `${academicClass.name} cursus`,
      },
    });

    const moduleIds = academicClass.modules.map((item) => item.moduleId);
    if (moduleIds.length > 0) {
      await tx.module.updateMany({
        where: { id: { in: moduleIds }, cursusId: null },
        data: { cursusId: cursus.id },
      });
    }

    await tx.cursusYearAssignment.create({
      data: { classId, academicYearId, cursusId: cursus.id },
    });

    return tx.cursus.findUniqueOrThrow({
      where: { id: cursus.id },
      include: CURSUS_INCLUDE,
    });
  }

  private async duplicateCursusForYearInTransaction(
    tx: Tx,
    cursusId: number,
    academicYearId: number,
  ) {
    const source = await tx.cursus.findUnique({
      where: { id: cursusId },
      include: {
        modules: { include: { elements: true } },
        yearAssignments: true,
      },
    });
    if (!source) throw new NotFoundException(`Cursus ${cursusId} not found`);
    if (!source.classId) {
      throw new BadRequestException('Cannot duplicate a cursus without a class');
    }

    const assignment = source.yearAssignments.find(
      (item) => item.academicYearId === academicYearId,
    );
    if (!assignment) {
      throw new NotFoundException(
        `Cursus ${cursusId} is not assigned to academic year ${academicYearId}`,
      );
    }

    const duplicate = await tx.cursus.create({
      data: {
        name: source.name,
        classId: source.classId,
        version: source.version + 1,
        clonedFromId: source.id,
      },
    });

    for (const module of source.modules) {
      const createdModule = await tx.module.create({
        data: {
          name: module.name,
          semestre: module.semestre,
          filiereId: module.filiereId,
          optionId: module.optionId,
          cursusId: duplicate.id,
          classes: { create: [{ classId: source.classId }] },
        },
      });

      for (const element of module.elements) {
        await tx.elementModule.create({
          data: {
            name: element.name,
            moduleId: createdModule.id,
            classId: source.classId,
            volumeHoraire: element.volumeHoraire,
            sessionDurationMinutes: element.sessionDurationMinutes,
            type: element.type,
            ponderation: element.ponderation,
            coefficient: element.coefficient,
          },
        });
      }
    }

    await tx.cursusYearAssignment.update({
      where: {
        classId_academicYearId: {
          classId: source.classId,
          academicYearId,
        },
      },
      data: { cursusId: duplicate.id },
    });

    return tx.cursus.findUniqueOrThrow({
      where: { id: duplicate.id },
      include: CURSUS_INCLUDE,
    });
  }

  private async applyCursusUpdate(tx: Tx, cursusId: number, dto: UpdateCursusDto) {
    if (dto.name !== undefined) {
      await tx.cursus.update({
        where: { id: cursusId },
        data: { name: dto.name.trim() },
      });
    }

    if (!dto.modules) return;

    const cursus = await tx.cursus.findUniqueOrThrow({
      where: { id: cursusId },
      select: { id: true, classId: true },
    });

    for (const moduleDto of dto.modules) {
      const module = await this.upsertCursusModule(tx, cursus, moduleDto);
      for (const elementDto of moduleDto.elements ?? []) {
        await this.upsertCursusElement(tx, module.id, cursus.classId, elementDto);
      }
    }
  }

  private async upsertCursusModule(
    tx: Tx,
    cursus: { id: number; classId: number | null },
    dto: CursusModuleDto,
  ) {
    if (dto.id) {
      const existing = await tx.module.findFirst({
        where: { id: dto.id, cursusId: cursus.id },
        select: { id: true },
      });
      if (!existing) {
        throw new BadRequestException('Module does not belong to this cursus');
      }
      return tx.module.update({
        where: { id: dto.id },
        data: {
          name: dto.name.trim(),
          semestre: dto.semestre ?? null,
        },
      });
    }

    return tx.module.create({
      data: {
        name: dto.name.trim(),
        semestre: dto.semestre ?? null,
        cursusId: cursus.id,
        ...(cursus.classId
          ? { classes: { create: [{ classId: cursus.classId }] } }
          : {}),
      },
    });
  }

  private async upsertCursusElement(
    tx: Tx,
    moduleId: number,
    classId: number | null,
    dto: CursusElementDto,
  ) {
    if (dto.id) {
      const existing = await tx.elementModule.findFirst({
        where: { id: dto.id, moduleId },
        select: { id: true },
      });
      if (!existing) {
        throw new BadRequestException('Element does not belong to this module');
      }
      return tx.elementModule.update({
        where: { id: dto.id },
        data: this.mapElementData(dto),
      });
    }

    return tx.elementModule.create({
      data: {
        ...this.mapElementData(dto),
        moduleId,
        classId,
      },
    });
  }

  private mapElementData(dto: CursusElementDto) {
    return {
      name: dto.name.trim(),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.volumeHoraire !== undefined
        ? { volumeHoraire: dto.volumeHoraire ?? null }
        : {}),
      ...(dto.sessionDurationMinutes !== undefined
        ? { sessionDurationMinutes: dto.sessionDurationMinutes ?? null }
        : {}),
      ...(dto.ponderation !== undefined ? { ponderation: dto.ponderation } : {}),
    };
  }

  private async ensureClassAndAcademicYear(
    classId: number,
    academicYearId: number,
  ) {
    const [academicClass, academicYear] = await Promise.all([
      this.prisma.academicClass.findUnique({
        where: { id: classId },
        select: { id: true },
      }),
      this.prisma.academicYear.findUnique({
        where: { id: academicYearId },
        select: { id: true },
      }),
    ]);
    if (!academicClass) throw new NotFoundException(`Class ${classId} not found`);
    if (!academicYear) {
      throw new NotFoundException(`AcademicYear ${academicYearId} not found`);
    }
  }

  private async ensureCursusExists(cursusId: number) {
    const cursus = await this.prisma.cursus.findUnique({
      where: { id: cursusId },
      select: { id: true },
    });
    if (!cursus) throw new NotFoundException(`Cursus ${cursusId} not found`);
  }

  private async mapCursusResponse<T extends { id: number }>(cursus: T) {
    const sharedYearCount = await this.prisma.cursusYearAssignment.count({
      where: { cursusId: cursus.id },
    });
    return {
      ...cursus,
      sharedYearCount,
      canEditDirectly: sharedYearCount <= 1,
    };
  }
}
