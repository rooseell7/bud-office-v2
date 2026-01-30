// bud_office-backend/src/warehouse/warehouse.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WarehouseBalance } from './entities/warehouse-balance.entity';
import { WarehouseMovement } from './entities/warehouse-movement.entity';
import { WarehouseMovementItem } from './entities/warehouse-movement-item.entity';
import { WarehouseMovementDraft } from './entities/warehouse-movement-draft.entity'; // ✅ ADD

import { WarehouseService } from './warehouse.service';
import { WarehouseController } from './warehouse.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WarehouseBalance,
      WarehouseMovement,
      WarehouseMovementItem,
      WarehouseMovementDraft, // ✅ ADD
    ]),
  ],
  providers: [WarehouseService],
  controllers: [WarehouseController],
})
export class WarehouseModule {}
