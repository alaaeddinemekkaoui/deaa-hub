import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(currentUser: JwtPayload, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId: currentUser.sub,
        ...(unreadOnly ? { read: false } : {}),
      },
      include: {
        message: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            sender: { select: { id: true, fullName: true } },
            group: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getUnreadCount(currentUser: JwtPayload): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId: currentUser.sub, read: false },
    });
    return { count };
  }

  async markRead(id: number, currentUser: JwtPayload) {
    return this.prisma.notification.updateMany({
      where: { id, userId: currentUser.sub },
      data: { read: true },
    });
  }

  async markAllRead(currentUser: JwtPayload) {
    return this.prisma.notification.updateMany({
      where: { userId: currentUser.sub, read: false },
      data: { read: true },
    });
  }
}
