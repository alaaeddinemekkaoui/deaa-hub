import { Injectable } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      service: 'DEAA-Hub API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getDatabaseStatus() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        dbConnected: true,
        message: 'Database connection is healthy',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        dbConnected: false,
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
