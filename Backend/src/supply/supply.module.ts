import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Material } from './material.entity';
import { Invoice } from './invoice.entity';
import { MaterialsService } from './materials.service';
import { InvoicesService } from './invoices.service';
import { MaterialsController } from './materials.controller';
import { InvoicesController } from './invoices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Material, Invoice])],
  controllers: [MaterialsController, InvoicesController],
  providers: [MaterialsService, InvoicesService],
})
export class SupplyModule {}
