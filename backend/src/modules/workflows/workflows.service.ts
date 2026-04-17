import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { WorkflowStatus } from '@prisma/client';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  /** departmentIds: when provided, only return tasks whose student belongs to those departments */
  async findAll(departmentIds?: number[]) {
    const where =
      departmentIds && departmentIds.length > 0
        ? {
            student: {
              filiere: {
                departmentId: { in: departmentIds },
              },
            },
          }
        : undefined;

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

  findOne(id: number) {
    return this.prisma.workflowTask.findUnique({
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
  }

  async create(dto: CreateWorkflowDto) {
    const task = await this.prisma.workflowTask.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status ?? WorkflowStatus.pending,
        assignedToId: dto.assignedToId,
        studentId: dto.studentId ?? null,
        documentTypeId: dto.documentTypeId ?? null,
      },
    });

    await this.prisma.workflowTimeline.create({
      data: { taskId: task.id, status: task.status, note: 'Demande créée' },
    });

    return task;
  }

  async update(id: number, dto: UpdateWorkflowDto) {
    const updated = await this.prisma.workflowTask.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.assignedToId !== undefined && { assignedToId: dto.assignedToId }),
        ...(dto.studentId !== undefined && { studentId: dto.studentId }),
        ...(dto.documentTypeId !== undefined && { documentTypeId: dto.documentTypeId }),
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
          note: dto.timelineNote ?? `Statut changé : ${labels[dto.status] ?? dto.status}`,
        },
      });
    }

    return updated;
  }

  remove(id: number) {
    return this.prisma.workflowTask.delete({ where: { id } });
  }
}
