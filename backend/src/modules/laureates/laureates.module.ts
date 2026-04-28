import { Module } from '@nestjs/common';
import { LaureatesController } from './laureates.controller';
import { LaureatesService } from './laureates.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [LaureatesController],
  providers: [LaureatesService],
  exports: [LaureatesService],
})
export class LaureatesModule {}
