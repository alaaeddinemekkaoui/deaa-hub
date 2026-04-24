import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CoursResourcesController } from './cours-resources.controller';
import { CoursResourcesService } from './cours-resources.service';

@Module({
  imports: [PrismaModule],
  controllers: [CoursResourcesController],
  providers: [CoursResourcesService],
})
export class CoursResourcesModule {}
