import { Module } from '@nestjs/common';
import { ElementModulesController } from './element-modules.controller';
import { ElementModulesService } from './element-modules.service';
import { AcademicModulesModule } from '../academic-modules/academic-modules.module';

@Module({
  imports: [AcademicModulesModule],
  controllers: [ElementModulesController],
  providers: [ElementModulesService],
})
export class ElementModulesModule {}
