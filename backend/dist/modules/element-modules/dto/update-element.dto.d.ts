import { ElementType } from '@prisma/client';
export declare class UpdateElementDto {
    name?: string;
    moduleId?: number;
    volumeHoraire?: number | null;
    type?: ElementType;
    classId?: number | null;
}
