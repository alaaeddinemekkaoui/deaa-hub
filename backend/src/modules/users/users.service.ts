import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { GroupType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TtlCache } from '../../common/utils/ttl-cache';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  createdAt: true,
  departments: {
    select: {
      department: {
        select: { id: true, name: true },
      },
    },
  },
} as const;

type UserWithDepts = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  createdAt: Date;
  departments: { department: { id: number; name: string } }[];
};

type MappedUser = Omit<UserWithDepts, 'departments'> & {
  departments: { id: number; name: string }[];
};

type LoginUser = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  passwordHash: string;
  departments: { department: { id: number; name: string } }[];
};

function mapDepartments(user: UserWithDepts): MappedUser {
  const { departments, ...rest } = user;
  return {
    ...rest,
    departments: departments.map((ud) => ud.department),
  };
}

function mapLoginDepartments(user: LoginUser) {
  const { departments, ...rest } = user;
  return {
    ...rest,
    departments: departments.map((ud) => ud.department),
  };
}

@Injectable()
export class UsersService {
  private readonly listCache = new TtlCache<MappedUser[]>({
    key: 'users:list',
    ttlMs: 5 * 60 * 1000,
    staleTtlMs: 30 * 60 * 1000,
  });

  constructor(private readonly prisma: PrismaService) {}

  invalidateListCache() {
    this.listCache.invalidate();
  }

  async findAll() {
    return this.listCache.getOrLoad(async () => {
      const users = await this.prisma.user.findMany({
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
      });
      return users.map(mapDepartments);
    });
  }

  findForMessaging() {
    return this.prisma.user.findMany({
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) return null;
    return mapDepartments(user);
  }

  async findLinkedProfiles(userId: number) {
    const [student, teacher] = await Promise.all([
      this.prisma.student.findUnique({
        where: { userId },
        select: { id: true, classId: true, fullName: true },
      }),
      this.prisma.teacher.findUnique({
        where: { userId },
        select: { id: true, departmentId: true, firstName: true, lastName: true },
      }),
    ]);

    return { student, teacher };
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByLoginIdentifier(identifier: string) {
    return this.prisma.user
      .findFirst({
        where: {
          OR: [
            { email: { equals: identifier, mode: 'insensitive' } },
            { fullName: { equals: identifier, mode: 'insensitive' } },
            {
              studentProfile: {
                codeEtudiant: { equals: identifier, mode: 'insensitive' },
              },
            },
          ],
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          passwordHash: true,
          departments: {
            select: {
              department: {
                select: { id: true, name: true },
              },
            },
          },
        },
      })
      .then((user) => (user ? mapLoginDepartments(user) : null));
  }

  async getUserDepartments(userId: number) {
    const records = await this.prisma.userDepartment.findMany({
      where: { userId },
      select: { department: { select: { id: true, name: true } } },
    });
    return records.map((r) => r.department);
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        role: dto.role,
        passwordHash,
        departments: dto.departmentIds?.length
          ? {
              create: dto.departmentIds.map((departmentId) => ({
                departmentId,
              })),
            }
          : undefined,
      },
      select: USER_SELECT,
    });

    await this.syncUserMessagingGroups({
      userId: user.id,
      role: user.role,
      departmentIds: user.departments.map((ud) => ud.department.id),
    });

