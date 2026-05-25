import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { SmartErpController } from './smart-erp.controller';
import { SmartErpService } from './smart-erp.service';

@Module({
  imports: [DocumentsModule],
  controllers: [SmartErpController],
  providers: [SmartErpService],
})
export class SmartErpModule {}
