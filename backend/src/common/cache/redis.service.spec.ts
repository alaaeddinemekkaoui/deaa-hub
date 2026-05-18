import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService', () => {
  it('stays disabled when REDIS_URL is not configured', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        RedisService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    const service = moduleRef.get(RedisService);
    await service.onModuleInit();

    expect(service.isEnabled).toBe(false);
    await expect(service.ping()).resolves.toBe(false);
    expect(service.qrAttendanceKey(42)).toBe('attendance:qr:42');
  });
});
