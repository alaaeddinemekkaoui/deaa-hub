import { PrismaService } from '../../common/prisma/prisma.service';
export declare class DashboardService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getOverview(): Promise<{
        stats: {
            totalStudents: number;
            teachersCount: number;
            departmentsCount: number;
            filieresCount: number;
            classesCount: number;
            dossiersCount: number;
        };
        studentsPerFiliere: {
            filiereId: number;
            filiere: string;
            total: number;
        }[];
        studentsPerCycle: {
            cycle: import(".prisma/client").$Enums.StudentCycle;
            total: number;
        }[];
        laureatesPerYear: {
            year: number;
            total: number;
        }[];
        recentActivity: ({
            user: {
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
                id: number;
            };
        } & {
            id: number;
            action: string;
            metadata: import("@prisma/client/runtime/library").JsonValue | null;
            timestamp: Date;
            userId: number;
        })[];
    }>;
}
