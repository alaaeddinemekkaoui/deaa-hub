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
exports.ActivityLogsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ActivityLogsService = class ActivityLogsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll(limit = 50) {
        return this.prisma.activityLog.findMany({
            include: {
                user: {
                    select: { id: true, fullName: true, email: true, role: true },
                },
            },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });
    }
    findOne(id) {
        return this.prisma.activityLog.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, fullName: true, email: true, role: true },
                },
            },
        });
    }
    create(dto) {
        return this.prisma.activityLog.create({
            data: {
                userId: dto.userId,
                action: dto.action,
                metadata: dto.metadata,
            },
        });
    }
    update(id, dto) {
        const data = {
            ...(dto.action ? { action: dto.action } : {}),
            ...(dto.metadata ? { metadata: dto.metadata } : {}),
            ...(dto.userId
                ? {
                    user: {
                        connect: {
                            id: dto.userId,
                        },
                    },
                }
                : {}),
        };
        return this.prisma.activityLog.update({ where: { id }, data });
    }
    remove(id) {
        return this.prisma.activityLog.delete({ where: { id } });
    }
};
exports.ActivityLogsService = ActivityLogsService;
exports.ActivityLogsService = ActivityLogsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ActivityLogsService);
//# sourceMappingURL=activity-logs.service.js.map