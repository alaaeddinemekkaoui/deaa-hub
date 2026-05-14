import 'dotenv/config';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const rawUrl = process.env.DATABASE_URL ?? '';
    // Append connection pool params if not already present
    const hasParams = rawUrl.includes('?');
    // Per-worker pool: keep small so total = workers × limit stays under pg max_connections.
    // Default pg max_connections=100; with 12 workers, 7 each = 84 — safe headroom.
    const configuredLimit = Number(process.env.DB_CONNECTION_LIMIT ?? 0);
    const workerCount =
      parseInt(process.env.WORKERS ?? '0', 10) || require('os').cpus().length;
    const perWorkerLimit =
      configuredLimit > 0 ? configuredLimit : Math.max(3, Math.floor(80 / workerCount));
    const needsPool = !rawUrl.includes('connection_limit');
    const pooledUrl = needsPool
      ? `${rawUrl}${hasParams ? '&' : '?'}connection_limit=${perWorkerLimit}&pool_timeout=20`
      : rawUrl;

    super({
      datasources: { db: { url: pooledUrl } },
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
    });

    this._poolLimit = perWorkerLimit;
  }

  private readonly _poolLimit: number;

  async onModuleInit() {
    await this.$connect();
    this.logger.log(
      `Database connected (pool_limit=${this._poolLimit}/worker)`,
    );
  }
}
