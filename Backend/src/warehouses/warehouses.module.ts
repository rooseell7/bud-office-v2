import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';
import { Warehouse } from './warehouse.entity';

// Entities з модуля warehouse/entities
import { WarehouseBalance } from '../warehouse/entities/warehouse-balance.entity';
import { WarehouseMovement } from '../warehouse/entities/warehouse-movement.entity';
import { WarehouseMovementItem } from '../warehouse/entities/warehouse-movement-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Warehouse,
      WarehouseBalance,
      WarehouseMovement,
      WarehouseMovementItem,
    ]),
  ],
  controllers: [WarehousesController],
  providers: [WarehousesService],
  exports: [WarehousesService],
})
export class WarehousesModule {}
