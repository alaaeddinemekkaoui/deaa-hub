import { Module } from '@nestjs/common';
import { LaureatesController } from './laureates.controller';
import { LaureatesService } from './laureates.service';

@Module({
  controllers: [LaureatesController],
  providers: [LaureatesService],
  exports: [LaureatesService],
})
export class LaureatesModule {}
