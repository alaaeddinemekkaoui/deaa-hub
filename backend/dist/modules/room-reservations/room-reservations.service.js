"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomReservationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
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
};
let RoomReservationsService = class RoomReservationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const where = this.buildWhere(query);
        return this.prisma.roomReservation.findMany({
            where,
            include: ROOM_RESERVATION_INCLUDE,
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        });
    }
    async findOne(id) {
        const reservation = await this.prisma.roomReservation.findUnique({
            where: { id },
            include: ROOM_RESERVATION_INCLUDE,
        });
        if (!reservation)
            throw new common_1.NotFoundException(`Room reservation ${id} not found`);
        return reservation;
    }
    async create(dto) {
        await this.ensureRoomExists(dto.roomId);
        await this.ensureClassExists(dto.classId);
        this.ensureWeekdayMatches(dto.date, dto.dayOfWeek);
        this.ensureTimeRange(dto.startTime, dto.endTime);
        await this.ensureNoOverlap(dto.roomId, dto.date, dto.startTime, dto.endTime);
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
    async update(id, dto) {
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
            throw new common_1.NotFoundException(`Room reservation ${id} not found`);
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
    async remove(id) {
        await this.findOne(id);
        return this.prisma.roomReservation.delete({ where: { id } });
    }
    buildWhere(query) {
        const filters = [];
        if (query.roomId)
            filters.push({ roomId: query.roomId });
        if (query.classId)
            filters.push({ classId: query.classId });
        if (query.filiereId) {
            filters.push({ academicClass: { filiereId: query.filiereId } });
        }
        if (query.departmentId) {
            filters.push({ academicClass: { filiere: { departmentId: query.departmentId } } });
        }
        if (query.dayOfWeek)
            filters.push({ dayOfWeek: query.dayOfWeek });
        if (query.date)
            filters.push({ date: query.date });
        if (query.weekStart) {
            filters.push({ date: { in: this.getWeekDates(query.weekStart) } });
        }
        return filters.length ? { AND: filters } : {};
    }
    getWeekDates(weekStart) {
        return Array.from({ length: 5 }, (_, offset) => {
            const date = new Date(`${weekStart}T00:00:00Z`);
            date.setUTCDate(date.getUTCDate() + offset);
            return date.toISOString().slice(0, 10);
        });
    }
    ensureTimeRange(startTime, endTime) {
        if (startTime >= endTime) {
            throw new common_1.BadRequestException('endTime must be after startTime');
        }
    }
    ensureWeekdayMatches(date, dayOfWeek) {
        const weekday = this.getWeekday(date);
        if (weekday < 1 || weekday > 5) {
            throw new common_1.BadRequestException('Reservations are limited to Monday through Friday');
        }
        if (weekday !== dayOfWeek) {
            throw new common_1.BadRequestException('dayOfWeek does not match the provided date');
        }
    }
    getWeekday(date) {
        const value = new Date(`${date}T00:00:00Z`).getUTCDay();
        return value === 0 ? 7 : value;
    }
    async ensureRoomExists(roomId) {
        const room = await this.prisma.room.findUnique({
            where: { id: roomId },
            select: { id: true },
        });
        if (!room)
            throw new common_1.NotFoundException(`Room ${roomId} not found`);
    }
    async ensureClassExists(classId) {
        if (!classId)
            return;
        const academicClass = await this.prisma.academicClass.findUnique({
            where: { id: classId },
            select: { id: true },
        });
        if (!academicClass)
            throw new common_1.NotFoundException(`Class ${classId} not found`);
    }
    async ensureNoOverlap(roomId, date, startTime, endTime, excludeId) {
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
        if (!conflict)
            return;
        throw new common_1.ConflictException(`This room is already reserved from ${conflict.startTime} to ${conflict.endTime} by ${conflict.reservedBy}`);
    }
};
exports.RoomReservationsService = RoomReservationsService;
exports.RoomReservationsService = RoomReservationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoomReservationsService);
//# sourceMappingURL=room-reservations.service.js.map