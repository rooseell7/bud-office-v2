import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Material } from './material.entity';
import { Invoice } from './invoice.entity';
import { MaterialsService } from './materials.service';
import { InvoicesService } from './invoices.service';
import { MaterialsController } from './materials.controller';
import { InvoicesController } from './invoices.controller';

import { SupplyRequest } from './entities/supply-request.entity';
import { SupplyRequestItem } from './entities/supply-request-item.entity';
import { SupplyOrder } from './entities/supply-order.entity';
import { SupplyOrderItem } from './entities/supply-order-item.entity';
import { SupplyReceipt } from './entities/supply-receipt.entity';
import { SupplyReceiptItem } from './entities/supply-receipt-item.entity';
import { Payable } from './entities/payable.entity';
import { Payment } from './entities/payment.entity';
import { AuditEvent } from './entities/audit-event.entity';

import { SupplyAuditService } from './audit.service';
import { SupplyRequestService } from './supply-request.service';
import { SupplyOrderService } from './supply-order.service';
import { SupplyReceiptService } from './supply-receipt.service';
import { SupplyPayableService } from './supply-payable.service';
import { SupplyRequestsController } from './supply-requests.controller';
import { SupplyOrdersController } from './supply-orders.controller';
import { SupplyReceiptsController } from './supply-receipts.controller';
import { SupplyPayablesController } from './supply-payables.controller';
import { SupplyAuditController } from './audit.controller';
import { AttachmentsModule } from '../attachments/attachments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Material,
      Invoice,
      SupplyRequest,
      SupplyRequestItem,
      SupplyOrder,
      SupplyOrderItem,
      SupplyReceipt,
      SupplyReceiptItem,
      Payable,
      Payment,
      AuditEvent,
    ]),
    AttachmentsModule,
  ],
  controllers: [
    MaterialsController,
    InvoicesController,
    SupplyRequestsController,
    SupplyOrdersController,
    SupplyReceiptsController,
    SupplyPayablesController,
    SupplyAuditController,
  ],
  providers: [
    MaterialsService,
    InvoicesService,
    SupplyAuditService,
    SupplyRequestService,
    SupplyOrderService,
    SupplyReceiptService,
    SupplyPayableService,
  ],
})
export class SupplyModule {}
