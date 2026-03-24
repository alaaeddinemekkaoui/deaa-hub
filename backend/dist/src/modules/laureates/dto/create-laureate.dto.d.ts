import { DiplomaStatus } from '@prisma/client';
export declare class CreateLaureateDto {
    studentId: number;
    graduationYear: number;
    diplomaStatus?: DiplomaStatus;
    proofDocumentId?: number;
}
