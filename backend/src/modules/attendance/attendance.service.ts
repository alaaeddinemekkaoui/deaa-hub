import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceMethod, AttendanceStatus, Prisma, UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { EnableAttendanceDto } from './dto/enable-attendance.dto';
import { ManualAttendanceDto } from './dto/manual-attendance.dto';

const SESSION_INCLUDE = {
  class: {
    select: {
      id: true,
      name: true,
      year: true,
      filiereId: true,
      filiere: { select: { id: true, name: true, departmentId: true } },
    },
  },
  element: {
    include: {
      module: { select: { id: true, name: true } },
      cours: { select: { id: true, name: true } },
    },
  },
  teacher: { select: { id: true, firstName: true, lastName: true, userId: true } },
  room: { select: { id: true, name: true } },
} satisfies Prisma.TimetableSessionInclude;

type SessionWithAttendance = Prisma.TimetableSessionGetPayload<{
  include: typeof SESSION_INCLUDE;
}>;

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getOptions(
    user: JwtPayload,
    query: { classId?: number; courseId?: number; dateFrom?: string; dateTo?: string },
  ) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: user.sub },
      select: { id: true, departmentId: true },
    });
    const departmentScope =
      user.role === UserRole.inspector || user.role === UserRole.user
        ? user.departmentIds
        : undefined;

    const classWhere: Prisma.AcademicClassWhereInput = {};
    if (departmentScope) classWhere.filiere = { is: { departmentId: { in: departmentScope } } };
    if (user.role === UserRole.teacher && teacher) {
      classWhere.cours = { some: { teacherId: teacher.id } };
    }

    const classes = await this.prisma.academicClass.findMany({
      where: classWhere,
      select: { id: true, name: true, year: true },
      orderBy: [{ name: 'asc' }],
    });

    const coursWhere: Prisma.CoursWhereInput = {};
    if (query.classId) coursWhere.classes = { some: { classId: query.classId } };
    if (user.role === UserRole.teacher && teacher) {
      coursWhere.classes = {
        some: {
          ...(query.classId ? { classId: query.classId } : {}),
          teacherId: teacher.id,
        },
      };
    }
    if (departmentScope) {
      coursWhere.classes = {
        some: {
          ...(query.classId ? { classId: query.classId } : {}),
          class: { filiere: { is: { departmentId: { in: departmentScope } } } },
        },
      };
    }

    const courses = await this.prisma.cours.findMany({
      where: coursWhere,
      select: { id: true, name: true, type: true, elementModule: { select: { volumeHoraire: true } } },
      orderBy: { name: 'asc' },
    });

    const sessionWhere = await this.buildOverviewWhere(user, query);
    const sessions = await this.prisma.timetableSession.findMany({
      where: sessionWhere,
      include: SESSION_INCLUDE,
      orderBy: [{ weekStart: 'desc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return { classes, courses, sessions: sessions.map((session) => this.presentSession(session)) };
  }

  async getOverview(
    user: JwtPayload,
    query: { classId?: number; courseId?: number; sessionId?: number; dateFrom?: string; dateTo?: string },
  ) {
    const where = await this.buildOverviewWhere(user, query);
    if (query.sessionId) where.id = query.sessionId;
    let sessions = await this.prisma.timetableSession.findMany({
      where,
      include: {
        ...SESSION_INCLUDE,
        attendanceRecords: {
          include: {
            student: {
              select: { id: true, fullName: true, codeMassar: true, codeEtudiant: true },
            },
          },
          orderBy: { student: { fullName: 'asc' } },
        },
      },
      orderBy: [{ weekStart: 'desc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    const finalized = await Promise.all(
      sessions.map((session) => this.finalizeIfExpired(session)),
    );

    if (finalized.some(Boolean)) {
      sessions = await this.prisma.timetableSession.findMany({
        where,
        include: {
          ...SESSION_INCLUDE,
          attendanceRecords: {
            include: {
              student: {
                select: { id: true, fullName: true, codeMassar: true, codeEtudiant: true },
              },
            },
            orderBy: { student: { fullName: 'asc' } },
          },
        },
        orderBy: [{ weekStart: 'desc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    }

    return sessions.map((session) => ({
      ...this.presentSession(session),
      summary: {
        present: session.attendanceRecords.filter((record) => record.status === 'present').length,
        absent: session.attendanceRecords.filter((record) => record.status === 'absent').length,
        pending: session.attendanceRecords.filter((record) => record.status === 'pending').length,
      },
      students: session.attendanceRecords,
    }));
  }

  async findCurrent(user: JwtPayload, mode: 'teacher' | 'student') {
    const now = new Date();
    const dayOfWeek = this.dayOfWeek(now);
    const weekStart = this.weekStart(now);

    const where: Prisma.TimetableSessionWhereInput = {
      dayOfWeek,
      OR: [{ weekStart: null }, { weekStart }],
    };

    if (mode === 'teacher') {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: user.sub },
        select: { id: true },
      });
      if (user.role === UserRole.teacher && !teacher) {
        return { now, current: null, sessions: [] };
      }
      if (teacher) where.teacherId = teacher.id;
    } else {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.sub },
        select: { classId: true },
      });
      if (!student?.classId) return { now, current: null, sessions: [] };
      where.classId = student.classId;
    }

    const sessions = await this.prisma.timetableSession.findMany({
      where,
      include: SESSION_INCLUDE,
      orderBy: { startTime: 'asc' },
    });

    return {
      now,
      current: sessions.find((session) => this.isWithinSessionClock(session, now)) ?? sessions[0] ?? null,
      sessions,
    };
  }

  async getSession(id: number, user: JwtPayload) {
    const session = await this.getSessionOrThrow(id);
    await this.ensureCanViewSession(session, user);
    return this.presentSession(session);
  }

  async getRecords(id: number, user: JwtPayload) {
    const session = await this.getSessionOrThrow(id);
    await this.ensureCanManageSession(session, user);
    await this.finalizeIfExpired(session);
    return this.recordsPayload(id);
  }

  async enable(id: number, dto: EnableAttendanceDto, user: JwtPayload) {
    const session = await this.getSessionOrThrow(id);
    await this.ensureCanManageSession(session, user);

    const now = new Date();
    const sessionEnd = this.sessionBoundary(session, 'end');
    const requestedDeadline = new Date(now.getTime() + (dto.minutes ?? 90) * 60_000);
    const deadline = requestedDeadline < sessionEnd ? requestedDeadline : sessionEnd;
    if (deadline <= now) throw new BadRequestException('attendance closed');

    const token = `att_${id}_${randomBytes(32).toString('base64url')}`;
    const updated = await this.prisma.timetableSession.update({
      where: { id },
      data: {
        attendanceEnabled: true,
        attendanceEnabledAt: now,
        attendanceDeadline: deadline,
        attendanceClosedAt: null,
        attendanceTokenHash: this.hashToken(token),
      },
      include: SESSION_INCLUDE,
    });
    await this.ensurePendingRecords(updated);

    return { ...this.presentSession(updated), qrToken: token };
  }

  async disable(id: number, user: JwtPayload) {
    const session = await this.getSessionOrThrow(id);
    await this.ensureCanManageSession(session, user);
    await this.markPendingAbsent(id);

    const updated = await this.prisma.timetableSession.update({
      where: { id },
      data: {
        attendanceEnabled: false,
        attendanceTokenHash: null,
        attendanceClosedAt: new Date(),
      },
      include: SESSION_INCLUDE,
    });
    return this.presentSession(updated);
  }

  async extend(id: number, minutes: number, user: JwtPayload) {
    const session = await this.getSessionOrThrow(id);
    await this.ensureCanManageSession(session, user);
    if (!session.attendanceEnabled || !session.attendanceDeadline) {
      throw new BadRequestException('attendance closed');
    }

    const now = new Date();
    const sessionEnd = this.sessionBoundary(session, 'end');
    const base = session.attendanceDeadline > now ? session.attendanceDeadline : now;
    const requested = new Date(base.getTime() + minutes * 60_000);
    const deadline = requested < sessionEnd ? requested : sessionEnd;
    if (deadline <= now) throw new BadRequestException('attendance closed');

    const updated = await this.prisma.timetableSession.update({
      where: { id },
      data: { attendanceDeadline: deadline, attendanceClosedAt: null, attendanceEnabled: true },
      include: SESSION_INCLUDE,
    });
    return this.presentSession(updated);
  }

  async manual(id: number, dto: ManualAttendanceDto, user: JwtPayload) {
    const session = await this.getSessionOrThrow(id);
    await this.ensureCanManageSession(session, user);
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
      select: { id: true, classId: true },
    });
    if (!student || student.classId !== session.classId) {
      throw new BadRequestException('not enrolled');
    }

    const record = await this.prisma.attendanceRecord.upsert({
      where: { studentId_sessionId: { studentId: dto.studentId, sessionId: id } },
      create: {
        studentId: dto.studentId,
        sessionId: id,
        courseId: session.element.cours?.id,
        status: dto.status,
        timestamp: dto.status === AttendanceStatus.present ? new Date() : null,
        method: AttendanceMethod.manual,
        validatedById: user.sub,
      },
      update: {
        status: dto.status,
        timestamp: dto.status === AttendanceStatus.present ? new Date() : null,
        method: AttendanceMethod.manual,
        validatedById: user.sub,
      },
    });
    return record;
  }

  async scan(token: string, user: JwtPayload) {
    const sessionId = this.sessionIdFromToken(token);
    const session = await this.getSessionOrThrow(sessionId);
    const now = new Date();

    if (!session.attendanceTokenHash || session.attendanceTokenHash !== this.hashToken(token)) {
      throw new BadRequestException('invalid session');
    }
    if (!session.attendanceEnabled || session.attendanceClosedAt) {
      throw new BadRequestException('attendance closed');
    }
    if (!session.attendanceDeadline || now > session.attendanceDeadline) {
      await this.closeExpiredSession(session.id);
      throw new BadRequestException('expired QR code');
    }
    if (!this.isSessionCalendarActive(session, now)) {
      throw new BadRequestException('invalid session');
    }

    const student = await this.prisma.student.findUnique({
      where: { userId: user.sub },
      select: { id: true, fullName: true, classId: true },
    });
    if (!student) throw new BadRequestException('not enrolled');
    if (student.classId !== session.classId) throw new BadRequestException('not enrolled');

    const courseId = session.element.cours?.id;
    if (courseId) {
      const enrolled = await this.prisma.coursClass.findFirst({
        where: { coursId: courseId, classId: session.classId },
        select: { id: true },
      });
      if (!enrolled) throw new BadRequestException('not enrolled');
    }

    const record = await this.prisma.attendanceRecord.upsert({
      where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } },
      create: {
        studentId: student.id,
        sessionId: session.id,
        courseId,
        status: AttendanceStatus.present,
        timestamp: now,
        method: AttendanceMethod.qr,
        validatedById: null,
      },
      update: {
        status: AttendanceStatus.present,
        timestamp: now,
        method: AttendanceMethod.qr,
      },
    });

    return { message: 'attendance recorded', record };
  }

  async getStudentHistory(user: JwtPayload) {
    const student = await this.prisma.student.findUnique({
      where: { userId: user.sub },
      select: {
        id: true,
        academicClass: { select: { id: true, name: true, year: true } },
      },
    });

    if (!student) {
      return { class: null, history: [] };
    }

    const history = await this.prisma.attendanceRecord.findMany({
      where: { studentId: student.id },
      include: {
        session: {
          include: SESSION_INCLUDE,
        },
      },
      orderBy: [
        { session: { weekStart: 'desc' } },
        { session: { dayOfWeek: 'desc' } },
        { session: { startTime: 'desc' } },
      ],
      take: 50,
    });

    return {
      class: student.academicClass,
      history: history.map((record) => ({
        id: record.id,
        status: record.status,
        method: record.method,
        timestamp: record.timestamp,
        className: record.session.class.name,
        courseName: record.session.element.cours?.name ?? record.session.element.name,
        moduleName: record.session.element.module.name,
        startTime: record.session.startTime,
        endTime: record.session.endTime,
        weekStart: record.session.weekStart,
        dayOfWeek: record.session.dayOfWeek,
      })),
    };
  }

  private async getSessionOrThrow(id: number) {
    const session = await this.prisma.timetableSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });
    if (!session) throw new NotFoundException('invalid session');
    return session;
  }

  private async ensureCanViewSession(session: SessionWithAttendance, user: JwtPayload) {
    if (user.role === UserRole.admin || user.role === UserRole.staff) return;
    if (user.role === UserRole.teacher) return this.ensureCanManageSession(session, user);
    if (user.role === UserRole.student) {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.sub },
        select: { classId: true },
      });
      if (student?.classId === session.classId) return;
    }
    throw new ForbiddenException('Insufficient role permissions');
  }

  private async ensureCanManageSession(session: SessionWithAttendance, user: JwtPayload) {
    if (user.role === UserRole.admin || user.role === UserRole.staff) return;
    if (user.role !== UserRole.teacher) {
      throw new ForbiddenException('Insufficient role permissions');
    }
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!teacher || teacher.id !== session.teacherId) {
      throw new ForbiddenException('Insufficient role permissions');
    }
  }

  private async ensurePendingRecords(session: SessionWithAttendance) {
    const students = await this.prisma.student.findMany({
      where: { classId: session.classId },
      select: { id: true },
    });
    await this.prisma.$transaction(
      students.map((student) =>
        this.prisma.attendanceRecord.upsert({
          where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } },
          create: {
            studentId: student.id,
            sessionId: session.id,
            courseId: session.element.cours?.id,
            status: AttendanceStatus.pending,
            method: AttendanceMethod.qr,
          },
          update: {},
        }),
      ),
    );
  }

  private async buildOverviewWhere(
    user: JwtPayload,
    query: { classId?: number; courseId?: number; dateFrom?: string; dateTo?: string },
  ) {
    const where: Prisma.TimetableSessionWhereInput = {};
    if (query.classId) where.classId = query.classId;
    if (query.courseId) where.element = { cours: { id: query.courseId } };
    if (query.dateFrom || query.dateTo) {
      where.weekStart = {};
      if (query.dateFrom) where.weekStart.gte = new Date(query.dateFrom);
      if (query.dateTo) where.weekStart.lte = new Date(query.dateTo);
    }

    if (user.role === UserRole.teacher) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { userId: user.sub },
        select: { id: true },
      });
      where.teacherId = teacher?.id ?? -1;
    }

    if (user.role === UserRole.inspector || user.role === UserRole.user) {
      where.class = { filiere: { is: { departmentId: { in: user.departmentIds } } } };
    }

    return where;
  }

  private async recordsPayload(sessionId: number) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: { sessionId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            codeMassar: true,
            codeEtudiant: true,
            sex: true,
            photoPath: true,
          },
        },
        validatedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { student: { fullName: 'asc' } },
    });
    return records;
  }

  private async finalizeIfExpired(session: SessionWithAttendance) {
    if (session.attendanceEnabled && session.attendanceDeadline && new Date() > session.attendanceDeadline) {
      await this.closeExpiredSession(session.id);
      return true;
    }
    return false;
  }

  private async closeExpiredSession(sessionId: number) {
    await this.markPendingAbsent(sessionId);
    await this.prisma.timetableSession.update({
      where: { id: sessionId },
      data: { attendanceEnabled: false, attendanceTokenHash: null, attendanceClosedAt: new Date() },
    });
  }

  private async markPendingAbsent(sessionId: number) {
    await this.prisma.attendanceRecord.updateMany({
      where: { sessionId, status: AttendanceStatus.pending },
      data: { status: AttendanceStatus.absent, method: AttendanceMethod.manual },
    });
  }

  private presentSession(session: SessionWithAttendance) {
    return {
      ...session,
      qrToken: undefined,
      attendanceTokenHash: undefined,
      course: session.element.cours ?? null,
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private sessionIdFromToken(token: string) {
    const match = /^att_(\d+)_/.exec(token);
    if (!match) throw new BadRequestException('invalid session');
    return Number(match[1]);
  }

  private dayOfWeek(date: Date) {
    const day = date.getDay();
    return day === 0 ? 7 : day;
  }

  private weekStart(date: Date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = this.dayOfWeek(d);
    d.setDate(d.getDate() - day + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private sessionBoundary(session: Pick<SessionWithAttendance, 'dayOfWeek' | 'weekStart' | 'startTime' | 'endTime'>, boundary: 'start' | 'end') {
    const base = session.weekStart ? new Date(session.weekStart) : this.weekStart(new Date());
    base.setDate(base.getDate() + session.dayOfWeek - 1);
    const [hours, minutes] = (boundary === 'start' ? session.startTime : session.endTime).split(':').map(Number);
    base.setHours(hours, minutes, 0, 0);
    return base;
  }

  private isWithinSessionClock(session: Pick<SessionWithAttendance, 'startTime' | 'endTime'>, now: Date) {
    const minutes = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = session.startTime.split(':').map(Number);
    const [eh, em] = session.endTime.split(':').map(Number);
    return minutes >= sh * 60 + sm && minutes <= eh * 60 + em;
  }

  private isSessionCalendarActive(session: SessionWithAttendance, now: Date) {
    if (session.dayOfWeek !== this.dayOfWeek(now)) return false;
    if (!session.weekStart) return true;
    return session.weekStart.getTime() === this.weekStart(now).getTime();
  }
}
