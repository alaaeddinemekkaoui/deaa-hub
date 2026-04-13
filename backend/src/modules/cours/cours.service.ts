import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCoursDto } from './dto/create-cours.dto';
import { UpdateCoursDto } from './dto/update-cours.dto';
import { CoursQueryDto } from './dto/cours-query.dto';
import { AssignCoursClassDto } from './dto/assign-cours-class.dto';

@Injectable()
export class CoursService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: CoursQueryDto) {
    const { page, limit, search, classId, sortBy, sortOrder } = query;

    const filters: Prisma.CoursWhereInput[] = [];
    if (search)
      filters.push({ name: { contains: search, mode: 'insensitive' } });
    if (classId) filters.push({ classes: { some: { classId } } });

    const where: Prisma.CoursWhereInput = filters.length
      ? { AND: filters }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.cours.findMany({
        where,
        include: {
          elementModule: {
            select: { id: true, name: true, type: true, volumeHoraire: true },
          },
          _count: { select: { classes: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.cours.count({ where }),
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

  async findOne(id: number) {
    const cours = await this.prisma.cours.findUnique({
      where: { id },
      include: {
        elementModule: {
          select: {
            id: true,
            name: true,
            type: true,
            volumeHoraire: true,
            module: { select: { id: true, name: true } },
          },
        },
        classes: {
          include: {
            class: {
              include: {
                filiere: {
                  include: { department: { select: { id: true, name: true } } },
                },
              },
            },
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!cours) throw new NotFoundException(`Cours ${id} not found`);
    return cours;
  }

  async create(dto: CreateCoursDto) {
    await this.ensureNameAvailable(dto.name);
    if (dto.elementModuleId)
      await this.ensureElementModuleAvailable(dto.elementModuleId);

    const cours = await this.prisma.cours.create({
      data: {
        name: dto.name,
        type: dto.type ?? 'CM',
        elementModuleId: dto.elementModuleId ?? null,
      },
    });

    // Optionally assign to a class right away
    if (dto.classId) {
      await this.ensureClassExists(dto.classId);
      await this.prisma.coursClass.create({
        data: {
          coursId: cours.id,
          classId: dto.classId,
          teacherId: dto.teacherId ?? null,
        },
      });
    }

    return cours;
  }

  async update(id: number, dto: UpdateCoursDto) {
    await this.ensureExists(id);
    if (dto.name) await this.ensureNameAvailable(dto.name, id);
    if (dto.elementModuleId)
      await this.ensureElementModuleAvailable(dto.elementModuleId, id);
    return this.prisma.cours.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.elementModuleId !== undefined
          ? { elementModuleId: dto.elementModuleId ?? null }
          : {}),
      },
    });
  }

  async remove(id: number) {
    await this.ensureExists(id);
    return this.prisma.cours.delete({ where: { id } });
  }

  async assignToClass(coursId: number, dto: AssignCoursClassDto) {
    await this.ensureExists(coursId);
    await this.ensureClassExists(dto.classId);
    const teacherIds = Array.from(
      new Set(
        dto.teacherIds?.length
          ? dto.teacherIds
          : dto.teacherId
            ? [dto.teacherId]
            : [],
      ),
    );

    for (const teacherId of teacherIds) {
      await this.ensureTeacherExists(teacherId);
    }

    if (teacherIds.length === 0) {
      const existingUnassigned = await this.prisma.coursClass.findFirst({
        where: { coursId, classId: dto.classId, teacherId: null },
      });

      if (existingUnassigned) {
        return this.prisma.coursClass.update({
          where: { id: existingUnassigned.id },
          data: { groupLabel: dto.groupLabel ?? null },
          include: {
            class: true,
            teacher: { select: { id: true, firstName: true, lastName: true } },
          },
        });
      }

      return this.prisma.coursClass.create({
        data: {
          coursId,
          classId: dto.classId,
          teacherId: null,
          groupLabel: dto.groupLabel ?? null,
        },
        include: {
          class: true,
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }

    for (const teacherId of teacherIds) {
      const existing = await this.prisma.coursClass.findFirst({
        where: { coursId, classId: dto.classId, teacherId },
        select: { id: true },
      });

      if (!existing) {
        await this.prisma.coursClass.create({
          data: {
            coursId,
            classId: dto.classId,
            teacherId,
            groupLabel: dto.groupLabel ?? null,
          },
        });
      }
    }

    return this.prisma.coursClass.findMany({
      where: { coursId, classId: dto.classId },
      include: {
        class: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ teacherId: 'asc' }, { id: 'asc' }],
    });
  }

  async removeFromClass(coursId: number, classId: number, teacherId?: number) {
    const where: Prisma.CoursClassWhereInput = {
      coursId,
      classId,
      ...(teacherId ? { teacherId } : {}),
    };

    const existing = await this.prisma.coursClass.findFirst({
      where,
      select: { id: true },
    });
    if (!existing)
      throw new NotFoundException(
        `Cours ${coursId} is not assigned to class ${classId}`,
      );

    if (teacherId) {
      return this.prisma.coursClass.delete({ where: { id: existing.id } });
    }

    return this.prisma.coursClass.deleteMany({ where: { coursId, classId } });
  }

  /**
   * Scans all ElementModules linked to the given class (via the class's filière),
   * creates a Cours for each one that doesn't have one yet, and assigns all to the class.
   * Returns counts of created and already-existing cours.
   */
  async importFromClass(
    classId: number,
  ): Promise<{ created: number; existing: number; total: number }> {
    const cls = await this.prisma.academicClass.findUnique({
      where: { id: classId },
      select: { id: true, filiereId: true },
    });
    if (!cls) throw new NotFoundException(`Class ${classId} not found`);

    // Find all ElementModules for this class (directly linked by classId) or filière
    const elements = await this.prisma.elementModule.findMany({
      where: {
        OR: [
          { classId },
          ...(cls.filiereId ? [{ module: { filiereId: cls.filiereId } }] : []),
        ],
      },
      select: { id: true, name: true, cours: { select: { id: true } } },
    });

    let created = 0;
    let existing = 0;

    for (const el of elements) {
      let coursId: number;

      if (el.cours) {
        // Cours already linked to this element
        coursId = el.cours.id;
        existing++;
      } else {
        // Need to create cours for this element
        // Check if a cours with this name already exists
        let cours = await this.prisma.cours.findFirst({
          where: { name: { equals: el.name, mode: 'insensitive' } },
          select: { id: true, elementModuleId: true },
        });

        if (!cours) {
          cours = await this.prisma.cours.create({
            data: { name: el.name, elementModuleId: el.id },
          });
          created++;
        } else {
          // Link only if the cours is currently not linked.
          if (!cours.elementModuleId) {
            await this.prisma.cours.update({
              where: { id: cours.id },
              data: { elementModuleId: el.id },
            });
          }
          existing++;
        }
        coursId = cours.id;
      }

      // Assign to class if not already assigned (unassigned teacher slot).
      const existingClassAssignment = await this.prisma.coursClass.findFirst({
        where: { coursId, classId, teacherId: null },
        select: { id: true },
      });

      if (!existingClassAssignment) {
        await this.prisma.coursClass.create({
          data: { coursId, classId, teacherId: null },
        });
      }
    }

    return { created, existing, total: elements.length };
  }

  private async ensureExists(id: number) {
    const cours = await this.prisma.cours.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!cours) throw new NotFoundException(`Cours ${id} not found`);
  }

  private async ensureNameAvailable(name: string, excludeId?: number) {
    const existing = await this.prisma.cours.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (existing)
      throw new ConflictException(`A cours named "${name}" already exists`);
  }

  private async ensureElementModuleAvailable(
    elementModuleId: number,
    excludeCoursId?: number,
  ) {
    const el = await this.prisma.elementModule.findUnique({
      where: { id: elementModuleId },
      select: { id: true },
    });
    if (!el)
      throw new NotFoundException(`ElementModule ${elementModuleId} not found`);
    const linked = await this.prisma.cours.findFirst({
      where: {
        elementModuleId,
        ...(excludeCoursId ? { id: { not: excludeCoursId } } : {}),
      },
      select: { id: true },
    });
    if (linked)
      throw new ConflictException(
        `ElementModule ${elementModuleId} already has a linked cours`,
      );
  }

  private async ensureClassExists(classId: number) {
    const cls = await this.prisma.academicClass.findUnique({
      where: { id: classId },
      select: { id: true },
    });
    if (!cls) throw new NotFoundException(`Class ${classId} not found`);
  }

  private async ensureTeacherExists(teacherId: number) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException(`Teacher ${teacherId} not found`);
  }
}
