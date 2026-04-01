import { Module } from '@nestjs/common';
import { AccreditationsController } from './accreditations.controller';
import { AccreditationsService } from './accreditations.service';

@Module({
  controllers: [AccreditationsController],
  providers: [AccreditationsService],
  exports: [AccreditationsService],
})
export class AccreditationsModule {}
