import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GroupType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../../common/types/role.type';

const isAdmin = (role: UserRole) =>
  role === UserRole.ADMIN || role === UserRole.STAFF;

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Groups ────────────────────────────────────────────────────────────────

  async listGroups(currentUser: JwtPayload) {
    if (isAdmin(currentUser.role)) {
      return this.prisma.messageGroup.findMany({
        include: { _count: { select: { members: true, messages: true } } },
        orderBy: { name: 'asc' },
      });
    }
    // Non-admin: only groups they belong to
    return this.prisma.messageGroup.findMany({
      where: { members: { some: { userId: currentUser.sub } } },
      include: { _count: { select: { members: true, messages: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createGroup(dto: CreateGroupDto, currentUser: JwtPayload) {
    if (!isAdmin(currentUser.role)) {
      throw new ForbiddenException('Only admins can create groups');
    }
    const group = await this.prisma.messageGroup.create({
      data: {
        name: dto.name,
        type: dto.type,
        referenceId: dto.referenceId ?? null,
        members: dto.memberIds?.length
          ? {
              createMany: {
                data: dto.memberIds.map((userId) => ({
                  userId,
                  canSend: false,
                })),
                skipDuplicates: true,
              },
            }
          : undefined,
      },
      include: { members: true },
    });
    return group;
  }

  async getGroupMembers(groupId: number) {
    return this.prisma.messageGroupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
    });
  }

  async setMemberCanSend(
    groupId: number,
    userId: number,
    canSend: boolean,
    currentUser: JwtPayload,
  ) {
    if (!isAdmin(currentUser.role)) {
      throw new ForbiddenException('Only admins can change send permissions');
    }
    return this.prisma.messageGroupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: { canSend },
      create: { groupId, userId, canSend },
    });
  }

  async addGroupMember(groupId: number, userId: number, currentUser: JwtPayload) {
    if (!isAdmin(currentUser.role)) {
      throw new ForbiddenException('Only admins can add group members');
    }
    return this.prisma.messageGroupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: {},
      create: { groupId, userId, canSend: false },
    });
  }

  async removeGroupMember(groupId: number, userId: number, currentUser: JwtPayload) {
    if (!isAdmin(currentUser.role)) {
      throw new ForbiddenException('Only admins can remove group members');
    }
    return this.prisma.messageGroupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  // ─── Messages ──────────────────────────────────────────────────────────────

  /**
   * Permission rules:
   * - admin/staff: can send to any user (1:1) or any group
   * - viewer/user: can send 1:1 only to admin/staff, and to groups where canSend=true
   */
  async sendMessage(dto: SendMessageDto, currentUser: JwtPayload) {
    const adminSender = isAdmin(currentUser.role);

    if (dto.recipientId !== undefined) {
      // 1:1 message
      if (!adminSender) {
        // Non-admin can only message admin/staff
        const recipient = await this.prisma.user.findUnique({
          where: { id: dto.recipientId },
          select: { role: true },
        });
        if (!recipient) throw new NotFoundException('Recipient not found');
        if (!isAdmin(recipient.role as UserRole)) {
          throw new ForbiddenException(
            'You can only send direct messages to admins or staff',
          );
        }
      }

      const message = await this.prisma.message.create({
        data: {
          senderId: currentUser.sub,
          recipientId: dto.recipientId,
          content: dto.content,
          fileUrl: dto.fileUrl ?? null,
        },
      });

      // Create notification for recipient
      await this.prisma.notification.create({
        data: {
          userId: dto.recipientId,
          messageId: message.id,
          type: 'message',
          content: `Nouveau message de ${currentUser.email}`,
        },
      });

      return message;
    }

    if (dto.groupId !== undefined) {
      // Group message
      if (!adminSender) {
        const membership = await this.prisma.messageGroupMember.findUnique({
          where: { groupId_userId: { groupId: dto.groupId, userId: currentUser.sub } },
          select: { canSend: true },
        });
        if (!membership?.canSend) {
          throw new ForbiddenException(
            "You don't have permission to send messages to this group",
          );
        }
      }

      const message = await this.prisma.message.create({
        data: {
          senderId: currentUser.sub,
          groupId: dto.groupId,
          content: dto.content,
          fileUrl: dto.fileUrl ?? null,
        },
      });

      // Notify all group members except sender
      const members = await this.prisma.messageGroupMember.findMany({
        where: { groupId: dto.groupId, NOT: { userId: currentUser.sub } },
        select: { userId: true },
      });

      const group = await this.prisma.messageGroup.findUnique({
        where: { id: dto.groupId },
        select: { name: true },
      });

      if (members.length) {
        await this.prisma.notification.createMany({
          data: members.map(({ userId }) => ({
            userId,
            messageId: message.id,
            type: 'message',
            content: `Nouveau message dans « ${group?.name ?? 'groupe'} » de ${currentUser.email}`,
          })),
        });
      }

      return message;
    }

    throw new ForbiddenException('Either recipientId or groupId must be provided');
  }

  /** Conversation between current user and another user */
  async getConversation(otherUserId: number, currentUser: JwtPayload, limit = 50) {
    return this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUser.sub, recipientId: otherUserId },
          { senderId: otherUserId, recipientId: currentUser.sub },
        ],
        groupId: null,
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Messages in a group channel */
  async getGroupMessages(groupId: number, currentUser: JwtPayload, limit = 50) {
    if (!isAdmin(currentUser.role)) {
      const membership = await this.prisma.messageGroupMember.findUnique({
        where: { groupId_userId: { groupId, userId: currentUser.sub } },
      });
      if (!membership) throw new ForbiddenException('Not a member of this group');
    }

    return this.prisma.message.findMany({
      where: { groupId },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** All conversations (inboxes) for current user */
  async getInbox(currentUser: JwtPayload) {
    // Direct messages — latest per conversation partner
    const directMessages = await this.prisma.message.findMany({
      where: {
        OR: [{ senderId: currentUser.sub }, { recipientId: currentUser.sub }],
        groupId: null,
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true } },
        recipient: { select: { id: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['senderId', 'recipientId'],
      take: 50,
    });

    // Group memberships
    const groups = await this.prisma.messageGroup.findMany({
      where: isAdmin(currentUser.role)
        ? {}
        : { members: { some: { userId: currentUser.sub } } },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, fullName: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    return { directMessages, groups };
  }

  // ─── Seed default groups ────────────────────────────────────────────────────

  async seedSystemGroups() {
    // EVERYONE group
    await this.prisma.messageGroup.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, name: 'Tout le monde', type: GroupType.EVERYONE },
    });

    // ADMINS_ONLY group
    await this.prisma.messageGroup.upsert({
      where: { id: 2 },
      update: {},
      create: { id: 2, name: 'Administrateurs uniquement', type: GroupType.ADMINS_ONLY },
    });

    // Sync EVERYONE members with all users
    const allUsers = await this.prisma.user.findMany({ select: { id: true, role: true } });
    for (const u of allUsers) {
      await this.prisma.messageGroupMember.upsert({
        where: { groupId_userId: { groupId: 1, userId: u.id } },
        update: {},
        create: {
          groupId: 1,
          userId: u.id,
          canSend: isAdmin(u.role as UserRole),
        },
      });
    }

    // Sync ADMINS_ONLY members
    const adminUsers = allUsers.filter((u) => isAdmin(u.role as UserRole));
    for (const u of adminUsers) {
      await this.prisma.messageGroupMember.upsert({
        where: { groupId_userId: { groupId: 2, userId: u.id } },
        update: {},
        create: { groupId: 2, userId: u.id, canSend: true },
      });
    }

    // Auto-groups per department
    const departments = await this.prisma.department.findMany({
      select: { id: true, name: true },
    });
    for (const dept of departments) {
      const existing = await this.prisma.messageGroup.findFirst({
        where: { type: GroupType.DEPARTMENT, referenceId: dept.id },
      });
      if (!existing) {
        await this.prisma.messageGroup.create({
          data: {
            name: `Département: ${dept.name}`,
            type: GroupType.DEPARTMENT,
            referenceId: dept.id,
          },
        });
      }
    }

    // Auto-groups per filière
    const filieres = await this.prisma.filiere.findMany({
      select: { id: true, name: true },
    });
    for (const f of filieres) {
      const existing = await this.prisma.messageGroup.findFirst({
        where: { type: GroupType.FILIERE, referenceId: f.id },
      });
      if (!existing) {
        await this.prisma.messageGroup.create({
          data: {
            name: `Filière: ${f.name}`,
            type: GroupType.FILIERE,
            referenceId: f.id,
          },
        });
      }
    }

    // Auto-groups per cycle
    const cycles = await this.prisma.cycle.findMany({
      select: { id: true, name: true },
    });
    for (const c of cycles) {
      const existing = await this.prisma.messageGroup.findFirst({
        where: { type: GroupType.CYCLE, referenceId: c.id },
      });
      if (!existing) {
        await this.prisma.messageGroup.create({
          data: {
            name: `Cycle: ${c.name}`,
            type: GroupType.CYCLE,
            referenceId: c.id,
          },
        });
      }
    }
  }
}
