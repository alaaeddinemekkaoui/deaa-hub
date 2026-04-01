import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccreditationPlanStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AccreditationPlanQueryDto } from './dto/accreditation-plan-query.dto';
import { CreateAccreditationPlanDto } from './dto/create-accreditation-plan.dto';
import { UpdateAccreditationPlanDto } from './dto/update-accreditation-plan.dto';
import { CreateAccreditationLineDto } from './dto/create-accreditation-line.dto';
import { AssignClassAccreditationDto } from './dto/assign-class-accreditation.dto';

@Injectable()
export class AccreditationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPlans(query: AccreditationPlanQueryDto) {
    const {
      page,
      limit,
      search,
      academicYear,
      filiereId,
      sortBy,
      sortOrder,
    } = query;

    const filters: Prisma.AccreditationPlanWhereInput[] = [];

    if (search) {
      filters.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { academicYear: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (academicYear) {
      filters.push({ academicYear });
    }

    if (filiereId) {
      filters.push({ filiereId });
    }

    const where: Prisma.AccreditationPlanWhereInput =
      filters.length > 0 ? { AND: filters } : {};

    const [data, total] = await Promise.all([
      this.prisma.accreditationPlan.findMany({
        where,
        include: {
          filiere: { select: { id: true, name: true } },
          option: { select: { id: true, name: true } },
          cycle: { select: { id: true, name: true } },
          _count: {
            select: {
              lines: true,
              classAssignments: true,
              derivedPlans: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.accreditationPlan.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findPlan(id: number) {
    const plan = await this.prisma.accreditationPlan.findUnique({
      where: { id },
      include: {
        filiere: { select: { id: true, name: true } },
        option: { select: { id: true, name: true } },
        cycle: { select: { id: true, name: true } },
        sourcePlan: { select: { id: true, name: true, academicYear: true } },
        lines: {
          include: {
            cours: { select: { id: true, name: true, type: true } },
            module: { select: { id: true, name: true } },
            element: { select: { id: true, name: true, type: true } },
            originLine: { select: { id: true } },
          },
          orderBy: [{ semestre: 'asc' }, { cours: { name: 'asc' } }],
        },
        classAssignments: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                year: true,
                filiere: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: [{ academicYear: 'desc' }, { class: { name: 'asc' } }],
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Accreditation plan ${id} not found`);
    }

    return plan;
  }

  async createPlan(dto: CreateAccreditationPlanDto) {
    await this.ensurePlanNameAvailable(dto.name, dto.academicYear);

    if (dto.filiereId) {
      await this.ensureFiliereExists(dto.filiereId);
    }

    if (dto.optionId) {
      await this.ensureOptionExists(dto.optionId);
    }

    if (dto.cycleId) {
      await this.ensureCycleExists(dto.cycleId);
    }

    const sourcePlan = dto.sourcePlanId
      ? await this.prisma.accreditationPlan.findUnique({
          where: { id: dto.sourcePlanId },
          include: {
            lines: {
              select: {
                id: true,
                coursId: true,
                moduleId: true,
                elementId: true,
                semestre: true,
                volumeHoraire: true,
                isMandatory: true,
              },
            },
          },
        })
      : null;

    if (dto.sourcePlanId && !sourcePlan) {
      throw new NotFoundException(
        `Source accreditation plan ${dto.sourcePlanId} not found`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const createdPlan = await tx.accreditationPlan.create({
        data: {
          name: dto.name,
          academicYear: dto.academicYear,
          levelYear: dto.levelYear ?? null,
          filiereId: dto.filiereId ?? null,
          optionId: dto.optionId ?? null,
          cycleId: dto.cycleId ?? null,
          sourcePlanId: dto.sourcePlanId ?? null,
          status: AccreditationPlanStatus.draft,
        },
      });

      if (sourcePlan && sourcePlan.lines.length > 0) {
        await tx.accreditationPlanLine.createMany({
          data: sourcePlan.lines.map((line) => ({
            planId: createdPlan.id,
            coursId: line.coursId,
            moduleId: line.moduleId,
            elementId: line.elementId,
            semestre: line.semestre,
            volumeHoraire: line.volumeHoraire,
            isMandatory: line.isMandatory,
            originLineId: line.id,
          })),
        });
      }

      return tx.accreditationPlan.findUnique({
        where: { id: createdPlan.id },
        include: {
          _count: { select: { lines: true } },
          sourcePlan: { select: { id: true, name: true, academicYear: true } },
        },
      });
    });
  }

  async updatePlan(id: number, dto: UpdateAccreditationPlanDto) {
    const existing = await this.prisma.accreditationPlan.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        academicYear: true,
        status: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Accreditation plan ${id} not found`);
    }

    const nextName = dto.name ?? existing.name;
    const nextYear = dto.academicYear ?? existing.academicYear;

    if (nextName !== existing.name || nextYear !== existing.academicYear) {
      await this.ensurePlanNameAvailable(nextName, nextYear, id);
    }

    if (
      existing.status === AccreditationPlanStatus.published &&
      dto.status !== AccreditationPlanStatus.archived
    ) {
      throw new ConflictException(
        'Published plans are immutable. Archive it or create a new revision.',
      );
    }

    return this.prisma.accreditationPlan.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.academicYear !== undefined
          ? { academicYear: dto.academicYear }
          : {}),
        ...(dto.levelYear !== undefined ? { levelYear: dto.levelYear } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: {
        _count: {
          select: { lines: true, classAssignments: true },
        },
      },
    });
  }

  async createLine(planId: number, dto: CreateAccreditationLineDto) {
    const plan = await this.prisma.accreditationPlan.findUnique({
      where: { id: planId },
      select: { id: true, status: true },
    });

    if (!plan) {
      throw new NotFoundException(`Accreditation plan ${planId} not found`);
    }

    if (plan.status !== AccreditationPlanStatus.draft) {
      throw new ConflictException('Only draft plans can be modified');
    }

    await this.ensureCoursExists(dto.coursId);

    if (dto.moduleId) {
      await this.ensureModuleExists(dto.moduleId);
    }

    if (dto.elementId) {
      await this.ensureElementExists(dto.elementId);
    }

    return this.prisma.accreditationPlanLine.create({
      data: {
        planId,
        coursId: dto.coursId,
        moduleId: dto.moduleId ?? null,
        elementId: dto.elementId ?? null,
        semestre: dto.semestre ?? null,
        volumeHoraire: dto.volumeHoraire ?? null,
        isMandatory: dto.isMandatory ?? true,
      },
      include: {
        cours: { select: { id: true, name: true, type: true } },
        module: { select: { id: true, name: true } },
        element: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async removeLine(id: number) {
    const line = await this.prisma.accreditationPlanLine.findUnique({
      where: { id },
      include: {
        plan: { select: { id: true, status: true } },
      },
    });

    if (!line) {
      throw new NotFoundException(`Accreditation line ${id} not found`);
    }

    if (line.plan.status !== AccreditationPlanStatus.draft) {
      throw new ConflictException('Only draft plans can be modified');
    }

    return this.prisma.accreditationPlanLine.delete({ where: { id } });
  }

  async assignPlanToClassYear(
    planId: number,
    dto: AssignClassAccreditationDto,
  ) {
    await this.ensurePlanExists(planId);
    await this.ensureClassExists(dto.classId);

    return this.prisma.classAccreditationAssignment.upsert({
      where: {
        classId_academicYear: {
          classId: dto.classId,
          academicYear: dto.academicYear,
        },
      },
      create: {
        classId: dto.classId,
        academicYear: dto.academicYear,
        planId,
      },
      update: {
        planId,
      },
      include: {
        class: { select: { id: true, name: true, year: true } },
        plan: {
          select: {
            id: true,
            name: true,
            academicYear: true,
            status: true,
          },
        },
      },
    });
  }

  async findClassAssignments(classId: number) {
    await this.ensureClassExists(classId);

    return this.prisma.classAccreditationAssignment.findMany({
      where: { classId },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            academicYear: true,
            status: true,
            _count: { select: { lines: true } },
          },
        },
      },
      orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async diffWithSource(id: number) {
    const plan = await this.prisma.accreditationPlan.findUnique({
      where: { id },
      include: {
        lines: {
          select: {
            id: true,
            coursId: true,
            volumeHoraire: true,
            semestre: true,
            isMandatory: true,
            cours: { select: { id: true, name: true, type: true } },
          },
        },
        sourcePlan: {
          include: {
            lines: {
              select: {
                id: true,
                coursId: true,
                volumeHoraire: true,
                semestre: true,
                isMandatory: true,
                cours: { select: { id: true, name: true, type: true } },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Accreditation plan ${id} not found`);
    }

    if (!plan.sourcePlan) {
      return {
        sourcePlan: null,
        added: plan.lines,
        removed: [],
        changed: [],
      };
    }

    const sourceByCours = new Map(
      plan.sourcePlan.lines.map((line) => [line.coursId, line]),
    );
    const targetByCours = new Map(plan.lines.map((line) => [line.coursId, line]));

    const added = plan.lines.filter((line) => !sourceByCours.has(line.coursId));
    const removed = plan.sourcePlan.lines.filter(
      (line) => !targetByCours.has(line.coursId),
    );

    const changed = plan.lines
      .filter((line) => sourceByCours.has(line.coursId))
      .map((line) => {
        const previous = sourceByCours.get(line.coursId)!;
        const hasDelta =
          previous.volumeHoraire !== line.volumeHoraire ||
          previous.semestre !== line.semestre ||
          previous.isMandatory !== line.isMandatory;

        if (!hasDelta) {
          return null;
        }

        return {
          coursId: line.coursId,
          cours: line.cours,
          before: {
            volumeHoraire: previous.volumeHoraire,
            semestre: previous.semestre,
            isMandatory: previous.isMandatory,
          },
          after: {
            volumeHoraire: line.volumeHoraire,
            semestre: line.semestre,
            isMandatory: line.isMandatory,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      sourcePlan: {
        id: plan.sourcePlan.id,
        name: plan.sourcePlan.name,
        academicYear: plan.sourcePlan.academicYear,
      },
      added,
      removed,
      changed,
    };
  }

  private async ensurePlanNameAvailable(
    name: string,
    academicYear: string,
    excludeId?: number,
  ) {
    const existing = await this.prisma.accreditationPlan.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        academicYear,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        `Plan "${name}" already exists for year ${academicYear}`,
      );
    }
  }

  private async ensurePlanExists(id: number) {
    const plan = await this.prisma.accreditationPlan.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!plan) {
      throw new NotFoundException(`Accreditation plan ${id} not found`);
    }
  }

  private async ensureClassExists(id: number) {
    const item = await this.prisma.academicClass.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException(`Class ${id} not found`);
    }
  }

  private async ensureCoursExists(id: number) {
    const item = await this.prisma.cours.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException(`Cours ${id} not found`);
    }
  }

  private async ensureFiliereExists(id: number) {
    const item = await this.prisma.filiere.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException(`Filiere ${id} not found`);
    }
  }

  private async ensureOptionExists(id: number) {
    const item = await this.prisma.option.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException(`Option ${id} not found`);
    }
  }

  private async ensureCycleExists(id: number) {
    const item = await this.prisma.cycle.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException(`Cycle ${id} not found`);
    }
  }

  private async ensureModuleExists(id: number) {
    const item = await this.prisma.module.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException(`Module ${id} not found`);
    }
  }

  private async ensureElementExists(id: number) {
    const item = await this.prisma.elementModule.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!item) {
      throw new NotFoundException(`ElementModule ${id} not found`);
    }
  }
}
