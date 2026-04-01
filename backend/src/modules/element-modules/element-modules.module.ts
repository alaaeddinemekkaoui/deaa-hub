import { Module } from '@nestjs/common';
import { ElementModulesController } from './element-modules.controller';
import { ElementModulesService } from './element-modules.service';

@Module({ controllers: [ElementModulesController], providers: [ElementModulesService] })
export class ElementModulesModule {}
