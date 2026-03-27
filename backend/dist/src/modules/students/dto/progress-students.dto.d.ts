export declare class StudentProgressEntry {
    id: number;
    status: 'admis' | 'non_admis' | 'redoublant';
}
export declare class ProgressStudentsDto {
    fromClassId: number;
    toClassId: number;
    academicYear: string;
    students: StudentProgressEntry[];
}
