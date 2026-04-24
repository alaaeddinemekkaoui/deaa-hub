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

const isInspectorOrAdmin = (role: UserRole) =>
  role === UserRole.INSPECTOR || isAdmin(role);

const canManageClassDelegation = (role: UserRole) =>
  role === UserRole.TEACHER || role === UserRole.INSPECTOR || isAdmin(role);

function canSendDirectMessage(senderRole: UserRole, recipientRole: UserRole): boolean {
  if (isAdmin(senderRole) || senderRole === UserRole.INSPECTOR || senderRole === UserRole.VIEWER) {
    return true;
  }

  if (senderRole === UserRole.STUDENT) {
    return [
      UserRole.STUDENT,
      UserRole.TEACHER,
      UserRole.INSPECTOR,
      UserRole.ADMIN,
      UserRole.STAFF,
    ].includes(recipientRole);
  }

  if (senderRole === UserRole.TEACHER) {
    return [
      UserRole.STUDENT,
      UserRole.TEACHER,
      UserRole.INSPECTOR,
      UserRole.ADMIN,
      UserRole.STAFF,
    ].includes(recipientRole);
  }

  // fallback for legacy/other roles
  return true;
}

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
    const group = await this.prisma.messageGroup.findUnique({
      where: { id: groupId },
      select: { type: true },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const actorRole = currentUser.role as UserRole;
    const canManage =
      isInspectorOrAdmin(actorRole) ||
      (group.type === GroupType.CLASS && canManageClassDelegation(actorRole));

    if (!canManage) {
      throw new ForbiddenException('You are not allowed to change send permissions for this group');
    }

    return this.prisma.messageGroupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: { canSend },
      create: { groupId, userId, canSend },
    });
  }

  async addGroupMember(groupId: number, userId: number, currentUser: JwtPayload) {
    if (!isInspectorOrAdmin(currentUser.role as UserRole)) {
      throw new ForbiddenException('Only admins/staff/inspectors can add group members');
    }
    return this.prisma.messageGroupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: {},
      create: { groupId, userId, canSend: false },
    });
  }

  async removeGroupMember(groupId: number, userId: number, currentUser: JwtPayload) {
    if (!isInspectorOrAdmin(currentUser.role as UserRole)) {
      throw new ForbiddenException('Only admins/staff/inspectors can remove group members');
    }
    return this.prisma.messageGroupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  async updateGroup(id: number, name: string, currentUser: JwtPayload) {
    if (!isAdmin(currentUser.role as UserRole)) {
      throw new ForbiddenException('Only admins can update groups');
    }
    const group = await this.prisma.messageGroup.findUnique({ where: { id }, select: { id: true } });
    if (!group) throw new NotFoundException('Group not found');
    return this.prisma.messageGroup.update({
      where: { id },
      data: { name: name.trim() },
      include: { _count: { select: { members: true, messages: true } } },
    });
  }

  async deleteGroup(id: number, currentUser: JwtPayload) {
    if (!isAdmin(currentUser.role as UserRole)) {
      throw new ForbiddenException('Only admins can delete groups');
    }
    const group = await this.prisma.messageGroup.findUnique({ where: { id }, select: { id: true, type: true } });
    if (!group) throw new NotFoundException('Group not found');
    if (group.type !== 'CUSTOM') {
      throw new ForbiddenException('Only custom groups can be deleted');
    }
    return this.prisma.messageGroup.delete({ where: { id } });
  }

  // ─── Messages ──────────────────────────────────────────────────────────────

  /**
   * Permission rules:
   * - admin/staff: can send to any user (1:1) or any group
   * - viewer/user: can send 1:1 only to admin/staff, and to groups where canSend=true
   */
  async sendMessage(dto: SendMessageDto, currentUser: JwtPayload) {
    const actorRole = currentUser.role as UserRole;
    const adminSender = isAdmin(actorRole);
    const sender = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
      select: { fullName: true, email: true },
    });
    const senderName = sender?.fullName?.trim() || sender?.email || currentUser.email;

    if (dto.recipientId !== undefined) {
      // 1:1 message
      const recipient = await this.prisma.user.findUnique({
        where: { id: dto.recipientId },
        select: { role: true },
      });
      if (!recipient) throw new NotFoundException('Recipient not found');

      if (!canSendDirectMessage(actorRole, recipient.role as UserRole)) {
        throw new ForbiddenException('You are not allowed to send direct message to this user role');
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
          content: `Nouveau message de ${senderName}`,
        },
      });

      return message;
    }

    if (dto.groupId !== undefined) {
      // Group message
      if (!adminSender) {
        const group = await this.prisma.messageGroup.findUnique({
          where: { id: dto.groupId },
          select: { type: true },
        });

        if (!group) {
          throw new NotFoundException('Group not found');
        }

        if (group.type === GroupType.CLASS && canManageClassDelegation(actorRole)) {
          // class teacher/inspector/admin can broadcast to class group
        } else {
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
            content: `Nouveau message dans « ${group?.name ?? 'groupe'} » de ${senderName}`,
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
    // Direct messages
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
      take: 300,
    });

    type DirectThreadSummary = {
      peer: { id: number; fullName: string; role: string };
      lastMessage: string;
      lastAt: string;
      messageId: number;
    };

    const receivedMap = new Map<number, DirectThreadSummary>();
    const sentMap = new Map<number, DirectThreadSummary>();

    for (const msg of directMessages) {
      if (msg.recipientId === currentUser.sub && msg.senderId !== currentUser.sub) {
        if (!receivedMap.has(msg.senderId)) {
          receivedMap.set(msg.senderId, {
            peer: {
              id: msg.sender.id,
              fullName: msg.sender.fullName,
              role: String(msg.sender.role),
            },
            lastMessage: msg.content,
            lastAt: msg.createdAt.toISOString(),
            messageId: msg.id,
          });
        }
      }

      if (
        msg.senderId === currentUser.sub &&
        msg.recipientId &&
        msg.recipientId !== currentUser.sub &&
        msg.recipient
      ) {
        if (!sentMap.has(msg.recipientId)) {
          sentMap.set(msg.recipientId, {
            peer: {
              id: msg.recipient.id,
              fullName: msg.recipient.fullName,
              role: String(msg.recipient.role),
            },
            lastMessage: msg.content,
            lastAt: msg.createdAt.toISOString(),
            messageId: msg.id,
          });
        }
      }
    }

    const received = Array.from(receivedMap.values()).sort((a, b) =>
      b.lastAt.localeCompare(a.lastAt),
    );
    const sent = Array.from(sentMap.values()).sort((a, b) =>
      b.lastAt.localeCompare(a.lastAt),
    );

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

    return { directMessages, groups, received, sent };
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

    // Auto-groups per academic class
    const classes = await this.prisma.academicClass.findMany({
      select: { id: true, name: true },
    });
    for (const cls of classes) {
      const existing = await this.prisma.messageGroup.findFirst({
        where: { type: GroupType.CLASS, referenceId: cls.id },
      });
      if (!existing) {
        await this.prisma.messageGroup.create({
          data: {
            name: `Classe: ${cls.name}`,
            type: GroupType.CLASS,
            referenceId: cls.id,
          },
        });
      }
    }
  }
}
