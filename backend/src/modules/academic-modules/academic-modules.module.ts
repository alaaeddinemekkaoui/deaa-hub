import { Module } from '@nestjs/common';
import { AcademicModulesController } from './academic-modules.controller';
import { AcademicModulesService } from './academic-modules.service';

@Module({ controllers: [AcademicModulesController], providers: [AcademicModulesService], exports: [AcademicModulesService] })
export class AcademicModulesModule {}