    this.listCache.invalidate();
    return mapDepartments(user);
  }

  async update(id: number, dto: UpdateUserDto) {
    const { departmentIds, password, ...rest } = dto;

    const data: Record<string, unknown> = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await this.prisma.$transaction(async (tx) => {
      if (departmentIds !== undefined) {
        await tx.userDepartment.deleteMany({ where: { userId: id } });
        if (departmentIds.length > 0) {
          await tx.userDepartment.createMany({
            data: departmentIds.map((departmentId) => ({
              userId: id,
              departmentId,
            })),
          });
        }
      }

      return tx.user.update({
        where: { id },
        data,
        select: USER_SELECT,
      });
    });

    await this.syncUserMessagingGroups({
      userId: user.id,
      role: user.role,
      departmentIds: user.departments.map((ud) => ud.department.id),
    });

    this.listCache.invalidate();
    return mapDepartments(user);
  }

  async remove(id: number) {
    const deleted = await this.prisma.$transaction(async (tx) => {
      await tx.student.updateMany({
        where: { userId: id },
        data: { userId: null },
      });
      await tx.teacher.updateMany({
        where: { userId: id },
        data: { userId: null },
      });

      return tx.user.delete({ where: { id } });
    });

    this.listCache.invalidate();
    return deleted;
  }

  // ─── Account reconciliation ──────────────────────────────────────────────

  async getUnlinkedProfiles() {
    const [students, teachers] = await Promise.all([
      this.prisma.student.findMany({
        where: { userId: null },
        select: {
          id: true,
          fullName: true,
          codeMassar: true,
          codeEtudiant: true,
        },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.teacher.findMany({
        where: { userId: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          cin: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
    ]);

    return {
      students: students.map((s) => ({
        id: s.id,
        fullName: s.fullName,
        identifier: s.codeEtudiant ?? s.codeMassar,
      })),
      teachers: teachers.map((t) => ({
        id: t.id,
        fullName: `${t.firstName} ${t.lastName}`.trim(),
        identifier: t.email ?? t.cin ?? null,
      })),
    };
  }

  /**
   * Bulk-create User accounts for all unlinked students and teachers.
   * Uses codeMassar as default password for students, cin / last.first as identifier.
   */
  async bulkImportAccounts(defaultPassword: string): Promise<{
    students: { created: number; skipped: number };
    teachers: { created: number; skipped: number };
    errors: string[];
  }> {
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    const errors: string[] = [];

    const [unlinkedStudents, unlinkedTeachers] = await Promise.all([
      this.prisma.student.findMany({
        where: { userId: null },
        select: {
          id: true,
          fullName: true,
          email: true,
          codeEtudiant: true,
          codeMassar: true,
          classId: true,
          filiereId: true,
          filiere: { select: { departmentId: true } },
          academicClass: {
            select: { filiere: { select: { departmentId: true } } },
          },
        },
      }),
      this.prisma.teacher.findMany({
        where: { userId: null },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          cin: true,
          departmentId: true,
          filiereId: true,
        },
      }),
    ]);

    let studentsCreated = 0;
    let studentsSkipped = 0;
    let teachersCreated = 0;
    let teachersSkipped = 0;

    // Students
    for (const s of unlinkedStudents) {
      try {
        const identifier = s.codeEtudiant ?? s.codeMassar;
        const email = s.email ?? `${identifier}@iav.ac.ma`;
        const existing = await this.prisma.user.findUnique({
          where: { email },
        });
        if (existing) {
          studentsSkipped++;
          continue;
        }
        const departmentId =
          s.academicClass?.filiere?.departmentId ??
          s.filiere?.departmentId ??
          null;
        const user = await this.prisma.user.create({
          data: {
            fullName: s.fullName,
            email,
            role: 'student',
            passwordHash,
            ...(departmentId
              ? { departments: { create: [{ departmentId }] } }
              : {}),
          },
          select: { id: true },
        });
        await this.prisma.student.update({
          where: { id: s.id },
          data: { userId: user.id },
        });
        await this.syncUserMessagingGroups({
          userId: user.id,
          role: 'student',
          departmentIds: departmentId ? [departmentId] : [],
        });
        studentsCreated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Student ${s.id}: ${msg}`);
      }
    }

    // Teachers
    for (const t of unlinkedTeachers) {
      try {
        const identifier =
          t.cin ?? `${t.lastName.toLowerCase()}.${t.firstName.toLowerCase()}`;
        const email = t.email ?? `${identifier}@iav.ac.ma`;
        const existing = await this.prisma.user.findUnique({
          where: { email },
        });
        if (existing) {
          teachersSkipped++;
          continue;
        }
        const user = await this.prisma.user.create({
          data: {
            fullName: `${t.firstName} ${t.lastName}`.trim(),
            email,
            role: 'teacher',
            passwordHash,
            departments: { create: [{ departmentId: t.departmentId }] },
          },
          select: { id: true },
        });
        await this.prisma.teacher.update({
          where: { id: t.id },
          data: { userId: user.id },
        });
        await this.syncUserMessagingGroups({
          userId: user.id,
          role: 'teacher',
          departmentIds: [t.departmentId],
        });
        teachersCreated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Teacher ${t.id}: ${msg}`);
      }
    }

    this.listCache.invalidate();
    return {
      students: { created: studentsCreated, skipped: studentsSkipped },
      teachers: { created: teachersCreated, skipped: teachersSkipped },
      errors,
    };
  }

  async syncMessagingGroups() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        role: true,
        departments: { select: { departmentId: true } },
      },
      orderBy: { id: 'asc' },
    });

    for (const user of users) {
      await this.syncUserMessagingGroups({
        userId: user.id,
        role: user.role,
        departmentIds: user.departments.map((item) => item.departmentId),
      });
    }

    return {
      processedUsers: users.length,
      message: 'Synchronisation des groupes de messagerie terminée',
    };
  }

  private isAdminLikeRole(role: string): boolean {
    return role === 'admin' || role === 'staff';
  }

  /**
   * Keep user membership synchronized with messaging policy:
   * - Everyone group (all users)
   * - Admins-only group (admin/staff only)
   * - Department groups (department-scoped users)
   */
  private async syncUserMessagingGroups(params: {
    userId: number;
    role: string;
    departmentIds: number[];
  }): Promise<void> {
    const { userId, role, departmentIds } = params;
    const isAdminLike = this.isAdminLikeRole(role);

    const everyoneGroup = await this.prisma.messageGroup.findFirst({
      where: { type: GroupType.EVERYONE },
      select: { id: true },
    });

    if (everyoneGroup) {
      await this.prisma.messageGroupMember.upsert({
        where: {
          groupId_userId: { groupId: everyoneGroup.id, userId },
        },
        update: { canSend: isAdminLike },
        create: {
          groupId: everyoneGroup.id,
          userId,
          canSend: isAdminLike,
        },
      });
    }

    const adminsOnlyGroup = await this.prisma.messageGroup.findFirst({
      where: { type: GroupType.ADMINS_ONLY },
      select: { id: true },
    });

    if (adminsOnlyGroup) {
      if (isAdminLike) {
        await this.prisma.messageGroupMember.upsert({
          where: {
            groupId_userId: { groupId: adminsOnlyGroup.id, userId },
          },
          update: { canSend: true },
          create: {
            groupId: adminsOnlyGroup.id,
            userId,
            canSend: true,
          },
        });
      } else {
        await this.prisma.messageGroupMember.deleteMany({
          where: { groupId: adminsOnlyGroup.id, userId },
        });
      }
    }

    const currentDepartmentGroupMemberships =
      await this.prisma.messageGroupMember.findMany({
        where: {
          userId,
          group: { type: GroupType.DEPARTMENT },
        },
        select: { groupId: true },
      });

    if (currentDepartmentGroupMemberships.length > 0) {
      await this.prisma.messageGroupMember.deleteMany({
        where: {
          userId,
          groupId: {
            in: currentDepartmentGroupMemberships.map((m) => m.groupId),
          },
        },
      });
    }

    if (departmentIds.length > 0) {
      const targetDepartmentGroups = await this.prisma.messageGroup.findMany({
        where: {
          type: GroupType.DEPARTMENT,
          referenceId: { in: departmentIds },
        },
        select: { id: true },
      });

      if (targetDepartmentGroups.length > 0) {
        await this.prisma.messageGroupMember.createMany({
          data: targetDepartmentGroups.map((group) => ({
            groupId: group.id,
            userId,
            canSend: false,
          })),
          skipDuplicates: true,
        });
      }
    }
  }
}
