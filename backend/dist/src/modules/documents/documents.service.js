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
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const fs_1 = require("fs");
const path_1 = require("path");
let DocumentsService = class DocumentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll() {
        return this.prisma.document.findMany({
            include: {
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        codeMassar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    findOne(id) {
        return this.prisma.document.findUnique({
            where: { id },
            include: {
                student: {
                    select: {
                        id: true,
                        fullName: true,
                        codeMassar: true,
                    },
                },
            },
        });
    }
    async create(dto, file) {
        if (!file) {
            throw new common_1.BadRequestException('File is required');
        }
        const student = await this.prisma.student.findUnique({
            where: { id: dto.studentId },
            select: { id: true, codeMassar: true },
        });
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        const studentDir = (0, path_1.join)(process.cwd(), 'uploads', student.codeMassar);
        if (!(0, fs_1.existsSync)(studentDir)) {
            (0, fs_1.mkdirSync)(studentDir, { recursive: true });
        }
        const finalPath = (0, path_1.join)(studentDir, file.originalname);
        (0, fs_1.renameSync)(file.path, finalPath);
        return this.prisma.document.create({
            data: {
                name: file.originalname,
                mimeType: file.mimetype,
                path: finalPath,
                studentId: student.id,
            },
        });
    }
    findByStudent(studentId) {
        return this.prisma.document.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
        });
    }
    update(id, dto) {
        return this.prisma.document.update({
            where: { id },
            data: {
                ...(dto.name ? { name: dto.name } : {}),
                ...(dto.studentId ? { studentId: dto.studentId } : {}),
            },
        });
    }
    remove(id) {
        return this.prisma.document.delete({ where: { id } });
    }
    async missingDocuments(studentId) {
        const required = ['cin', 'bac', 'photo'];
        const docs = await this.prisma.document.findMany({ where: { studentId } });
        const existing = docs.map((d) => d.name.toLowerCase());
        return required.filter((item) => !existing.some((name) => name.includes(item)));
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DocumentsService);
//# sourceMappingURL=documents.service.js.map