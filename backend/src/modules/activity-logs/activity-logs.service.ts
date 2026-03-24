import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(limit = 50) {
    return this.prisma.activityLog.findMany({
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  findOne(id: number) {
    return this.prisma.activityLog.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });
  }

  create(dto: CreateActivityLogDto) {
    return this.prisma.activityLog.create({
      data: {
        userId: dto.userId,
        action: dto.action,
        metadata: dto.metadata as never,
      },
    });
  }

  update(id: number, dto: Partial<CreateActivityLogDto>) {
    const data: Prisma.ActivityLogUpdateInput = {
      ...(dto.action ? { action: dto.action } : {}),
      ...(dto.metadata ? { metadata: dto.metadata as never } : {}),
      ...(dto.userId
        ? {
            user: {
              connect: {
                id: dto.userId,
              },
            },
          }
        : {}),
    };

    return this.prisma.activityLog.update({ where: { id }, data });
  }

  remove(id: number) {
    return this.prisma.activityLog.delete({ where: { id } });
  }
}
