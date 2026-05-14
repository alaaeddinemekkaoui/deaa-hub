import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateActivityLogDto } from './dto/create-activity-log.dto';
import { Prisma } from '@prisma/client';
import { KeyedTtlCache } from '../../common/utils/keyed-ttl-cache';

@Injectable()
export class ActivityLogsService {
  private readonly listCache = new KeyedTtlCache<unknown>({
    prefix: 'activity-logs:list',
    ttlMs: 30 * 1000,
    staleTtlMs: 3 * 60 * 1000,
  });

  constructor(private readonly prisma: PrismaService) {}

  findAll(limit = 50) {
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return this.listCache.getOrLoad(String(safeLimit), () =>
      this.prisma.activityLog.findMany({
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: safeLimit,
      }),
    );
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

  async create(dto: CreateActivityLogDto) {
    const result = await this.prisma.activityLog.create({
      data: {
        userId: dto.userId,
        action: dto.action,
        metadata: dto.metadata as never,
      },
    });
    this.listCache.invalidate();
    return result;
  }

  async update(id: number, dto: Partial<CreateActivityLogDto>) {
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

    const result = await this.prisma.activityLog.update({ where: { id }, data });
    this.listCache.invalidate();
    return result;
  }

  async remove(id: number) {
    const result = await this.prisma.activityLog.delete({ where: { id } });
    this.listCache.invalidate();
    return result;
  }
}
