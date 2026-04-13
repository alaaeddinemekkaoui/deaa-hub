import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RoomReservationPurpose } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoomReservationDto } from './dto/create-room-reservation.dto';
import { UpdateRoomReservationDto } from './dto/update-room-reservation.dto';
import { RoomReservationQueryDto } from './dto/room-reservation-query.dto';

const ROOM_RESERVATION_INCLUDE = {
  room: {
    select: {
      id: true,
      name: true,
      capacity: true,
      availability: true,
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
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class RoomReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: RoomReservationQueryDto) {
    const where = this.buildWhere(query);

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

  async create(dto: CreateRoomReservationDto) {
    await this.ensureRoomExists(dto.roomId);
    await this.ensureClassExists(dto.classId);
    this.ensureWeekdayMatches(dto.date, dto.dayOfWeek);
    this.ensureTimeRange(dto.startTime, dto.endTime);
    await this.ensureNoOverlap(
      dto.roomId,
      dto.date,
      dto.startTime,
      dto.endTime,
    );

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

  private buildWhere(
    query: RoomReservationQueryDto,
  ): Prisma.RoomReservationWhereInput {
    const filters: Prisma.RoomReservationWhereInput[] = [];

    if (query.roomId) filters.push({ roomId: query.roomId });
    if (query.classId) filters.push({ classId: query.classId });
    if (query.filiereId) {
      filters.push({ academicClass: { filiereId: query.filiereId } });
    }
    if (query.departmentId) {
      filters.push({ academicClass: { filiere: { departmentId: query.departmentId } } });
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
