import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Document } from '../documents/document.entity';
import { DocumentSheetOp } from '../documents/document-sheet-op.entity';
import { SheetSnapshot } from '../documents/sheet-snapshot.entity';
import { Project } from '../projects/project.entity';
import { Act } from '../acts/act.entity';
import { Invoice } from '../supply/invoice.entity';
import { SupplyOrder } from '../supply/entities/supply-order.entity';
import { User } from '../users/user.entity';
import { PresenceModule } from '../presence/presence.module';
import { CollabGateway } from './collab.gateway';
import { CollabService } from './collab.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentSheetOp, SheetSnapshot, Project, Act, Invoice, SupplyOrder, User]),
    PresenceModule,
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
