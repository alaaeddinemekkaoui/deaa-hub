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
exports.TimetableService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const SESSION_INCLUDE = {
    element: { include: { module: { select: { id: true, name: true } } } },
    class: { select: { id: true, name: true, year: true } },
    teacher: { select: { id: true, firstName: true, lastName: true } },
    room: { select: { id: true, name: true } },
};
let TimetableService = class TimetableService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { page, limit, classId, teacherId, roomId, dayOfWeek, weekStart } = query;
        const filters = [];
        if (classId)
            filters.push({ classId });
        if (teacherId)
            filters.push({ teacherId });
        if (roomId)
            filters.push({ roomId });
        if (dayOfWeek)
            filters.push({ dayOfWeek });
        if (weekStart)
            filters.push({ weekStart: new Date(weekStart) });
        const where = filters.length ? { AND: filters } : {};
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
        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1, hasNextPage: page * limit < total, hasPreviousPage: page > 1 } };
    }
    async findWeek(classId, weekStart) {
        const sessions = await this.prisma.timetableSession.findMany({
            where: { classId, weekStart: new Date(weekStart) },
            include: SESSION_INCLUDE,
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        });
        const conflicts = this.detectConflicts(sessions);
        return { sessions, conflicts };
    }
    async create(dto) {
        await this.ensureElementExists(dto.elementId);
        await this.ensureClassExists(dto.classId);
        if (dto.teacherId)
            await this.ensureTeacherExists(dto.teacherId);
        if (dto.roomId)
            await this.ensureRoomExists(dto.roomId);
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
    async update(id, dto) {
        await this.ensureSessionExists(id);
        if (dto.elementId)
            await this.ensureElementExists(dto.elementId);
        if (dto.classId)
            await this.ensureClassExists(dto.classId);
        if (dto.teacherId)
            await this.ensureTeacherExists(dto.teacherId);
        if (dto.roomId)
            await this.ensureRoomExists(dto.roomId);
        return this.prisma.timetableSession.update({
            where: { id },
            data: {
                ...(dto.elementId !== undefined ? { elementId: dto.elementId } : {}),
                ...(dto.classId !== undefined ? { classId: dto.classId } : {}),
                ...(dto.teacherId !== undefined ? { teacherId: dto.teacherId ?? null } : {}),
                ...(dto.roomId !== undefined ? { roomId: dto.roomId ?? null } : {}),
                ...(dto.dayOfWeek !== undefined ? { dayOfWeek: dto.dayOfWeek } : {}),
                ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
                ...(dto.endTime !== undefined ? { endTime: dto.endTime } : {}),
                ...(dto.weekStart !== undefined ? { weekStart: dto.weekStart ? new Date(dto.weekStart) : null } : {}),
            },
            include: SESSION_INCLUDE,
        });
    }
    async remove(id) {
        await this.ensureSessionExists(id);
        return this.prisma.timetableSession.delete({ where: { id } });
    }
    async checkConflicts(classId, weekStart) {
        const where = { classId };
        if (weekStart)
            where.weekStart = new Date(weekStart);
        const sessions = await this.prisma.timetableSession.findMany({ where, include: SESSION_INCLUDE });
        return this.detectConflicts(sessions);
    }
    detectConflicts(sessions) {
        const conflicts = [];
        for (let i = 0; i < sessions.length; i++) {
            for (let j = i + 1; j < sessions.length; j++) {
                const a = sessions[i];
                const b = sessions[j];
                if (a.dayOfWeek !== b.dayOfWeek)
                    continue;
                if (!this.timesOverlap(a.startTime, a.endTime, b.startTime, b.endTime))
                    continue;
                if (a.teacherId && b.teacherId && a.teacherId === b.teacherId) {
                    conflicts.push({ sessionIds: [a.id, b.id], reason: 'Même enseignant en même temps' });
                }
                if (a.roomId && b.roomId && a.roomId === b.roomId) {
                    conflicts.push({ sessionIds: [a.id, b.id], reason: 'Même salle en même temps' });
                }
                if (a.classId === b.classId) {
                    conflicts.push({ sessionIds: [a.id, b.id], reason: 'Même classe en même temps' });
                }
            }
        }
        return conflicts;
    }
    timesOverlap(s1, e1, s2, e2) {
        const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        return toMin(s1) < toMin(e2) && toMin(s2) < toMin(e1);
    }
    async ensureSessionExists(id) {
        const s = await this.prisma.timetableSession.findUnique({ where: { id }, select: { id: true } });
        if (!s)
            throw new common_1.NotFoundException(`Session ${id} not found`);
    }
    async ensureElementExists(id) {
        const e = await this.prisma.elementModule.findUnique({ where: { id }, select: { id: true } });
        if (!e)
            throw new common_1.NotFoundException(`ElementModule ${id} not found`);
    }
    async ensureClassExists(id) {
        const c = await this.prisma.academicClass.findUnique({ where: { id }, select: { id: true } });
        if (!c)
            throw new common_1.NotFoundException(`Class ${id} not found`);
    }
    async ensureTeacherExists(id) {
        const t = await this.prisma.teacher.findUnique({ where: { id }, select: { id: true } });
        if (!t)
            throw new common_1.NotFoundException(`Teacher ${id} not found`);
    }
    async ensureRoomExists(id) {
        const r = await this.prisma.room.findUnique({ where: { id }, select: { id: true } });
        if (!r)
            throw new common_1.NotFoundException(`Room ${id} not found`);
    }
};
exports.TimetableService = TimetableService;
exports.TimetableService = TimetableService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TimetableService);
//# sourceMappingURL=timetable.service.js.map