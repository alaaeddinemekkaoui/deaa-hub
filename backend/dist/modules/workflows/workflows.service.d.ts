import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
export declare class WorkflowsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): import(".prisma/client").Prisma.PrismaPromise<({
        student: {
            fullName: string;
            id: number;
            codeMassar: string;
        } | null;
        assignedTo: {
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
            id: number;
        };
        timeline: {
            id: number;
            status: import(".prisma/client").$Enums.WorkflowStatus;
            changedAt: Date;
            note: string | null;
            taskId: number;
        }[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.WorkflowStatus;
        studentId: number | null;
        title: string;
        description: string | null;
        assignedToId: number;
    })[]>;
    findOne(id: number): import(".prisma/client").Prisma.Prisma__WorkflowTaskClient<({
        student: {
            fullName: string;
            id: number;
            codeMassar: string;
        } | null;
        assignedTo: {
            fullName: string;
            role: import(".prisma/client").$Enums.UserRole;
            id: number;
        };
        timeline: {
            id: number;
            status: import(".prisma/client").$Enums.WorkflowStatus;
            changedAt: Date;
            note: string | null;
            taskId: number;
        }[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.WorkflowStatus;
        studentId: number | null;
        title: string;
        description: string | null;
        assignedToId: number;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    create(dto: CreateWorkflowDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.WorkflowStatus;
        studentId: number | null;
        title: string;
        description: string | null;
        assignedToId: number;
    }>;
    update(id: number, dto: UpdateWorkflowDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.WorkflowStatus;
        studentId: number | null;
        title: string;
        description: string | null;
        assignedToId: number;
    }>;
    remove(id: number): import(".prisma/client").Prisma.Prisma__WorkflowTaskClient<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.WorkflowStatus;
        studentId: number | null;
        title: string;
        description: string | null;
        assignedToId: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
