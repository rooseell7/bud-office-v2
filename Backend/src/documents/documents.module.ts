import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Document } from './document.entity';
import { DocumentEvent } from './document-event.entity';
import { DocumentVersion } from './document-version.entity';
import { DocumentSheetOp } from './document-sheet-op.entity';
import { SheetSnapshot } from './sheet-snapshot.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentsSchemaInitService } from './documents-schema-init.service';
import { SheetOpsService } from './sheet-ops.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentEvent, DocumentVersion, DocumentSheetOp, SheetSnapshot]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsSchemaInitService, DocumentsService, SheetOpsService],
})
export class DocumentsModule {}
