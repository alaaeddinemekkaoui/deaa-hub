import { PrepaYear, Sex, StudentCycle } from '@prisma/client';
export declare class CreateStudentDto {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    sex: Sex;
    cin: string;
    codeMassar: string;
    dateNaissance: string;
    email?: string;
    telephone?: string;
    cycle?: StudentCycle;
    prepaYear?: PrepaYear;
    prepaTrack?: string;
    entryLevel?: number;
    filiereId?: number;
    classId: number;
    firstYearEntry: number;
    bacType?: string;
    anneeAcademique: string;
    dateInscription: string;
}
