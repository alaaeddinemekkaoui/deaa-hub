import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoomReservationPurpose, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoomReservationDto } from './dto/create-room-reservation.dto';
import { UpdateRoomReservationDto } from './dto/update-room-reservation.dto';
import { RoomReservationQueryDto } from './dto/room-reservation-query.dto';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';
import { UserRole } from '../../common/types/role.type';

const ROOM_RESERVATION_INCLUDE = {
  room: {
    select: {
      id: true,
      name: true,
      capacity: true,
      availability: true,
      departmentId: true,
      department: { select: { id: true, name: true } },
    },
  },
  academicClass: {
    select: {
      id: true,
      name: true,
      year: true,
      filiere: {
        select: {
          id: true,
          name: true,
          code: true,
          department: { select: { id: true, name: true } },
        },
      },
    },
  },
  requestedBy: { select: { id: true, fullName: true, email: true } },
  approvedBy: { select: { id: true, fullName: true, email: true } },
} as const;

@Injectable()
export class RoomReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: RoomReservationQueryDto, currentUser?: JwtPayload) {
    const where = this.buildWhere(query, currentUser);

    return this.prisma.roomReservation.findMany({
      where,
      include: ROOM_RESERVATION_INCLUDE,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: number) {
    const reservation = await this.prisma.roomReservation.findUnique({
      where: { id },
      include: ROOM_RESERVATION_INCLUDE,
    });
    if (!reservation)
      throw new NotFoundException(`Room reservation ${id} not found`);
    return reservation;
  }

  async create(dto: CreateRoomReservationDto, currentUser: JwtPayload) {
    const room = await this.getRoomForReservation(dto.roomId);
    const classDepartmentId = await this.getClassDepartmentId(dto.classId);

    this.ensureCanCreateReservation(
      currentUser,
      room.departmentId,
      classDepartmentId,
    );

    if (
      dto.classId &&
      room.departmentId &&
      classDepartmentId &&
      room.departmentId !== classDepartmentId
    ) {
      throw new BadRequestException(
        'Class must belong to the same department as the selected room',
      );
    }

    this.ensureWeekdayMatches(dto.date, dto.dayOfWeek);
    this.ensureTimeRange(dto.startTime, dto.endTime);
    await this.ensureNoOverlap(dto.roomId, dto.date, dto.startTime, dto.endTime);

    // Admins get auto-approved; users get pending
    const isAdmin = currentUser.role === UserRole.ADMIN;
    const status: ReservationStatus = isAdmin ? 'approved' : 'pending';

    return this.prisma.roomReservation.create({
      data: {
        roomId: dto.roomId,
        classId: dto.classId ?? null,
        date: dto.date,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        reservedBy: dto.reservedBy,
        purpose: dto.purpose,
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
        status,
        requestedById: currentUser.sub,
        ...(isAdmin
          ? { approvedById: currentUser.sub, approvedAt: new Date() }
          : {}),
      },
      include: ROOM_RESERVATION_INCLUDE,
    });
  }

  async approve(id: number, currentUser: JwtPayload, note?: string) {
    const reservation = await this.prisma.roomReservation.findUnique({
      where: { id },
      include: { room: { select: { departmentId: true } } },
    });
    if (!reservation)
      throw new NotFoundException(`Room reservation ${id} not found`);

    if (reservation.status !== 'pending') {
      throw new BadRequestException(
        `Reservation is already ${reservation.status}`,
      );
    }

    await this.ensureCanApprove(reservation.room.departmentId, currentUser);

    return this.prisma.roomReservation.update({
      where: { id },
      data: {
        status: 'approved',
        approvedById: currentUser.sub,
        approvalNote: note ?? null,
        approvedAt: new Date(),
      },
      include: ROOM_RESERVATION_INCLUDE,
    });
  }

  async reject(id: number, currentUser: JwtPayload, note?: string) {
    const reservation = await this.prisma.roomReservation.findUnique({
      where: { id },
      include: { room: { select: { departmentId: true } } },
    });
    if (!reservation)
      throw new NotFoundException(`Room reservation ${id} not found`);

    if (reservation.status === 'rejected') {
      throw new BadRequestException('Reservation is already rejected');
    }

    await this.ensureCanApprove(reservation.room.departmentId, currentUser);

    return this.prisma.roomReservation.update({
      where: { id },
      data: {
        status: 'rejected',
        approvedById: currentUser.sub,
        approvalNote: note ?? null,
        approvedAt: new Date(),
      },
      include: ROOM_RESERVATION_INCLUDE,
    });
  }

  async update(id: number, dto: UpdateRoomReservationDto) {
    const existing = await this.prisma.roomReservation.findUnique({
      where: { id },
      select: {
        id: true,
        roomId: true,
        date: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
      },
    });

    if (!existing)
      throw new NotFoundException(`Room reservation ${id} not found`);

    const roomId = dto.roomId ?? existing.roomId;
    const classId = dto.classId ?? null;
    const date = dto.date ?? existing.date;
    const dayOfWeek = dto.dayOfWeek ?? existing.dayOfWeek;
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;

    await this.ensureRoomExists(roomId);
    await this.ensureClassExists(classId ?? undefined);
    this.ensureWeekdayMatches(date, dayOfWeek);
    this.ensureTimeRange(startTime, endTime);
    await this.ensureNoOverlap(roomId, date, startTime, endTime, id);

    return this.prisma.roomReservation.update({
      where: { id },
      data: {
        ...(dto.roomId !== undefined ? { roomId } : {}),
        ...(dto.classId !== undefined ? { classId } : {}),
        ...(dto.date !== undefined ? { date } : {}),
        ...(dto.dayOfWeek !== undefined ? { dayOfWeek } : {}),
        ...(dto.startTime !== undefined ? { startTime } : {}),
        ...(dto.endTime !== undefined ? { endTime } : {}),
        ...(dto.reservedBy !== undefined ? { reservedBy: dto.reservedBy } : {}),
        ...(dto.purpose !== undefined ? { purpose: dto.purpose } : {}),
        ...(dto.notes !== undefined
          ? { notes: dto.notes?.trim() ? dto.notes.trim() : null }
          : {}),
      },
      include: ROOM_RESERVATION_INCLUDE,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.roomReservation.delete({ where: { id } });
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async ensureCanApprove(
    roomDepartmentId: number | null,
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === UserRole.ADMIN) return;

    // A user can approve if they are assigned to the room's department
    if (
      roomDepartmentId &&
      currentUser.departmentIds.includes(roomDepartmentId)
    ) {
      return;
    }

    throw new ForbiddenException(
      'Vous n\'êtes pas autorisé à approuver cette réservation',
    );
  }

  private buildWhere(
    query: RoomReservationQueryDto,
    currentUser?: JwtPayload,
  ): Prisma.RoomReservationWhereInput {
    const filters: Prisma.RoomReservationWhereInput[] = [];

    // Department scoping for regular users
    if (
      currentUser &&
      currentUser.role === UserRole.USER &&
      currentUser.departmentIds.length > 0
    ) {
      filters.push({
        OR: [
          // Reservations for rooms in their department
          { room: { departmentId: { in: currentUser.departmentIds } } },
          // Reservations they requested themselves
          { requestedById: currentUser.sub },
        ],
      });
    }

    if (query.roomId) filters.push({ roomId: query.roomId });
    if (query.classId) filters.push({ classId: query.classId });
    if (query.filiereId) {
      filters.push({ academicClass: { filiereId: query.filiereId } });
    }
    if (query.departmentId) {
      filters.push({
        academicClass: { filiere: { departmentId: query.departmentId } },
      });
    }
    if (query.dayOfWeek) filters.push({ dayOfWeek: query.dayOfWeek });
    if (query.date) filters.push({ date: query.date });
    if (query.weekStart) {
      filters.push({ date: { in: this.getWeekDates(query.weekStart) } });
    }

    return filters.length ? { AND: filters } : {};
  }

  private getWeekDates(weekStart: string) {
    return Array.from({ length: 5 }, (_, offset) => {
      const date = new Date(`${weekStart}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      return date.toISOString().slice(0, 10);
    });
  }

  private ensureTimeRange(startTime: string, endTime: string) {
    if (startTime >= endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  private ensureWeekdayMatches(date: string, dayOfWeek: number) {
    const weekday = this.getWeekday(date);
    if (weekday < 1 || weekday > 5) {
      throw new BadRequestException(
        'Reservations are limited to Monday through Friday',
      );
    }
    if (weekday !== dayOfWeek) {
      throw new BadRequestException(
        'dayOfWeek does not match the provided date',
      );
    }
  }

  private getWeekday(date: string) {
    const value = new Date(`${date}T00:00:00Z`).getUTCDay();
    return value === 0 ? 7 : value;
  }

  private ensureCanCreateReservation(
    currentUser: JwtPayload,
    roomDepartmentId: number | null,
    classDepartmentId: number | null,
  ) {
    if (currentUser.role !== UserRole.USER) return;

    const allowedDepartmentIds = currentUser.departmentIds ?? [];
    if (allowedDepartmentIds.length === 0) {
      throw new ForbiddenException(
        'You are not assigned to any department for reservation creation',
      );
    }

    if (
      roomDepartmentId &&
      !allowedDepartmentIds.includes(roomDepartmentId)
    ) {
      throw new ForbiddenException(
        'You can only reserve rooms in your own department',
      );
    }

    if (
      classDepartmentId &&
      !allowedDepartmentIds.includes(classDepartmentId)
    ) {
      throw new ForbiddenException(
        'You can only link classes from your own department',
      );
    }
  }

  private async getRoomForReservation(roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, departmentId: true },
    });

    if (!room) throw new NotFoundException(`Room ${roomId} not found`);
    return room;
  }

  private async getClassDepartmentId(classId?: number): Promise<number | null> {
    if (!classId) return null;

    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id: classId },
      select: { id: true, filiere: { select: { departmentId: true } } },
    });

    if (!academicClass)
      throw new NotFoundException(`Class ${classId} not found`);

    return academicClass.filiere?.departmentId ?? null;
  }

  private async ensureRoomExists(roomId: number) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true },
    });
    if (!room) throw new NotFoundException(`Room ${roomId} not found`);
  }

  private async ensureClassExists(classId?: number) {
    if (!classId) return;
    const academicClass = await this.prisma.academicClass.findUnique({
      where: { id: classId },
      select: { id: true },
    });
    if (!academicClass)
      throw new NotFoundException(`Class ${classId} not found`);
  }

  private async ensureNoOverlap(
    roomId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeId?: number,
  ) {
    const conflict = await this.prisma.roomReservation.findFirst({
      where: {
        roomId,
        date,
        status: { in: ['pending', 'approved'] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        purpose: true,
        reservedBy: true,
      },
    });

    if (!conflict) return;

    throw new ConflictException(
      `This room is already reserved from ${conflict.startTime} to ${conflict.endTime} by ${conflict.reservedBy}`,
    );
  }
}
