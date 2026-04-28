import { Module } from '@nestjs/common';
import { ProfileDocumentTypesController } from './profile-document-types.controller';
import { ProfileDocumentTypesService } from './profile-document-types.service';

@Module({
  controllers: [ProfileDocumentTypesController],
  providers: [ProfileDocumentTypesService],
  exports: [ProfileDocumentTypesService],
})
export class ProfileDocumentTypesModule {}
