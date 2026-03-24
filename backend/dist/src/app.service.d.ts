import { PrismaService } from './common/prisma/prisma.service';
export declare class AppService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHealth(): {
        service: string;
        status: string;
        timestamp: string;
    };
    getDatabaseStatus(): Promise<{
        dbConnected: boolean;
        message: string;
        timestamp: string;
    }>;
}
