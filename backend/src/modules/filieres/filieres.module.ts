import { Module } from '@nestjs/common';
import { FilieresController } from './filieres.controller';
import { FilieresService } from './filieres.service';

@Module({
  controllers: [FilieresController],
  providers: [FilieresService],
  exports: [FilieresService],
})
export class FilieresModule {}
