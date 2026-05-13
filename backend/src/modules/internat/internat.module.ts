import { Module } from '@nestjs/common';
import { InternatController } from './internat.controller';
import { InternatService } from './internat.service';

@Module({
  controllers: [InternatController],
  providers: [InternatService],
  exports: [InternatService],
})
export class InternatModule {}
