import { AccreditationsService } from './accreditations.service';
import { AccreditationPlanQueryDto } from './dto/accreditation-plan-query.dto';
import { CreateAccreditationPlanDto } from './dto/create-accreditation-plan.dto';
import { UpdateAccreditationPlanDto } from './dto/update-accreditation-plan.dto';
import { CreateAccreditationLineDto } from './dto/create-accreditation-line.dto';
import { AssignClassAccreditationDto } from './dto/assign-class-accreditation.dto';
import { TransferClassAccreditationDto } from './dto/transfer-class-accreditation.dto';
export declare class AccreditationsController {
    private readonly service;
    constructor(service: AccreditationsService);
    findPlans(query: AccreditationPlanQueryDto): Promise<{
        data: ({
            filiere: {
                id: number;
                name: string;
            } | null;
            cycle: {
                id: number;
                name: string;
            } | null;
            option: {
                id: number;
                name: string;
            } | null;
            _count: {
                derivedPlans: number;
                lines: number;
                classAssignments: number;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            academicYear: string;
            status: import(".prisma/client").$Enums.AccreditationPlanStatus;
            filiereId: number | null;
            cycleId: number | null;
            optionId: number | null;
            levelYear: number | null;
            sourcePlanId: number | null;
        })[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    findPlan(id: number): Promise<{
        filiere: {
            id: number;
            name: string;
        } | null;
        cycle: {
            id: number;
            name: string;
        } | null;
        option: {
            id: number;
            name: string;
        } | null;
        sourcePlan: {
            id: number;
            name: string;
            academicYear: string;
        } | null;
        lines: ({
            cours: {
                id: number;
                name: string;
                type: import(".prisma/client").$Enums.ElementType;
            };
            module: {
                id: number;
                name: string;
            } | null;
            element: {
                id: number;
                name: string;
                type: import(".prisma/client").$Enums.ElementType;
            } | null;
            originLine: {
                id: number;
            } | null;
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            coursId: number;
            elementId: number | null;
            moduleId: number | null;
            volumeHoraire: number | null;
            semestre: string | null;
            isMandatory: boolean;
            planId: number;
            originLineId: number | null;
        })[];
        classAssignments: ({
            class: {
                filiere: {
                    id: number;
                    name: string;
                } | null;
                id: number;
                name: string;
                year: number;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            academicYear: string;
            classId: number;
            planId: number;
        })[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        academicYear: string;
        status: import(".prisma/client").$Enums.AccreditationPlanStatus;
        filiereId: number | null;
        cycleId: number | null;
        optionId: number | null;
        levelYear: number | null;
        sourcePlanId: number | null;
    }>;
    createPlan(dto: CreateAccreditationPlanDto): Promise<({
        _count: {
            lines: number;
        };
        sourcePlan: {
            id: number;
            name: string;
            academicYear: string;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        academicYear: string;
        status: import(".prisma/client").$Enums.AccreditationPlanStatus;
        filiereId: number | null;
        cycleId: number | null;
        optionId: number | null;
        levelYear: number | null;
        sourcePlanId: number | null;
    }) | null>;
    updatePlan(id: number, dto: UpdateAccreditationPlanDto): Promise<{
        _count: {
            lines: number;
            classAssignments: number;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        academicYear: string;
        status: import(".prisma/client").$Enums.AccreditationPlanStatus;
        filiereId: number | null;
        cycleId: number | null;
        optionId: number | null;
        levelYear: number | null;
        sourcePlanId: number | null;
    }>;
    createLine(planId: number, dto: CreateAccreditationLineDto): Promise<{
        cours: {
            id: number;
            name: string;
            type: import(".prisma/client").$Enums.ElementType;
        };
        module: {
            id: number;
            name: string;
        } | null;
        element: {
            id: number;
            name: string;
            type: import(".prisma/client").$Enums.ElementType;
        } | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        coursId: number;
        elementId: number | null;
        moduleId: number | null;
        volumeHoraire: number | null;
        semestre: string | null;
        isMandatory: boolean;
        planId: number;
        originLineId: number | null;
    }>;
    removeLine(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        coursId: number;
        elementId: number | null;
        moduleId: number | null;
        volumeHoraire: number | null;
        semestre: string | null;
        isMandatory: boolean;
        planId: number;
        originLineId: number | null;
    }>;
    diffWithSource(id: number): Promise<{
        sourcePlan: null;
        added: {
            cours: {
                id: number;
                name: string;
                type: import(".prisma/client").$Enums.ElementType;
            };
            id: number;
            coursId: number;
            volumeHoraire: number | null;
            semestre: string | null;
            isMandatory: boolean;
        }[];
        removed: never[];
        changed: never[];
    } | {
        sourcePlan: {
            id: number;
            name: string;
            academicYear: string;
        };
        added: {
            cours: {
                id: number;
                name: string;
                type: import(".prisma/client").$Enums.ElementType;
            };
            id: number;
            coursId: number;
            volumeHoraire: number | null;
            semestre: string | null;
            isMandatory: boolean;
        }[];
        removed: {
            cours: {
                id: number;
                name: string;
                type: import(".prisma/client").$Enums.ElementType;
            };
            id: number;
            coursId: number;
            volumeHoraire: number | null;
            semestre: string | null;
            isMandatory: boolean;
        }[];
        changed: {
            coursId: number;
            cours: {
                id: number;
                name: string;
                type: import(".prisma/client").$Enums.ElementType;
            };
            before: {
                volumeHoraire: number | null;
                semestre: string | null;
                isMandatory: boolean;
            };
            after: {
                volumeHoraire: number | null;
                semestre: string | null;
                isMandatory: boolean;
            };
        }[];
    }>;
    assignPlanToClassYear(planId: number, dto: AssignClassAccreditationDto): Promise<{
        class: {
            id: number;
            name: string;
            year: number;
        };
        plan: {
            id: number;
            name: string;
            academicYear: string;
            status: import(".prisma/client").$Enums.AccreditationPlanStatus;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        classId: number;
        planId: number;
    }>;
    findClassAssignments(classId: number): Promise<({
        plan: {
            id: number;
            _count: {
                lines: number;
            };
            name: string;
            academicYear: string;
            status: import(".prisma/client").$Enums.AccreditationPlanStatus;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        classId: number;
        planId: number;
    })[]>;
    transferClassAssignment(classId: number, dto: TransferClassAccreditationDto): Promise<{
        class: {
            id: number;
            name: string;
            year: number;
        };
        plan: {
            id: number;
            name: string;
            academicYear: string;
            status: import(".prisma/client").$Enums.AccreditationPlanStatus;
            sourcePlanId: number | null;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        academicYear: string;
        classId: number;
        planId: number;
    }>;
}
