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
exports.LaureatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let LaureatesService = class LaureatesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    findAll() {
        return this.prisma.laureate.findMany({
            include: {
                student: {
                    include: {
                        filiere: true,
                    },
                },
                proofDocument: true,
            },
            orderBy: { graduationYear: 'desc' },
        });
    }
    findOne(id) {
        return this.prisma.laureate.findUnique({
            where: { id },
            include: {
                student: {
                    include: {
                        filiere: true,
                    },
                },
                proofDocument: true,
            },
        });
    }
    create(dto) {
        return this.prisma.laureate.create({
            data: {
                studentId: dto.studentId,
                graduationYear: dto.graduationYear,
                diplomaStatus: dto.diplomaStatus ?? 'not_retrieved',
                proofDocumentId: dto.proofDocumentId,
            },
        });
    }
    update(id, dto) {
        return this.prisma.laureate.update({ where: { id }, data: dto });
    }
    remove(id) {
        return this.prisma.laureate.delete({ where: { id } });
    }
};
exports.LaureatesService = LaureatesService;
exports.LaureatesService = LaureatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LaureatesService);
//# sourceMappingURL=laureates.service.js.map