// buduy-crm-backend/src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StageModule } from './stages/stage.module';

import { User } from './users/user.entity';
import { Role } from './roles/role.entity';
import { Client } from './clients/client.entity';
import { Project } from './projects/project.entity';
import { Deal } from './deals/deal.entity';
import { Act } from './acts/act.entity';
import { Material } from './supply/material.entity';
import { Invoice } from './supply/invoice.entity';
import { WorkItem } from './work-items/work-item.entity';
import { Document } from './documents/document.entity';
import { DocumentEvent } from './documents/document-event.entity';
import { Attachment } from './attachments/attachment.entity';

import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { ClientModule } from './clients/clients.module';
import { ProjectsModule } from './projects/projects.module';
import { DealsModule } from './deals/deals.module';
import { WorkItemsModule } from './work-items/work-items.module';
import { ActsModule } from './acts/acts.module';
import { SupplyModule } from './supply/supply.module';
import { MaterialsModule } from './materials/materials.module';
import { ObjectsModule } from './objects/objects.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { DeliveryModule } from './delivery/delivery.module';
import { DocumentsModule } from './documents/documents.module';
import { EstimatesModule } from './estimates/estimates.module';
import { SheetsModule } from './sheets/sheets.module';
import { CollabModule } from './collab/collab.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { AdminModule } from './admin/admin.module';

function toBool(v: unknown, def = false): boolean {
  if (v === undefined || v === null) return def;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'y';
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        /**
         * DEV перемикач для одноразового створення нових таблиць.
         * ВАЖЛИВО: для існуючої БД з даними synchronize=true може ламати схему.
         * Тому за замовчуванням false.
         */
        const sync = toBool(config.get('TYPEORM_SYNC'), false);

        return {
          type: 'postgres' as const,
          host: config.get<string>('DB_HOST'),
          port: Number(config.get<number>('DB_PORT')),
          username: config.get<string>('DB_USER'),
          password: config.get<string>('DB_PASS'),
          database: config.get<string>('DB_NAME'),

          entities: [
            User,
            Role,
            Client,
            Project,
            Deal,
            WorkItem,
            Act,
            Material,
            Invoice,
            Document,
            DocumentEvent,
            Attachment,
          ],
          autoLoadEntities: true,

          synchronize: sync,
          migrationsRun: false,

          logging: true,
        };
      },
    }),

    UsersModule,
    RolesModule,
    AuthModule,
    ClientModule,
    ProjectsModule,
    DealsModule,
    WorkItemsModule,
    StageModule,
    ActsModule,
    SupplyModule,
    MaterialsModule,
    ObjectsModule,
    WarehousesModule,
    WarehouseModule,
    DeliveryModule,
    DocumentsModule,
    EstimatesModule,
    SheetsModule,
    CollabModule,
    AttachmentsModule,
    AdminModule,
  ],
})
export class AppModule {}
