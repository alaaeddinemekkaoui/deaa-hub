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
exports.WorkflowsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let WorkflowsService = class WorkflowsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll() {
        return this.prisma.workflowTask.findMany({
            include: {
                assignedTo: { select: { id: true, fullName: true, role: true } },
                student: { select: { id: true, fullName: true, codeMassar: true } },
                timeline: { orderBy: { changedAt: 'desc' } },
            },
            orderBy: { updatedAt: 'desc' },
        });
    }
    findOne(id) {
        return this.prisma.workflowTask.findUnique({
            where: { id },
            include: {
                assignedTo: { select: { id: true, fullName: true, role: true } },
                student: { select: { id: true, fullName: true, codeMassar: true } },
                timeline: { orderBy: { changedAt: 'desc' } },
            },
        });
    }
    async create(dto) {
        const task = await this.prisma.workflowTask.create({
            data: {
                title: dto.title,
                description: dto.description,
                status: dto.status ?? 'pending',
                assignedToId: dto.assignedToId,
                studentId: dto.studentId,
            },
        });
        await this.prisma.workflowTimeline.create({
            data: {
                taskId: task.id,
                status: task.status,
                note: 'Task created',
            },
        });
        return task;
    }
    async update(id, dto) {
        const updated = await this.prisma.workflowTask.update({
            where: { id },
            data: {
                title: dto.title,
                description: dto.description,
                status: dto.status,
                assignedToId: dto.assignedToId,
                studentId: dto.studentId,
            },
        });
        if (dto.status) {
            await this.prisma.workflowTimeline.create({
                data: {
                    taskId: id,
                    status: dto.status,
                    note: dto.timelineNote ?? `Status changed to ${dto.status}`,
                },
            });
        }
        return updated;
    }
    remove(id) {
        return this.prisma.workflowTask.delete({ where: { id } });
    }
};
exports.WorkflowsService = WorkflowsService;
exports.WorkflowsService = WorkflowsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WorkflowsService);
//# sourceMappingURL=workflows.service.js.map