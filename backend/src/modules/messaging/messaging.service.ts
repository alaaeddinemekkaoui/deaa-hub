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

type GroupScope = 'mine' | 'all';
type GroupMemberSeed = { userId: number; canSend: boolean };

function canSendDirectMessage(
  senderRole: UserRole,
  recipientRole: UserRole,
): boolean {
  if (
    isAdmin(senderRole) ||
    senderRole === UserRole.INSPECTOR ||
    senderRole === UserRole.VIEWER
  ) {
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
  private systemGroupSyncPromise: Promise<void> | null = null;
  private lastSystemGroupSyncAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  // ─── Groups ────────────────────────────────────────────────────────────────

  async listGroups(currentUser: JwtPayload, scope: GroupScope = 'mine') {
    await this.ensureSystemGroupsSynced();

    const adminUser = isAdmin(currentUser.role);
    const groups = await this.prisma.messageGroup.findMany({
      where:
        adminUser || scope === 'all'
          ? adminUser
            ? {}
            : { type: { not: GroupType.ADMINS_ONLY } }
          : { members: { some: { userId: currentUser.sub } } },
      include: { _count: { select: { members: true, messages: true } } },
      orderBy: { name: 'asc' },
    });

    return this.withCurrentUserAccess(groups, currentUser);
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
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
      },
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

    const actorRole = currentUser.role;
    const canManage =
      isInspectorOrAdmin(actorRole) ||
      (group.type === GroupType.CLASS && canManageClassDelegation(actorRole));

    if (!canManage) {
      throw new ForbiddenException(
        'You are not allowed to change send permissions for this group',
      );
    }

    return this.prisma.messageGroupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: { canSend },
      create: { groupId, userId, canSend },
    });
  }

  async addGroupMember(
    groupId: number,
    userId: number,
    currentUser: JwtPayload,
  ) {
    if (!isInspectorOrAdmin(currentUser.role)) {
      throw new ForbiddenException(
        'Only admins/staff/inspectors can add group members',
      );
    }
    return this.prisma.messageGroupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      update: {},
      create: { groupId, userId, canSend: false },
    });
  }

  async removeGroupMember(
    groupId: number,
    userId: number,
    currentUser: JwtPayload,
  ) {
    if (!isInspectorOrAdmin(currentUser.role)) {
      throw new ForbiddenException(
        'Only admins/staff/inspectors can remove group members',
      );
    }
    return this.prisma.messageGroupMember.delete({
      where: { groupId_userId: { groupId, userId } },
    });
  }

  async updateGroup(id: number, name: string, currentUser: JwtPayload) {
    if (!isAdmin(currentUser.role)) {
      throw new ForbiddenException('Only admins can update groups');
    }
    const group = await this.prisma.messageGroup.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Group not found');
    return this.prisma.messageGroup.update({
      where: { id },
      data: { name: name.trim() },
      include: { _count: { select: { members: true, messages: true } } },
    });
  }

  async deleteGroup(id: number, currentUser: JwtPayload) {
    if (!isAdmin(currentUser.role)) {
      throw new ForbiddenException('Only admins can delete groups');
    }
    const group = await this.prisma.messageGroup.findUnique({
      where: { id },
      select: { id: true, type: true },
    });
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
    const actorRole = currentUser.role;
    const adminSender = isAdmin(actorRole);
    const sender = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
      select: { fullName: true, email: true },
    });
    const senderName =
      sender?.fullName?.trim() || sender?.email || currentUser.email;

    if (dto.recipientId !== undefined) {
      // 1:1 message
      const recipient = await this.prisma.user.findUnique({
        where: { id: dto.recipientId },
        select: { role: true },
      });
      if (!recipient) throw new NotFoundException('Recipient not found');

      if (!canSendDirectMessage(actorRole, recipient.role as UserRole)) {
        throw new ForbiddenException(
          'You are not allowed to send direct message to this user role',
        );
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

        if (
          group.type === GroupType.CLASS &&
          canManageClassDelegation(actorRole)
        ) {
          // class teacher/inspector/admin can broadcast to class group
        } else {
          const membership = await this.prisma.messageGroupMember.findUnique({
            where: {
              groupId_userId: { groupId: dto.groupId, userId: currentUser.sub },
            },
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

    throw new ForbiddenException(
      'Either recipientId or groupId must be provided',
    );
  }

  /** Conversation between current user and another user */
  async getConversation(
    otherUserId: number,
    currentUser: JwtPayload,
    limit = 50,
  ) {
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
      if (!membership)
        throw new ForbiddenException('Not a member of this group');
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
    await this.ensureSystemGroupsSynced();

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
      if (
        msg.recipientId === currentUser.sub &&
        msg.senderId !== currentUser.sub
      ) {
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
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        role: true,
        departments: { select: { departmentId: true } },
        studentProfile: {
          select: {
            classId: true,
            filiereId: true,
            academicClass: {
              select: {
                id: true,
                filiereId: true,
                cycleId: true,
                filiere: { select: { departmentId: true } },
              },
            },
            filiere: { select: { departmentId: true } },
          },
        },
        teacherProfile: {
          select: {
            departmentId: true,
            filiereId: true,
            filiere: { select: { departmentId: true } },
            taughtClasses: {
              select: {
                classId: true,
                class: {
                  select: {
                    filiereId: true,
                    cycleId: true,
                    filiere: { select: { departmentId: true } },
                  },
                },
              },
            },
            taughtCours: {
              select: {
                classId: true,
                class: {
                  select: {
                    filiereId: true,
                    cycleId: true,
                    filiere: { select: { departmentId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const everyoneGroup = await this.upsertSystemGroup(
      GroupType.EVERYONE,
      'Tout le monde',
      null,
    );
    await this.replaceGroupMembers(
      everyoneGroup.id,
      users.map((user) => ({
        userId: user.id,
        canSend: this.canSendToSystemGroup(
          user.role as UserRole,
          GroupType.EVERYONE,
        ),
      })),
    );

    const adminGroup = await this.upsertSystemGroup(
      GroupType.ADMINS_ONLY,
      'Administrateurs uniquement',
      null,
    );
    await this.replaceGroupMembers(
      adminGroup.id,
      users
        .filter((user) => isAdmin(user.role as UserRole))
        .map((user) => ({ userId: user.id, canSend: true })),
    );

    const departments = await this.prisma.department.findMany({
      select: { id: true, name: true },
    });
    for (const dept of departments) {
      const group = await this.upsertSystemGroup(
        GroupType.DEPARTMENT,
        `Département: ${dept.name}`,
        dept.id,
      );
      await this.replaceGroupMembers(
        group.id,
        users
          .filter((user) => this.getUserDepartmentIds(user).has(dept.id))
          .map((user) => ({
            userId: user.id,
            canSend: this.canSendToSystemGroup(
              user.role as UserRole,
              GroupType.DEPARTMENT,
            ),
          })),
      );
    }

    const filieres = await this.prisma.filiere.findMany({
      select: { id: true, name: true },
    });
    for (const filiere of filieres) {
      const group = await this.upsertSystemGroup(
        GroupType.FILIERE,
        `Filière: ${filiere.name}`,
        filiere.id,
      );
      await this.replaceGroupMembers(
        group.id,
        users
          .filter((user) => this.getUserFiliereIds(user).has(filiere.id))
          .map((user) => ({
            userId: user.id,
            canSend: this.canSendToSystemGroup(
              user.role as UserRole,
              GroupType.FILIERE,
            ),
          })),
      );
    }

    const cycles = await this.prisma.cycle.findMany({
      select: { id: true, name: true },
    });
    for (const cycle of cycles) {
      const group = await this.upsertSystemGroup(
        GroupType.CYCLE,
        `Cycle: ${cycle.name}`,
        cycle.id,
      );
      await this.replaceGroupMembers(
        group.id,
        users
          .filter((user) => this.getUserCycleIds(user).has(cycle.id))
          .map((user) => ({
            userId: user.id,
            canSend: this.canSendToSystemGroup(
              user.role as UserRole,
              GroupType.CYCLE,
            ),
          })),
      );
    }

    const classes = await this.prisma.academicClass.findMany({
      select: { id: true, name: true },
    });
    for (const academicClass of classes) {
      const group = await this.upsertSystemGroup(
        GroupType.CLASS,
        `Classe: ${academicClass.name}`,
        academicClass.id,
      );
      await this.replaceGroupMembers(
        group.id,
        users
          .filter((user) => this.getUserClassIds(user).has(academicClass.id))
          .map((user) => ({
            userId: user.id,
            canSend: this.canSendToSystemGroup(
              user.role as UserRole,
              GroupType.CLASS,
            ),
          })),
      );
    }
  }

  private async ensureSystemGroupsSynced() {
    const now = Date.now();
    if (now - this.lastSystemGroupSyncAt < 30_000) return;
    if (!this.systemGroupSyncPromise) {
      this.systemGroupSyncPromise = this.seedSystemGroups()
        .then(() => {
          this.lastSystemGroupSyncAt = Date.now();
        })
        .finally(() => {
          this.systemGroupSyncPromise = null;
        });
    }
    await this.systemGroupSyncPromise;
  }

  private async upsertSystemGroup(
    type: GroupType,
    name: string,
    referenceId: number | null,
  ) {
    const existing = await this.prisma.messageGroup.findFirst({
      where: { type, referenceId },
    });

    if (existing) {
      return this.prisma.messageGroup.update({
        where: { id: existing.id },
        data: { name },
      });
    }

    return this.prisma.messageGroup.create({
      data: { name, type, referenceId },
    });
  }

  private async replaceGroupMembers(
    groupId: number,
    members: GroupMemberSeed[],
  ) {
    const uniqueMembers = Array.from(
      new Map(members.map((member) => [member.userId, member])).values(),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.messageGroupMember.deleteMany({ where: { groupId } });
      if (!uniqueMembers.length) return;
      await tx.messageGroupMember.createMany({
        data: uniqueMembers.map((member) => ({ groupId, ...member })),
        skipDuplicates: true,
      });
    });
  }

  private async withCurrentUserAccess<T extends { id: number }>(
    groups: T[],
    currentUser: JwtPayload,
  ) {
    if (!groups.length) return [];
    const adminUser = isAdmin(currentUser.role);
    const memberships = await this.prisma.messageGroupMember.findMany({
      where: {
        userId: currentUser.sub,
        groupId: { in: groups.map((group) => group.id) },
      },
      select: { groupId: true, canSend: true },
    });
    const membershipByGroup = new Map(
      memberships.map((membership) => [membership.groupId, membership]),
    );

    return groups.map((group) => {
      const membership = membershipByGroup.get(group.id);
      return {
        ...group,
        isMember: adminUser || Boolean(membership),
        canSend: adminUser || Boolean(membership?.canSend),
      };
    });
  }

  private canSendToSystemGroup(role: UserRole, type: GroupType) {
    if (isAdmin(role) || role === UserRole.INSPECTOR) return true;
    if (role === UserRole.TEACHER) {
      return (
        [
          GroupType.DEPARTMENT,
          GroupType.FILIERE,
          GroupType.CYCLE,
          GroupType.CLASS,
        ] as GroupType[]
      ).includes(type);
    }
    return false;
  }

  private getUserDepartmentIds(user: {
    departments: { departmentId: number }[];
    studentProfile: {
      filiere?: { departmentId: number } | null;
      academicClass?: { filiere?: { departmentId: number } | null } | null;
    } | null;
    teacherProfile: {
      departmentId: number;
      filiere?: { departmentId: number } | null;
      taughtClasses: {
        class: { filiere?: { departmentId: number } | null };
      }[];
      taughtCours: {
        class: { filiere?: { departmentId: number } | null };
      }[];
    } | null;
  }) {
    const ids = new Set<number>();
    user.departments.forEach((department) => ids.add(department.departmentId));
    if (user.studentProfile?.filiere?.departmentId) {
      ids.add(user.studentProfile.filiere.departmentId);
    }
    if (user.studentProfile?.academicClass?.filiere?.departmentId) {
      ids.add(user.studentProfile.academicClass.filiere.departmentId);
    }
    if (user.teacherProfile?.departmentId) {
      ids.add(user.teacherProfile.departmentId);
    }
    if (user.teacherProfile?.filiere?.departmentId) {
      ids.add(user.teacherProfile.filiere.departmentId);
    }
    user.teacherProfile?.taughtClasses.forEach((item) => {
      if (item.class.filiere?.departmentId)
        ids.add(item.class.filiere.departmentId);
    });
    user.teacherProfile?.taughtCours.forEach((item) => {
      if (item.class.filiere?.departmentId)
        ids.add(item.class.filiere.departmentId);
    });
    return ids;
  }

  private getUserFiliereIds(user: {
    studentProfile: {
      filiereId: number | null;
      academicClass?: { filiereId: number | null } | null;
    } | null;
    teacherProfile: {
      filiereId: number | null;
      taughtClasses: { class: { filiereId: number | null } }[];
      taughtCours: { class: { filiereId: number | null } }[];
    } | null;
  }) {
    const ids = new Set<number>();
    if (user.studentProfile?.filiereId) ids.add(user.studentProfile.filiereId);
    if (user.studentProfile?.academicClass?.filiereId) {
      ids.add(user.studentProfile.academicClass.filiereId);
    }
    if (user.teacherProfile?.filiereId) ids.add(user.teacherProfile.filiereId);
    user.teacherProfile?.taughtClasses.forEach((item) => {
      if (item.class.filiereId) ids.add(item.class.filiereId);
    });
    user.teacherProfile?.taughtCours.forEach((item) => {
      if (item.class.filiereId) ids.add(item.class.filiereId);
    });
    return ids;
  }

  private getUserCycleIds(user: {
    studentProfile: {
      academicClass?: { cycleId: number | null } | null;
    } | null;
    teacherProfile: {
      taughtClasses: { class: { cycleId: number | null } }[];
      taughtCours: { class: { cycleId: number | null } }[];
    } | null;
  }) {
    const ids = new Set<number>();
    if (user.studentProfile?.academicClass?.cycleId) {
      ids.add(user.studentProfile.academicClass.cycleId);
    }
    user.teacherProfile?.taughtClasses.forEach((item) => {
      if (item.class.cycleId) ids.add(item.class.cycleId);
    });
    user.teacherProfile?.taughtCours.forEach((item) => {
      if (item.class.cycleId) ids.add(item.class.cycleId);
    });
    return ids;
  }

  private getUserClassIds(user: {
    studentProfile: {
      classId: number | null;
      academicClass?: { id: number } | null;
    } | null;
    teacherProfile: {
      taughtClasses: { classId: number }[];
      taughtCours: { classId: number }[];
    } | null;
  }) {
    const ids = new Set<number>();
    if (user.studentProfile?.classId) ids.add(user.studentProfile.classId);
    if (user.studentProfile?.academicClass?.id) {
      ids.add(user.studentProfile.academicClass.id);
    }
    user.teacherProfile?.taughtClasses.forEach((item) => ids.add(item.classId));
    user.teacherProfile?.taughtCours.forEach((item) => ids.add(item.classId));
    return ids;
  }
}
