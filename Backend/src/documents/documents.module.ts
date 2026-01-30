import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Document } from './document.entity';
import { DocumentEvent } from './document-event.entity';
import { DocumentVersion } from './document-version.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentsSchemaInitService } from './documents-schema-init.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document, DocumentEvent, DocumentVersion])],
  controllers: [DocumentsController],
  providers: [DocumentsSchemaInitService, DocumentsService],
})
export class DocumentsModule {}
