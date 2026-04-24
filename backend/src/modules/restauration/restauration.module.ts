import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RestaurationController } from './restauration.controller';
import { RestaurationService } from './restauration.service';

@Module({
  imports: [PrismaModule],
  controllers: [RestaurationController],
  providers: [RestaurationService],
})
export class RestaurationModule {}
