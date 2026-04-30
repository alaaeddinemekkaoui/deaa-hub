import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowStatus } from '@prisma/client';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../../common/types/role.type';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  /** departmentIds: when provided, only return tasks whose student belongs to those departments */
  async findAll(departmentIds?: number[], currentUser?: JwtPayload) {
    const filters: Record<string, unknown>[] = [];
    if (currentUser?.role === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: currentUser.sub },
        select: { id: true },
      });
      if (!student) return [];
      filters.push({ studentId: student.id });
    } else if (departmentIds && departmentIds.length > 0) {
      filters.push({
        student: {
          filiere: {
            departmentId: { in: departmentIds },
          },
        },
      });
    }
    const where = filters.length > 0 ? { AND: filters } : undefined;

    return this.prisma.workflowTask.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, fullName: true, role: true } },
        student: {
          select: {
            id: true,
            fullName: true,
            codeMassar: true,
            filiere: { select: { id: true, name: true, departmentId: true } },
          },
        },
        documentType: { select: { id: true, name: true } },
        timeline: { orderBy: { changedAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: number, currentUser?: JwtPayload) {
    const task = await this.prisma.workflowTask.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, fullName: true, role: true } },
        student: {
          select: {
            id: true,
            fullName: true,
            codeMassar: true,
            filiere: { select: { id: true, name: true, departmentId: true } },
          },
        },
        documentType: { select: { id: true, name: true } },
        timeline: { orderBy: { changedAt: 'asc' } },
      },
    });
    if (!task) throw new NotFoundException(`Workflow ${id} not found`);
    if (currentUser?.role === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: currentUser.sub },
        select: { id: true },
      });
      if (!student || task.student?.id !== student.id) {
        throw new ForbiddenException("Vous ne pouvez consulter que vos propres demandes");
      }
    }
    return task;
  }

  async create(dto: CreateWorkflowDto, currentUser?: JwtPayload) {
    if (dto.assignedToId === undefined) {
      throw new BadRequestException('assignedToId is required');
    }

    let studentId = dto.studentId ?? null;
    if (currentUser?.role === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: currentUser.sub },
        select: { id: true },
      });
      if (!student) {
        throw new BadRequestException('Aucun profil étudiant lié à ce compte');
      }
      studentId = student.id;
    }

    const task = await this.prisma.workflowTask.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status ?? WorkflowStatus.pending,
        assignedToId: dto.assignedToId,
        studentId,
        documentTypeId: dto.documentTypeId ?? null,
      },
    });

    await this.prisma.workflowTimeline.create({
      data: { taskId: task.id, status: task.status, note: 'Demande créée' },
    });

    await this.prisma.notification.create({
      data: {
        userId: dto.assignedToId,
        type: 'workflow_request',
        content: `Nouvelle demande de document: ${dto.title}.`,
      },
    });

    return task;
  }

  async update(id: number, dto: UpdateWorkflowDto, currentUser?: JwtPayload) {
    if (currentUser?.role === UserRole.INSPECTOR) {
      const existing = await this.prisma.workflowTask.findUnique({
        where: { id },
        select: {
          student: { select: { filiere: { select: { departmentId: true } } } },
        },
      });
      const departmentId = existing?.student?.filiere?.departmentId;
      if (!departmentId || !currentUser.departmentIds.includes(departmentId)) {
        throw new ForbiddenException("Vous n'êtes pas autorisé à modifier cette demande");
      }
    }
    const updated = await this.prisma.workflowTask.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.assignedToId !== undefined && {
          assignedToId: dto.assignedToId,
        }),
        ...(dto.studentId !== undefined && { studentId: dto.studentId }),
        ...(dto.documentTypeId !== undefined && {
          documentTypeId: dto.documentTypeId,
        }),
      },
    });

    if (dto.status) {
      const labels: Record<string, string> = {
        pending: 'En attente',
        in_progress: 'En cours',
        completed: 'Terminé',
        refused: 'Refusé',
      };
      await this.prisma.workflowTimeline.create({
        data: {
          taskId: id,
          status: dto.status,
          note:
            dto.timelineNote ??
            `Statut changé : ${labels[dto.status] ?? dto.status}`,
        },
      });

      const requesterUserId = await this.getWorkflowRequesterUserId(id);
      if (requesterUserId) {
        await this.prisma.notification.create({
          data: {
            userId: requesterUserId,
            type: 'workflow_status',
            content: `Votre demande de document est maintenant: ${labels[dto.status] ?? dto.status}.`,
          },
        });
      }

      if (dto.status === WorkflowStatus.completed) {
        await this.applyApprovedProfileUpdate(id);
      }
    }

    return updated;
  }

  remove(id: number) {
    return this.prisma.workflowTask.delete({ where: { id } });
  }

  private async getWorkflowRequesterUserId(taskId: number) {
    const task = await this.prisma.workflowTask.findUnique({
      where: { id: taskId },
      select: { student: { select: { userId: true } } },
    });
    return task?.student?.userId ?? null;
  }

  private parseProfileUpdatePayload(description?: string | null) {
    const marker = 'PROFILE_UPDATE_PAYLOAD:';
    const line = description
      ?.split(/\r?\n/)
      .find((item) => item.startsWith(marker));
    if (!line) return null;

    try {
      const parsed = JSON.parse(line.slice(marker.length)) as unknown;
      if (!parsed || typeof parsed !== 'object') return null;

      const patch = parsed as { fullName?: unknown; email?: unknown };
      return {
        ...(typeof patch.fullName === 'string' && patch.fullName.trim()
          ? { fullName: patch.fullName.trim() }
          : {}),
        ...(typeof patch.email === 'string' && patch.email.trim()
          ? { email: patch.email.trim() }
          : {}),
      };
    } catch {
      return null;
    }
  }

  private async applyApprovedProfileUpdate(taskId: number) {
    const task = await this.prisma.workflowTask.findUnique({
      where: { id: taskId },
      select: {
        title: true,
        description: true,
        student: { select: { id: true, userId: true } },
      },
    });

    if (task?.title !== 'Demande modification profil' || !task.student?.userId) {
      return;
    }

    const patch = this.parseProfileUpdatePayload(task.description);
    if (!patch || Object.keys(patch).length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: task.student!.userId! },
        data: patch,
      });

      await tx.student.update({
        where: { id: task.student!.id },
        data: {
          ...(patch.fullName ? { fullName: patch.fullName } : {}),
          ...(patch.email ? { email: patch.email } : {}),
        },
      });
    });
  }
}
