import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client?: Redis;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn(
        'REDIS_URL is not set; Redis-backed features are disabled',
      );
      return;
    }

    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
    this.client.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });
    await this.client.connect();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  get isEnabled() {
    return Boolean(this.client);
  }

  get raw() {
    if (!this.client) {
      throw new Error('Redis is not configured. Set REDIS_URL to enable it.');
    }
    return this.client;
  }

  async ping() {
    if (!this.client) return false;
    return (await this.client.ping()) === 'PONG';
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number) {
    const payload = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      await this.raw.set(key, payload, 'EX', ttlSeconds);
      return;
    }
    await this.raw.set(key, payload);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const payload = await this.raw.get(key);
    return payload ? (JSON.parse(payload) as T) : null;
  }

  async delete(key: string) {
    return this.raw.del(key);
  }

  sessionKey(sessionId: string) {
    return `session:${sessionId}`;
  }

  otpKey(identifier: string) {
    return `otp:${identifier}`;
  }

  verificationTokenKey(token: string) {
    return `verification:${token}`;
  }

  qrAttendanceKey(sessionId: number) {
    return `attendance:qr:${sessionId}`;
  }

  cacheKey(scope: string, key: string) {
    return `cache:${scope}:${key}`;
  }

  rateLimitKey(scope: string, identifier: string) {
    return `rate-limit:${scope}:${identifier}`;
  }

  queueKey(name: string) {
    return `queue:${name}`;
  }
}
