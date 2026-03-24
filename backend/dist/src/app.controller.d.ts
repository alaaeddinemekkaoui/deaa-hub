import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
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
