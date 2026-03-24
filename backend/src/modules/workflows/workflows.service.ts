import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.workflowTask.findMany({
      include: {
        assignedTo: { select: { id: true, fullName: true, role: true } },
        student: { select: { id: true, fullName: true, codeMassar: true } },
        timeline: { orderBy: { changedAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.workflowTask.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, fullName: true, role: true } },
        student: { select: { id: true, fullName: true, codeMassar: true } },
        timeline: { orderBy: { changedAt: 'desc' } },
      },
    });
  }

  async create(dto: CreateWorkflowDto) {
    const task = await this.prisma.workflowTask.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status ?? 'pending',
        assignedToId: dto.assignedToId,
        studentId: dto.studentId,
      },
    });

    await this.prisma.workflowTimeline.create({
      data: {
        taskId: task.id,
        status: task.status,
        note: 'Task created',
      },
    });

    return task;
  }

  async update(id: number, dto: UpdateWorkflowDto) {
    const updated = await this.prisma.workflowTask.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        assignedToId: dto.assignedToId,
        studentId: dto.studentId,
      },
    });

    if (dto.status) {
      await this.prisma.workflowTimeline.create({
        data: {
          taskId: id,
          status: dto.status,
          note: dto.timelineNote ?? `Status changed to ${dto.status}`,
        },
      });
    }

    return updated;
  }

  remove(id: number) {
    return this.prisma.workflowTask.delete({ where: { id } });
  }
}
