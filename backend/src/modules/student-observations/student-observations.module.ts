import { Module } from '@nestjs/common';
import { StudentObservationsController } from './student-observations.controller';
import { StudentObservationsService } from './student-observations.service';

@Module({
  controllers: [StudentObservationsController],
  providers: [StudentObservationsService],
})
export class StudentObservationsModule {}
