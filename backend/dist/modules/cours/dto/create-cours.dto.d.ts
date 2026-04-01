import { ElementType } from '@prisma/client';
export declare class CreateCoursDto {
    name: string;
    type?: ElementType;
    elementModuleId?: number | null;
    classId?: number | null;
    teacherId?: number | null;
}
