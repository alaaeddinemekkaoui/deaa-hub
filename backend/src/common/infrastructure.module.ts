import { Module } from '@nestjs/common';
import { RedisModule } from './cache/redis.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [RedisModule, StorageModule],
  exports: [RedisModule, StorageModule],
})
export class InfrastructureModule {}
