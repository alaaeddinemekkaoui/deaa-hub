import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReservationStatus, RoomReservationPurpose } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionQueryDto } from './dto/session-query.dto';
import { TimetableHolidayDto } from './dto/timetable-holiday.dto';

const SESSION_INCLUDE = {
  element: {
    include: {
      module: { select: { id: true, name: true } },
      cours: { select: { id: true, name: true } },
    },
  },
  class: { select: { id: true, name: true, year: true } },
  teacher: { select: { id: true, firstName: true, lastName: true } },
  room: { select: { id: true, name: true } },
  groupAssignments: {
    include: { group: { select: { id: true, name: true, type: true } } },
  },
} as const;
type SessionWithInclude = Prisma.TimetableSessionGetPayload<{
  include: typeof SESSION_INCLUDE;
}>;
type ConflictSession = {
  id: number;
  classId: number;
  teacherId: number | null;
  roomId: number | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  groupAssignments?: { groupId: number }[];
};
type AutoSlot = { day: number; slot: readonly [string, string]; key: string };

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: SessionQueryDto, departmentIds?: number[]) {
    const { page, limit, classId, teacherId, roomId, dayOfWeek, weekStart } =
      query;
    const filters: Prisma.TimetableSessionWhereInput[] = [];

    if (classId) filters.push({ classId });
    if (teacherId) filters.push({ teacherId });
    if (roomId) filters.push({ roomId });
    if (dayOfWeek) filters.push({ dayOfWeek });
    if (weekStart) filters.push({ weekStart: this.parseOptionalDate(weekStart) });
    if (departmentIds !== undefined) {
      filters.push({
        class: { filiere: { is: { departmentId: { in: departmentIds } } } },
      });
    }

    const where: Prisma.TimetableSessionWhereInput = filters.length
      ? { AND: filters }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.timetableSession.findMany({
        where,
        include: SESSION_INCLUDE,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.timetableSession.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findWeek(classId: number, weekStart: string) {
    const sessions = await this.prisma.timetableSession.findMany({
      where: { classId, weekStart: this.parseRequiredDate(weekStart, 'weekStart') },
      include: SESSION_INCLUDE,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    const conflicts = this.detectConflicts(sessions);
    return { sessions, conflicts };
  }

  async findOneDetailed(id: number) {
    const session = await this.prisma.timetableSession.findUnique({
      where: { id },
      include: {
        ...SESSION_INCLUDE,
        attendanceRecords: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                codeMassar: true,
                codeEtudiant: true,
              },
            },
          },
          orderBy: { student: { fullName: 'asc' } },
        },
      },
    });
    if (!session) throw new NotFoundException(`Session ${id} not found`);
    return session;
  }

  async create(dto: CreateSessionDto) {
    await this.ensureElementExists(dto.elementId);
    await this.ensureClassExists(dto.classId);
    if (dto.teacherId) await this.ensureTeacherExists(dto.teacherId);
    if (dto.roomId) await this.ensureRoomExists(dto.roomId);
    const groupIds = await this.ensureGroupsBelongToClass(
      dto.classId,
      dto.groupIds,
    );

    const session = await this.prisma.timetableSession.create({
      data: {
        elementId: dto.elementId,
        classId: dto.classId,
        teacherId: dto.teacherId ?? null,
        roomId: dto.roomId ?? null,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        weekStart: this.parseOptionalDate(dto.weekStart),
        ...(groupIds.length
          ? {
              groupAssignments: {
                create: groupIds.map((groupId) => ({ groupId })),
              },
            }
          : {}),
      },
      include: SESSION_INCLUDE,
    });

    await this.syncRoomReservationForSession(session);

    return session;
  }

  async autoAffectWeek(classId: number, weekStart: string) {
    await this.ensureClassExists(classId);
    const parsedWeekStart = this.parseRequiredDate(weekStart, 'weekStart');
    const existing = await this.prisma.timetableSession.findMany({
      where: { classId, weekStart: parsedWeekStart },
      select: { elementId: true, dayOfWeek: true, startTime: true, endTime: true },
    });
    const scheduledElementIds = new Set(existing.map((item) => item.elementId));
    const elements = await this.prisma.elementModule.findMany({
      where: {
        OR: [
          { classId },
          { module: { classes: { some: { classId } } } },
        ],
      },
      include: { module: { select: { name: true } } },
      orderBy: { id: 'asc' },
    });
    const teachers = await this.prisma.teacherClass.findMany({
      where: { classId },
      select: { teacherId: true },
    });
    const rooms = await this.prisma.room.findMany({
      where: { availability: true },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    const slots = [
      ['08:00', '10:00'],
      ['10:00', '12:00'],
      ['14:00', '16:00'],
      ['16:00', '18:00'],
    ] as const;
    const occupied = new Set(existing.map((item) => `${item.dayOfWeek}-${item.startTime}`));
    let created = 0;
    const sessions: SessionWithInclude[] = [];

    for (const element of elements) {
      if (scheduledElementIds.has(element.id)) continue;
      const candidates: AutoSlot[] = [];
      for (let day = 1; day <= 5; day++) {
        for (const slot of slots) {
          const key = `${day}-${slot[0]}`;
          if (!occupied.has(key)) candidates.push({ day, slot, key });
        }
      }
      if (candidates.length === 0) break;
      const candidate = candidates[Math.floor(Math.random() * candidates.length)];
      occupied.add(candidate.key);
      const teacher = teachers.length
        ? teachers[Math.floor(Math.random() * teachers.length)]
        : null;
      const room = rooms.length ? rooms[Math.floor(Math.random() * rooms.length)] : null;
      const session = await this.prisma.timetableSession.create({
        data: {
          elementId: element.id,
          classId,
          teacherId: teacher?.teacherId ?? null,
          roomId: room?.id ?? null,
          dayOfWeek: candidate.day,
          startTime: candidate.slot[0],
          endTime: element.sessionDurationMinutes
            ? this.addMinutes(candidate.slot[0], element.sessionDurationMinutes)
            : candidate.slot[1],
          weekStart: parsedWeekStart,
        },
        include: SESSION_INCLUDE,
      });
      await this.syncRoomReservationForSession(session);
      sessions.push(session);
      created++;
    }

    return { created, sessions, conflicts: this.detectConflicts(sessions) };
  }

  async update(id: number, dto: Partial<CreateSessionDto>) {
    const current = await this.ensureSessionExists(id);
    if (dto.elementId) await this.ensureElementExists(dto.elementId);
    if (dto.classId) await this.ensureClassExists(dto.classId);
    if (dto.teacherId) await this.ensureTeacherExists(dto.teacherId);
    if (dto.roomId) await this.ensureRoomExists(dto.roomId);
    const classId = dto.classId ?? current.classId;
    const groupIds =
      dto.groupIds !== undefined
        ? await this.ensureGroupsBelongToClass(classId, dto.groupIds)
        : undefined;

    const updated = await this.prisma.timetableSession.update({
      where: { id },
      data: {
        ...(dto.elementId !== undefined ? { elementId: dto.elementId } : {}),
        ...(dto.classId !== undefined ? { classId: dto.classId } : {}),
        ...(dto.teacherId !== undefined
          ? { teacherId: dto.teacherId ?? null }
          : {}),
        ...(dto.roomId !== undefined ? { roomId: dto.roomId ?? null } : {}),
        ...(dto.dayOfWeek !== undefined ? { dayOfWeek: dto.dayOfWeek } : {}),
        ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
        ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
        ...(dto.weekStart !== undefined
          ? { weekStart: this.parseOptionalDate(dto.weekStart) }
          : {}),
        ...(groupIds !== undefined
          ? {
              groupAssignments: {
                deleteMany: {},
                ...(groupIds.length
                  ? { create: groupIds.map((groupId) => ({ groupId })) }
                  : {}),
              },
            }
          : {}),
      },
      include: SESSION_INCLUDE,
    });

    await this.syncRoomReservationForSession(updated);
    return updated;
  }

  async remove(id: number) {
    await this.ensureSessionExists(id);
    const deleted = await this.prisma.timetableSession.delete({ where: { id } });
    await this.removeRoomReservationForSession(id);
    return deleted;
  }

  async checkConflicts(classId: number, weekStart?: string) {
    const where: Prisma.TimetableSessionWhereInput = { classId };
    if (weekStart) where.weekStart = this.parseOptionalDate(weekStart);
    const sessions = await this.prisma.timetableSession.findMany({
      where,
      include: SESSION_INCLUDE,
    });
    return this.detectConflicts(sessions);
  }

  findHolidays() {
    return this.prisma.timetableHoliday.findMany({
      orderBy: { date: 'asc' },
    });
  }

  createHoliday(dto: TimetableHolidayDto) {
    this.parseRequiredDate(dto.date, 'date');
    return this.prisma.timetableHoliday.create({
      data: {
        date: dto.date,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      },
    });
  }

  updateHoliday(id: number, dto: TimetableHolidayDto) {
    this.parseRequiredDate(dto.date, 'date');
    return this.prisma.timetableHoliday.update({
      where: { id },
      data: {
        date: dto.date,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      },
    });
  }

  removeHoliday(id: number) {
    return this.prisma.timetableHoliday.delete({ where: { id } });
  }

  private detectConflicts(sessions: ConflictSession[]) {
    const conflicts: { sessionIds: number[]; reason: string }[] = [];

    for (let i = 0; i < sessions.length; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const a = sessions[i];
        const b = sessions[j];
        if (a.dayOfWeek !== b.dayOfWeek) continue;
        if (!this.timesOverlap(a.startTime, a.endTime, b.startTime, b.endTime))
          continue;

        if (a.teacherId && b.teacherId && a.teacherId === b.teacherId) {
          conflicts.push({
            sessionIds: [a.id, b.id],
            reason: 'Même enseignant en même temps',
          });
        }
        if (a.roomId && b.roomId && a.roomId === b.roomId) {
          conflicts.push({
            sessionIds: [a.id, b.id],
            reason: 'Même salle en même temps',
          });
        }
        if (this.sessionsShareClassScope(a, b)) {
          conflicts.push({
            sessionIds: [a.id, b.id],
            reason: 'Même classe/groupe en même temps',
          });
        }
      }
    }

    return conflicts;
  }

  private sessionsShareClassScope(a: ConflictSession, b: ConflictSession) {
    if (a.classId !== b.classId) return false;
    const aGroupIds = a.groupAssignments?.map((item) => item.groupId) ?? [];
    const bGroupIds = b.groupAssignments?.map((item) => item.groupId) ?? [];
    if (aGroupIds.length === 0 || bGroupIds.length === 0) return true;
    const bSet = new Set(bGroupIds);
    return aGroupIds.some((groupId) => bSet.has(groupId));
  }

  private timesOverlap(s1: string, e1: string, s2: string, e2: string) {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
  }

  private addMinutes(time: string, minutes: number) {
    const [hours, mins] = time.split(':').map(Number);
    const total = hours * 60 + mins + minutes;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  private parseRequiredDate(value: string | null | undefined, field: string) {
    const parsed = this.parseOptionalDate(value);
    if (!parsed) throw new BadRequestException(`${field} invalide`);
    return parsed;
  }

  private parseOptionalDate(value: string | null | undefined) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Date invalide');
    }
    return parsed;
  }

  private async ensureSessionExists(id: number) {
    const s = await this.prisma.timetableSession.findUnique({
      where: { id },
      select: { id: true, classId: true },
    });
    if (!s) throw new NotFoundException(`Session ${id} not found`);
    return s;
  }
  private async ensureElementExists(id: number) {
    const e = await this.prisma.elementModule.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!e) throw new NotFoundException(`ElementModule ${id} not found`);
  }
  private async ensureClassExists(id: number) {
    const c = await this.prisma.academicClass.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!c) throw new NotFoundException(`Class ${id} not found`);
  }
  private async ensureTeacherExists(id: number) {
    const t = await this.prisma.teacher.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!t) throw new NotFoundException(`Teacher ${id} not found`);
  }
  private async ensureRoomExists(id: number) {
    const r = await this.prisma.room.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!r) throw new NotFoundException(`Room ${id} not found`);
  }

  private async ensureGroupsBelongToClass(
    classId: number,
    groupIds?: number[] | null,
  ) {
    const normalized = Array.from(
      new Set((groupIds ?? []).map((value) => Number(value)).filter(Boolean)),
    );
    if (normalized.length === 0) return [];

    const groups = await this.prisma.classGroup.findMany({
      where: { id: { in: normalized }, classId },
      select: { id: true },
    });
    if (groups.length !== normalized.length) {
      throw new BadRequestException(
        'Un ou plusieurs groupes ne correspondent pas à la classe sélectionnée',
      );
    }
    return normalized;
  }

  private async syncRoomReservationForSession(
    session: {
      id: number;
      roomId: number | null;
      classId: number;
      teacherId: number | null;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      weekStart: Date | null;
      class?: { name: string; year: number } | null;
      teacher?: { firstName: string; lastName: string } | null;
      element?: { name: string; module?: { name: string } | null } | null;
      groupAssignments?: {
        group?: { name: string; type: string } | null;
      }[];
    },
  ) {
    await this.removeRoomReservationForSession(session.id);

    if (!session.roomId || !session.weekStart) return;

    const reservationDate = this.dateFromWeekStart(
      session.weekStart,
      session.dayOfWeek,
    );

    await this.prisma.roomReservation.create({
      data: {
        roomId: session.roomId,
        classId: session.classId,
        date: reservationDate,
        dayOfWeek: session.dayOfWeek,
        startTime: session.startTime,
        endTime: session.endTime,
        reservedBy: session.teacher
          ? `${session.teacher.firstName} ${session.teacher.lastName}`.trim()
          : `Emploi du temps ${session.class?.name ?? ''}`.trim(),
        purpose: RoomReservationPurpose.cours,
        notes: this.buildTimetableReservationNote(session),
        status: ReservationStatus.approved,
      },
    });
  }

  private async removeRoomReservationForSession(sessionId: number) {
    await this.prisma.roomReservation.deleteMany({
      where: {
        purpose: RoomReservationPurpose.cours,
        notes: { contains: `[TIMETABLE_SESSION:${sessionId}]` },
      },
    });
  }

  private buildTimetableReservationNote(session: {
    id: number;
    class?: { name: string; year: number } | null;
    element?: { name: string; module?: { name: string } | null } | null;
    groupAssignments?: {
      group?: { name: string; type: string } | null;
    }[];
  }) {
    const groupLabel = session.groupAssignments?.length
      ? session.groupAssignments
          .map((item) =>
            item.group ? `${item.group.type} ${item.group.name}` : null,
          )
          .filter(Boolean)
          .join(', ')
      : 'Toute la classe';
    return `[TIMETABLE_SESSION:${session.id}] Réservation automatique emploi du temps · ${session.class?.name ?? 'Classe'} · ${groupLabel} · ${session.element?.module?.name ?? ''} ${session.element?.name ?? ''}`.trim();
  }

  private dateFromWeekStart(weekStart: Date, dayOfWeek: number) {
    const date = new Date(weekStart);
    date.setUTCDate(date.getUTCDate() + dayOfWeek - 1);
    return date.toISOString().slice(0, 10);
  }
}
