import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '../documents/document.entity';
import { DocumentVersion } from '../documents/document-version.entity';
import { DocumentSheetOp } from '../documents/document-sheet-op.entity';
import { SheetSnapshot } from '../documents/sheet-snapshot.entity';
import { SheetsService } from './sheets.service';
import { SheetsController } from './sheets.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentVersion,
      DocumentSheetOp,
      SheetSnapshot,
    ]),
  ],
  controllers: [SheetsController],
  providers: [SheetsService],
})
export class SheetsModule {}
