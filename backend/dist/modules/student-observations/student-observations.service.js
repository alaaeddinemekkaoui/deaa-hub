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
exports.StudentObservationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let StudentObservationsService = class StudentObservationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(studentId) {
        await this.ensureStudentExists(studentId);
        return this.prisma.studentObservation.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async create(studentId, dto) {
        await this.ensureStudentExists(studentId);
        return this.prisma.studentObservation.create({
            data: { studentId, text: dto.text },
        });
    }
    async remove(studentId, id) {
        const obs = await this.prisma.studentObservation.findFirst({
            where: { id, studentId },
            select: { id: true },
        });
        if (!obs)
            throw new common_1.NotFoundException(`Observation ${id} not found for student ${studentId}`);
        return this.prisma.studentObservation.delete({ where: { id } });
    }
    async ensureStudentExists(id) {
        const s = await this.prisma.student.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!s)
            throw new common_1.NotFoundException(`Student ${id} not found`);
    }
};
exports.StudentObservationsService = StudentObservationsService;
exports.StudentObservationsService = StudentObservationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StudentObservationsService);
//# sourceMappingURL=student-observations.service.js.map