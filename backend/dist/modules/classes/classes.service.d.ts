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
            cycle: {
                id: number;
                name: string;
                code: string | null;
            } | null;
            _count: {
                cours: number;
                students: number;
                teachers: number;
            };
            academicOption: {
                id: number;
                name: string;
                code: string | null;
            } | null;
        } & {
            option: string | null;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            year: number;
            filiereId: number | null;
            classType: string | null;
            cycleId: number | null;
            optionId: number | null;
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
        cycle: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            code: string | null;
        } | null;
        students: {
            cycle: import(".prisma/client").$Enums.StudentCycle;
            fullName: string;
            email: string | null;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            firstName: string | null;
            lastName: string | null;
            sex: import(".prisma/client").$Enums.Sex;
            cin: string;
            codeMassar: string;
            dateNaissance: Date;
            telephone: string | null;
            prepaYear: import(".prisma/client").$Enums.PrepaYear | null;
            prepaTrack: string | null;
            entryLevel: number | null;
            filiereId: number | null;
            classId: number | null;
            firstYearEntry: number;
            bacType: string | null;
            anneeAcademique: string;
            dateInscription: Date;
        }[];
        teachers: ({
            teacher: {
                email: string | null;
                id: number;
                createdAt: Date;
                updatedAt: Date;
                firstName: string;
                lastName: string;
                cin: string | null;
                filiereId: number | null;
                dateInscription: Date;
                departmentId: number;
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
        academicOption: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            filiereId: number;
            code: string | null;
        } | null;
    } & {
        option: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        year: number;
        filiereId: number | null;
        classType: string | null;
        cycleId: number | null;
        optionId: number | null;
    }>;
    findCours(id: number): Promise<({
        teacher: {
            id: number;
            firstName: string;
            lastName: string;
        } | null;
        cours: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            type: import(".prisma/client").$Enums.ElementType;
            elementModuleId: number | null;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        classId: number;
        teacherId: number | null;
        coursId: number;
        groupLabel: string | null;
    })[]>;
    create(dto: CreateClassDto): Promise<{
        option: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        year: number;
        filiereId: number | null;
        classType: string | null;
        cycleId: number | null;
        optionId: number | null;
    }>;
    update(id: number, dto: UpdateClassDto): Promise<{
        option: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        year: number;
        filiereId: number | null;
        classType: string | null;
        cycleId: number | null;
        optionId: number | null;
    }>;
    remove(id: number): Promise<{
        option: string | null;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        year: number;
        filiereId: number | null;
        classType: string | null;
        cycleId: number | null;
        optionId: number | null;
    }>;
    private ensureFiliereExists;
    private ensureCycleExists;
    private ensureOptionExists;
    private ensureClassIdentityAvailable;
    importFromBuffer(buffer: Buffer): Promise<{
        imported: number;
        errors: string[];
    }>;
}
