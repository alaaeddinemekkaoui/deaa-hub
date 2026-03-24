export declare class CreateTeacherDto {
    firstName: string;
    lastName: string;
    cin?: string;
    email?: string;
    phoneNumber?: string;
    dateInscription?: string;
    departmentId: number;
    filiereId?: number | null;
    roleId: number;
    gradeId: number;
    classIds?: number[];
}
