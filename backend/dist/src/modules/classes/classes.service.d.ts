import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassQueryDto } from './dto/class-query.dto';
export declare class ClassesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
                cin: string | null;
                firstName: string;
                lastName: string;
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
            cin: string;
            codeMassar: string;
            firstName: string | null;
            lastName: string | null;
            sex: import(".prisma/client").$Enums.Sex;
            dateNaissance: Date;
            telephone: string | null;
            cycle: import(".prisma/client").$Enums.StudentCycle;
            prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
            prepaTrack: string | null;
            entryLevel: number | null;
            classId: number | null;
            bacType: string | null;
            firstYearEntry: number;
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
    private ensureFiliereExists;
    private ensureClassIdentityAvailable;
    importFromBuffer(buffer: Buffer): Promise<{
        imported: number;
        errors: string[];
    }>;
}
