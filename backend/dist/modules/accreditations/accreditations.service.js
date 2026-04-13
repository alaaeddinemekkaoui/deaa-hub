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
exports.AccreditationsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AccreditationsService = class AccreditationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findPlans(query) {
        const { page, limit, search, academicYear, filiereId, sortBy, sortOrder } = query;
        const filters = [];
        if (search) {
            filters.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { academicYear: { contains: search, mode: 'insensitive' } },
                ],
            });
        }
        if (academicYear) {
            filters.push({ academicYear });
        }
        if (filiereId) {
            filters.push({ filiereId });
        }
        const where = filters.length > 0 ? { AND: filters } : {};
        const [data, total] = await Promise.all([
            this.prisma.accreditationPlan.findMany({
                where,
                include: {
                    filiere: { select: { id: true, name: true } },
                    option: { select: { id: true, name: true } },
                    cycle: { select: { id: true, name: true } },
                    _count: {
                        select: {
                            lines: true,
                            classAssignments: true,
                            derivedPlans: true,
                        },
                    },
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
            }),
            this.prisma.accreditationPlan.count({ where }),
        ]);
        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
                hasNextPage: page * limit < total,
                hasPreviousPage: page > 1,
            },
        };
    }
    async findPlan(id) {
        const plan = await this.prisma.accreditationPlan.findUnique({
            where: { id },
            include: {
                filiere: { select: { id: true, name: true } },
                option: { select: { id: true, name: true } },
                cycle: { select: { id: true, name: true } },
                sourcePlan: { select: { id: true, name: true, academicYear: true } },
                lines: {
                    include: {
                        cours: { select: { id: true, name: true, type: true } },
                        module: { select: { id: true, name: true } },
                        element: { select: { id: true, name: true, type: true } },
                        originLine: { select: { id: true } },
                    },
                    orderBy: [{ semestre: 'asc' }, { cours: { name: 'asc' } }],
                },
                classAssignments: {
                    include: {
                        class: {
                            select: {
                                id: true,
                                name: true,
                                year: true,
                                filiere: { select: { id: true, name: true } },
                            },
                        },
                    },
                    orderBy: [{ academicYear: 'desc' }, { class: { name: 'asc' } }],
                },
            },
        });
        if (!plan) {
            throw new common_1.NotFoundException(`Accreditation plan ${id} not found`);
        }
        return plan;
    }
    async createPlan(dto) {
        await this.ensurePlanNameAvailable(dto.name, dto.academicYear);
        if (dto.filiereId) {
            await this.ensureFiliereExists(dto.filiereId);
        }
        if (dto.optionId) {
            await this.ensureOptionExists(dto.optionId);
        }
        if (dto.cycleId) {
            await this.ensureCycleExists(dto.cycleId);
        }
        const sourcePlan = dto.sourcePlanId
            ? await this.prisma.accreditationPlan.findUnique({
                where: { id: dto.sourcePlanId },
                include: {
                    lines: {
                        select: {
                            id: true,
                            coursId: true,
                            moduleId: true,
                            elementId: true,
                            semestre: true,
                            volumeHoraire: true,
                            isMandatory: true,
                        },
                    },
                },
            })
            : null;
        if (dto.sourcePlanId && !sourcePlan) {
            throw new common_1.NotFoundException(`Source accreditation plan ${dto.sourcePlanId} not found`);
        }
        return this.prisma.$transaction(async (tx) => {
            const createdPlan = await tx.accreditationPlan.create({
                data: {
                    name: dto.name,
                    academicYear: dto.academicYear,
                    levelYear: dto.levelYear ?? null,
                    filiereId: dto.filiereId ?? null,
                    optionId: dto.optionId ?? null,
                    cycleId: dto.cycleId ?? null,
                    sourcePlanId: dto.sourcePlanId ?? null,
                    status: client_1.AccreditationPlanStatus.draft,
                },
            });
            if (sourcePlan && sourcePlan.lines.length > 0) {
                await tx.accreditationPlanLine.createMany({
                    data: sourcePlan.lines.map((line) => ({
                        planId: createdPlan.id,
                        coursId: line.coursId,
                        moduleId: line.moduleId,
                        elementId: line.elementId,
                        semestre: line.semestre,
                        volumeHoraire: line.volumeHoraire,
                        isMandatory: line.isMandatory,
                        originLineId: line.id,
                    })),
                });
            }
            return tx.accreditationPlan.findUnique({
                where: { id: createdPlan.id },
                include: {
                    _count: { select: { lines: true } },
                    sourcePlan: { select: { id: true, name: true, academicYear: true } },
                },
            });
        });
    }
    async updatePlan(id, dto) {
        const existing = await this.prisma.accreditationPlan.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                academicYear: true,
                status: true,
            },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Accreditation plan ${id} not found`);
        }
        const nextName = dto.name ?? existing.name;
        const nextYear = dto.academicYear ?? existing.academicYear;
        if (nextName !== existing.name || nextYear !== existing.academicYear) {
            await this.ensurePlanNameAvailable(nextName, nextYear, id);
        }
        if (existing.status === client_1.AccreditationPlanStatus.published &&
            dto.status !== client_1.AccreditationPlanStatus.archived) {
            throw new common_1.ConflictException('Published plans are immutable. Archive it or create a new revision.');
        }
        return this.prisma.accreditationPlan.update({
            where: { id },
            data: {
                ...(dto.name !== undefined ? { name: dto.name } : {}),
                ...(dto.academicYear !== undefined
                    ? { academicYear: dto.academicYear }
                    : {}),
                ...(dto.levelYear !== undefined ? { levelYear: dto.levelYear } : {}),
                ...(dto.status !== undefined ? { status: dto.status } : {}),
            },
            include: {
                _count: {
                    select: { lines: true, classAssignments: true },
                },
            },
        });
    }
    async createLine(planId, dto) {
        const plan = await this.prisma.accreditationPlan.findUnique({
            where: { id: planId },
            select: { id: true, status: true },
        });
        if (!plan) {
            throw new common_1.NotFoundException(`Accreditation plan ${planId} not found`);
        }
        if (plan.status !== client_1.AccreditationPlanStatus.draft) {
            throw new common_1.ConflictException('Only draft plans can be modified');
        }
        await this.ensureCoursExists(dto.coursId);
        if (dto.moduleId) {
            await this.ensureModuleExists(dto.moduleId);
        }
        if (dto.elementId) {
            await this.ensureElementExists(dto.elementId);
        }
        return this.prisma.accreditationPlanLine.create({
            data: {
                planId,
                coursId: dto.coursId,
                moduleId: dto.moduleId ?? null,
                elementId: dto.elementId ?? null,
                semestre: dto.semestre ?? null,
                volumeHoraire: dto.volumeHoraire ?? null,
                isMandatory: dto.isMandatory ?? true,
            },
            include: {
                cours: { select: { id: true, name: true, type: true } },
                module: { select: { id: true, name: true } },
                element: { select: { id: true, name: true, type: true } },
            },
        });
    }
    async removeLine(id) {
        const line = await this.prisma.accreditationPlanLine.findUnique({
            where: { id },
            include: {
                plan: { select: { id: true, status: true } },
            },
        });
        if (!line) {
            throw new common_1.NotFoundException(`Accreditation line ${id} not found`);
        }
        if (line.plan.status !== client_1.AccreditationPlanStatus.draft) {
            throw new common_1.ConflictException('Only draft plans can be modified');
        }
        return this.prisma.accreditationPlanLine.delete({ where: { id } });
    }
    async assignPlanToClassYear(planId, dto) {
        await this.ensurePlanExists(planId);
        await this.ensureClassExists(dto.classId);
        return this.prisma.classAccreditationAssignment.upsert({
            where: {
                classId_academicYear: {
                    classId: dto.classId,
                    academicYear: dto.academicYear,
                },
            },
            create: {
                classId: dto.classId,
                academicYear: dto.academicYear,
                planId,
            },
            update: {
                planId,
            },
            include: {
                class: { select: { id: true, name: true, year: true } },
                plan: {
                    select: {
                        id: true,
                        name: true,
                        academicYear: true,
                        status: true,
                    },
                },
            },
        });
    }
    async findClassAssignments(classId) {
        await this.ensureClassExists(classId);
        return this.prisma.classAccreditationAssignment.findMany({
            where: { classId },
            include: {
                plan: {
                    select: {
                        id: true,
                        name: true,
                        academicYear: true,
                        status: true,
                        _count: { select: { lines: true } },
                    },
                },
            },
            orderBy: [{ academicYear: 'desc' }, { createdAt: 'desc' }],
        });
    }
    async transferClassAssignment(classId, dto) {
        await this.ensureClassExists(classId);
        if (dto.fromAcademicYear === dto.toAcademicYear) {
            throw new common_1.BadRequestException('Source and target academic years must be different');
        }
        const sourceAssignment = await this.prisma.classAccreditationAssignment.findUnique({
            where: {
                classId_academicYear: {
                    classId,
                    academicYear: dto.fromAcademicYear,
                },
            },
            include: {
                plan: {
                    include: {
                        lines: {
                            select: {
                                id: true,
                                coursId: true,
                                moduleId: true,
                                elementId: true,
                                semestre: true,
                                volumeHoraire: true,
                                isMandatory: true,
                            },
                        },
                    },
                },
            },
        });
        if (!sourceAssignment) {
            throw new common_1.NotFoundException(`No class accreditation assignment found for year ${dto.fromAcademicYear}`);
        }
        const existingTarget = await this.prisma.classAccreditationAssignment.findUnique({
            where: {
                classId_academicYear: {
                    classId,
                    academicYear: dto.toAcademicYear,
                },
            },
            include: {
                plan: {
                    select: {
                        id: true,
                        name: true,
                        academicYear: true,
                    },
                },
            },
        });
        if (existingTarget) {
            throw new common_1.ConflictException(`Class already has an accreditation assignment for ${dto.toAcademicYear} (plan: ${existingTarget.plan.name})`);
        }
        return this.prisma.$transaction(async (tx) => {
            const sourcePlan = sourceAssignment.plan;
            const requestedName = dto.targetPlanName?.trim() ||
                `${sourcePlan.name} (${dto.toAcademicYear})`;
            const targetName = await this.generateAvailablePlanName(tx, requestedName, dto.toAcademicYear);
            const targetPlan = await tx.accreditationPlan.create({
                data: {
                    name: targetName,
                    academicYear: dto.toAcademicYear,
                    levelYear: sourcePlan.levelYear,
                    filiereId: sourcePlan.filiereId,
                    optionId: sourcePlan.optionId,
                    cycleId: sourcePlan.cycleId,
                    sourcePlanId: sourcePlan.id,
                    status: client_1.AccreditationPlanStatus.draft,
                },
            });
            if (sourcePlan.lines.length > 0) {
                await tx.accreditationPlanLine.createMany({
                    data: sourcePlan.lines.map((line) => ({
                        planId: targetPlan.id,
                        coursId: line.coursId,
                        moduleId: line.moduleId,
                        elementId: line.elementId,
                        semestre: line.semestre,
                        volumeHoraire: line.volumeHoraire,
                        isMandatory: line.isMandatory,
                        originLineId: line.id,
                    })),
                });
            }
            return tx.classAccreditationAssignment.create({
                data: {
                    classId,
                    academicYear: dto.toAcademicYear,
                    planId: targetPlan.id,
                },
                include: {
                    class: { select: { id: true, name: true, year: true } },
                    plan: {
                        select: {
                            id: true,
                            name: true,
                            academicYear: true,
                            status: true,
                            sourcePlanId: true,
                        },
                    },
                },
            });
        });
    }
    async diffWithSource(id) {
        const plan = await this.prisma.accreditationPlan.findUnique({
            where: { id },
            include: {
                lines: {
                    select: {
                        id: true,
                        coursId: true,
                        volumeHoraire: true,
                        semestre: true,
                        isMandatory: true,
                        cours: { select: { id: true, name: true, type: true } },
                    },
                },
                sourcePlan: {
                    include: {
                        lines: {
                            select: {
                                id: true,
                                coursId: true,
                                volumeHoraire: true,
                                semestre: true,
                                isMandatory: true,
                                cours: { select: { id: true, name: true, type: true } },
                            },
                        },
                    },
                },
            },
        });
        if (!plan) {
            throw new common_1.NotFoundException(`Accreditation plan ${id} not found`);
        }
        if (!plan.sourcePlan) {
            return {
                sourcePlan: null,
                added: plan.lines,
                removed: [],
                changed: [],
            };
        }
        const sourceByCours = new Map(plan.sourcePlan.lines.map((line) => [line.coursId, line]));
        const targetByCours = new Map(plan.lines.map((line) => [line.coursId, line]));
        const added = plan.lines.filter((line) => !sourceByCours.has(line.coursId));
        const removed = plan.sourcePlan.lines.filter((line) => !targetByCours.has(line.coursId));
        const changed = plan.lines
            .filter((line) => sourceByCours.has(line.coursId))
            .map((line) => {
            const previous = sourceByCours.get(line.coursId);
            const hasDelta = previous.volumeHoraire !== line.volumeHoraire ||
                previous.semestre !== line.semestre ||
                previous.isMandatory !== line.isMandatory;
            if (!hasDelta) {
                return null;
            }
            return {
                coursId: line.coursId,
                cours: line.cours,
                before: {
                    volumeHoraire: previous.volumeHoraire,
                    semestre: previous.semestre,
                    isMandatory: previous.isMandatory,
                },
                after: {
                    volumeHoraire: line.volumeHoraire,
                    semestre: line.semestre,
                    isMandatory: line.isMandatory,
                },
            };
        })
            .filter((item) => item !== null);
        return {
            sourcePlan: {
                id: plan.sourcePlan.id,
                name: plan.sourcePlan.name,
                academicYear: plan.sourcePlan.academicYear,
            },
            added,
            removed,
            changed,
        };
    }
    async ensurePlanNameAvailable(name, academicYear, excludeId) {
        const existing = await this.prisma.accreditationPlan.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                academicYear,
                ...(excludeId ? { id: { not: excludeId } } : {}),
            },
            select: { id: true },
        });
        if (existing) {
            throw new common_1.ConflictException(`Plan "${name}" already exists for year ${academicYear}`);
        }
    }
    async ensurePlanExists(id) {
        const plan = await this.prisma.accreditationPlan.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!plan) {
            throw new common_1.NotFoundException(`Accreditation plan ${id} not found`);
        }
    }
    async ensureClassExists(id) {
        const item = await this.prisma.academicClass.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Class ${id} not found`);
        }
    }
    async ensureCoursExists(id) {
        const item = await this.prisma.cours.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Cours ${id} not found`);
        }
    }
    async ensureFiliereExists(id) {
        const item = await this.prisma.filiere.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Filiere ${id} not found`);
        }
    }
    async ensureOptionExists(id) {
        const item = await this.prisma.option.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Option ${id} not found`);
        }
    }
    async ensureCycleExists(id) {
        const item = await this.prisma.cycle.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Cycle ${id} not found`);
        }
    }
    async ensureModuleExists(id) {
        const item = await this.prisma.module.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Module ${id} not found`);
        }
    }
    async ensureElementExists(id) {
        const item = await this.prisma.elementModule.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!item) {
            throw new common_1.NotFoundException(`ElementModule ${id} not found`);
        }
    }
    async generateAvailablePlanName(tx, baseName, academicYear) {
        let candidate = baseName;
        let sequence = 2;
        while (true) {
            const existing = await tx.accreditationPlan.findFirst({
                where: {
                    name: { equals: candidate, mode: 'insensitive' },
                    academicYear,
                },
                select: { id: true },
            });
            if (!existing) {
                return candidate;
            }
            candidate = `${baseName} - v${sequence}`;
            sequence += 1;
        }
    }
};
exports.AccreditationsService = AccreditationsService;
exports.AccreditationsService = AccreditationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AccreditationsService);
//# sourceMappingURL=accreditations.service.js.map