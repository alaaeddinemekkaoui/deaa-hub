import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassQueryDto } from './dto/class-query.dto';
export declare class ClassesController {
    private readonly classesService;
    constructor(classesService: ClassesService);
    findAll(query: ClassQueryDto): Promise<{
        data: ({
            filiere: ({
                department: {
                    id: number;
                    name: string;
                };
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                code: string;
                departmentId: number;
                filiereType: string | null;
            }) | null;
            _count: {
                teachers: number;
                students: number;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            year: number;
            filiereId: number | null;
            classType: string | null;
        })[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPreviousPage: boolean;
        };
    }>;
    findOne(id: number): Promise<{
        teachers: ({
            teacher: {
                id: number;
                email: string | null;
                createdAt: Date;
                updatedAt: Date;
                departmentId: number;
                filiereId: number | null;
                firstName: string;
                lastName: string;
                cin: string | null;
                dateInscription: Date;
                phoneNumber: string | null;
                roleId: number;
                gradeId: number;
            };
        } & {
            id: number;
            createdAt: Date;
            classId: number;
            teacherId: number;
        })[];
        students: {
            id: number;
            email: string | null;
            fullName: string;
            createdAt: Date;
            updatedAt: Date;
            filiereId: number | null;
            firstName: string | null;
            lastName: string | null;
            sex: import(".prisma/client").$Enums.Sex;
            cin: string;
            codeMassar: string;
            dateNaissance: Date;
            telephone: string | null;
            cycle: import(".prisma/client").$Enums.StudentCycle;
            prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
            prepaTrack: string | null;
            entryLevel: number | null;
            classId: number | null;
            firstYearEntry: number;
            bacType: string | null;
            anneeAcademique: string;
            dateInscription: Date;
        }[];
        filiere: ({
            department: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
            };
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string;
            departmentId: number;
            filiereType: string | null;
        }) | null;
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        year: number;
        filiereId: number | null;
        classType: string | null;
    }>;
    create(dto: CreateClassDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        year: number;
        filiereId: number | null;
        classType: string | null;
    }>;
    update(id: number, dto: UpdateClassDto): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        year: number;
        filiereId: number | null;
        classType: string | null;
    }>;
    remove(id: number): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        year: number;
        filiereId: number | null;
        classType: string | null;
    }>;
}
