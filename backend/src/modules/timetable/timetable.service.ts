import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionQueryDto } from './dto/session-query.dto';

const SESSION_INCLUDE = {
  element: { include: { module: { select: { id: true, name: true } } } },
  class: { select: { id: true, name: true, year: true } },
  teacher: { select: { id: true, firstName: true, lastName: true } },
  room: { select: { id: true, name: true } },
} as const;

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: SessionQueryDto) {
    const { page, limit, classId, teacherId, roomId, dayOfWeek, weekStart } =
      query;
    const filters: Prisma.TimetableSessionWhereInput[] = [];

    if (classId) filters.push({ classId });
    if (teacherId) filters.push({ teacherId });
    if (roomId) filters.push({ roomId });
    if (dayOfWeek) filters.push({ dayOfWeek });
    if (weekStart) filters.push({ weekStart: new Date(weekStart) });

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
      where: { classId, weekStart: new Date(weekStart) },
      include: SESSION_INCLUDE,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    const conflicts = this.detectConflicts(sessions);
    return { sessions, conflicts };
  }

  async create(dto: CreateSessionDto) {
    await this.ensureElementExists(dto.elementId);
    await this.ensureClassExists(dto.classId);
    if (dto.teacherId) await this.ensureTeacherExists(dto.teacherId);
    if (dto.roomId) await this.ensureRoomExists(dto.roomId);

    const session = await this.prisma.timetableSession.create({
      data: {
        elementId: dto.elementId,
        classId: dto.classId,
        teacherId: dto.teacherId ?? null,
        roomId: dto.roomId ?? null,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        weekStart: dto.weekStart ? new Date(dto.weekStart) : null,
      },
      include: SESSION_INCLUDE,
    });

    return session;
  }

  async update(id: number, dto: Partial<CreateSessionDto>) {
    await this.ensureSessionExists(id);
    if (dto.elementId) await this.ensureElementExists(dto.elementId);
    if (dto.classId) await this.ensureClassExists(dto.classId);
    if (dto.teacherId) await this.ensureTeacherExists(dto.teacherId);
    if (dto.roomId) await this.ensureRoomExists(dto.roomId);

    return this.prisma.timetableSession.update({
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
          ? { weekStart: dto.weekStart ? new Date(dto.weekStart) : null }
          : {}),
      },
      include: SESSION_INCLUDE,
    });
  }

  async remove(id: number) {
    await this.ensureSessionExists(id);
    return this.prisma.timetableSession.delete({ where: { id } });
  }

  async checkConflicts(classId: number, weekStart?: string) {
    const where: Prisma.TimetableSessionWhereInput = { classId };
    if (weekStart) where.weekStart = new Date(weekStart);
    const sessions = await this.prisma.timetableSession.findMany({
      where,
      include: SESSION_INCLUDE,
    });
    return this.detectConflicts(sessions);
  }

  private detectConflicts(
    sessions: Awaited<ReturnType<typeof this.prisma.timetableSession.findMany>>,
  ) {
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
        if (a.classId === b.classId) {
          conflicts.push({
            sessionIds: [a.id, b.id],
            reason: 'Même classe en même temps',
          });
        }
      }
    }

    return conflicts;
  }

  private timesOverlap(s1: string, e1: string, s2: string, e2: string) {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
  }

  private async ensureSessionExists(id: number) {
    const s = await this.prisma.timetableSession.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!s) throw new NotFoundException(`Session ${id} not found`);
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
}
