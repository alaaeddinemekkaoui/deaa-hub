import { Injectable } from '@nestjs/common';
import { PrismaService } from './common/prisma/prisma.service';
import { RedisService } from './common/cache/redis.service';
import { ObjectStorageService } from './common/storage/object-storage.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: ObjectStorageService,
  ) {}

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

  async getInfrastructureHealth() {
    const checks = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.ping(),
      this.storage.healthCheck(),
    ]);

    return {
      postgres: checks[0].status === 'fulfilled',
      redis: checks[1].status === 'fulfilled' && checks[1].value === true,
      minio: checks[2].status === 'fulfilled' && checks[2].value === true,
      timestamp: new Date().toISOString(),
    };
  }
}
