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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOverview() {
        const [totalStudents, studentsPerFiliere, studentsPerCycle, teachersCount, departmentsCount, filieresCount, classesCount, dossiersCount, laureatesPerYear, recentActivity,] = await Promise.all([
            this.prisma.student.count(),
            this.prisma.filiere.findMany({
                select: {
                    id: true,
                    name: true,
                    _count: { select: { students: true } },
                },
            }),
            this.prisma.student.groupBy({
                by: ['cycle'],
                _count: { _all: true },
                orderBy: { cycle: 'asc' },
            }),
            this.prisma.teacher.count(),
            this.prisma.department.count(),
            this.prisma.filiere.count(),
            this.prisma.academicClass.count(),
            this.prisma.document.count(),
            this.prisma.laureate.groupBy({
                by: ['graduationYear'],
                _count: { _all: true },
                orderBy: { graduationYear: 'asc' },
            }),
            this.prisma.activityLog.findMany({
                include: {
                    user: {
                        select: { id: true, fullName: true, role: true },
                    },
                },
                orderBy: { timestamp: 'desc' },
                take: 10,
            }),
        ]);
        return {
            stats: {
                totalStudents,
                teachersCount,
                departmentsCount,
                filieresCount,
                classesCount,
                dossiersCount,
            },
            studentsPerFiliere: studentsPerFiliere.map((item) => ({
                filiereId: item.id,
                filiere: item.name,
                total: item._count.students,
            })),
            studentsPerCycle: studentsPerCycle.map((item) => ({
                cycle: item.cycle,
                total: item._count._all,
            })),
            laureatesPerYear: laureatesPerYear.map((item) => ({
                year: item.graduationYear,
                total: item._count._all,
            })),
            recentActivity,
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map