import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Document } from '../documents/document.entity';
import { DocumentSheetOp } from '../documents/document-sheet-op.entity';
import { SheetSnapshot } from '../documents/sheet-snapshot.entity';
import { CollabGateway } from './collab.gateway';
import { CollabService } from './collab.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentSheetOp, SheetSnapshot]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [CollabGateway, CollabService],
})
export class CollabModule {}
