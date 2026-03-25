import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
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
                id: number;
                fullName: string;
                role: import(".prisma/client").$Enums.UserRole;
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
