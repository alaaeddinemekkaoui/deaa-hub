import { WorkflowStatus } from '@prisma/client';
export declare class CreateWorkflowDto {
    title: string;
    description?: string;
    status?: WorkflowStatus;
    assignedToId: number;
    studentId?: number;
}
