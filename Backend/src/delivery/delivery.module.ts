import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';

import { DeliveryWorkLog } from './entities/delivery-work-log.entity';
import { DeliveryAct } from './entities/delivery-act.entity';
import { DeliveryActItem } from './entities/delivery-act-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryWorkLog, DeliveryAct, DeliveryActItem])],
  controllers: [DeliveryController],
  providers: [DeliveryService],
})
export class DeliveryModule {}