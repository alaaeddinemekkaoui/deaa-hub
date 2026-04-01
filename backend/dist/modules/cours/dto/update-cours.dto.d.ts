import { ElementType } from '@prisma/client';
export declare class UpdateCoursDto {
    name?: string;
    type?: ElementType;
    elementModuleId?: number | null;
}
