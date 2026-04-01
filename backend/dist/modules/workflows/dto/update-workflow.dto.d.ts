import { WorkflowStatus } from '@prisma/client';
export declare class UpdateWorkflowDto {
    title?: string;
    description?: string;
    status?: WorkflowStatus;
    assignedToId?: number;
    studentId?: number;
    timelineNote?: string;
}
