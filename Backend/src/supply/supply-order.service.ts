import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplyOrder } from './entities/supply-order.entity';
import { SupplyOrderItem } from './entities/supply-order-item.entity';
import { SupplyReceipt } from './entities/supply-receipt.entity';
import { SupplyReceiptItem } from './entities/supply-receipt-item.entity';
import { SupplyAuditService } from './audit.service';
import { CreateSupplyOrderDto, UpdateSupplyOrderDto } from './dto/supply-order.dto';

@Injectable()
export class SupplyOrderService {
  constructor(
    @InjectRepository(SupplyOrder) private readonly orderRepo: Repository<SupplyOrder>,
    @InjectRepository(SupplyOrderItem) private readonly orderItemRepo: Repository<SupplyOrderItem>,
    @InjectRepository(SupplyReceipt) private readonly receiptRepo: Repository<SupplyReceipt>,
    @InjectRepository(SupplyReceiptItem) private readonly receiptItemRepo: Repository<SupplyReceiptItem>,
    private readonly audit: SupplyAuditService,
  ) {}

  async findAll(userId: number, projectId?: number, status?: string, supplierId?: number) {
    const qb = this.orderRepo.createQueryBuilder('o').leftJoinAndSelect('o.items', 'items').orderBy('o.id', 'DESC');
    if (projectId != null) qb.andWhere('o.projectId = :projectId', { projectId });
    if (status) qb.andWhere('o.status = :status', { status });
    if (supplierId != null) qb.andWhere('o.supplierId = :supplierId', { supplierId });
    const orders = await qb.getMany();
    const receiptCounts = await this.receiptRepo
      .createQueryBuilder('r')
      .select('r.sourceOrderId', 'orderId')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('r.sourceOrderId')
      .getRawMany();
    const map = Object.fromEntries((receiptCounts as { orderId: number; cnt: string }[]).map((x) => [x.orderId, Number(x.cnt)]));
    return orders.map((o) => ({ ...o, receiptsCount: map[o.id] ?? 0 }));
  }

  async findOne(userId: number, id: number) {
    const o = await this.orderRepo.findOne({
      where: { id },
      relations: ['items'],
      order: { items: { id: 'ASC' } },
    });
    if (!o) throw new NotFoundException('Supply order not found');
    const receipts = await this.receiptRepo.find({ where: { sourceOrderId: id }, select: ['id', 'status', 'total'] });
    const audit = await this.audit.getByEntity('supply_order', id);
    // Avoid circular ref (items[].order) when serializing response
    const items = (o.items ?? []).map((i) => ({ ...i, order: undefined }));
    return { ...o, items, linkedReceipts: receipts, audit };
  }

  async create(userId: number, dto: CreateSupplyOrderDto) {
    const o = this.orderRepo.create({
      projectId: dto.projectId,
      sourceRequestId: dto.sourceRequestId ?? null,
      supplierId: dto.supplierId ?? null,
      status: 'draft',
      deliveryType: dto.deliveryType ?? 'supplier_to_object',
      deliveryDatePlanned: dto.deliveryDatePlanned ?? null,
      paymentTerms: dto.paymentTerms ?? null,
      comment: dto.comment ?? null,
      createdById: userId,
    });
    const saved = await this.orderRepo.save(o);
    if (dto.items?.length) {
      for (const row of dto.items) {
        await this.orderItemRepo.save(
          this.orderItemRepo.create({
            orderId: saved.id,
            sourceRequestItemId: row.sourceRequestItemId ?? null,
            materialId: row.materialId ?? null,
            customName: row.customName ?? null,
            unit: row.unit,
            qtyPlanned: String(row.qtyPlanned),
            unitPrice: row.unitPrice != null ? String(row.unitPrice) : null,
            note: row.note ?? null,
          }),
        );
      }
    }
    await this.audit.log({
      entityType: 'supply_order',
      entityId: saved.id,
      action: 'create',
      message: 'Замовлення створено',
      meta: { projectId: saved.projectId },
      actorId: userId,
    });
    return this.findOne(userId, saved.id);
  }

  async update(userId: number, id: number, dto: UpdateSupplyOrderDto) {
    const o = await this.orderRepo.findOne({ where: { id }, relations: ['items'] });
    if (!o) throw new NotFoundException('Supply order not found');
    if (o.status !== 'draft') throw new BadRequestException('Можна редагувати лише чернетку');
    if (dto.supplierId !== undefined) o.supplierId = dto.supplierId ?? null;
    if (dto.deliveryType !== undefined) o.deliveryType = dto.deliveryType;
    if (dto.deliveryDatePlanned !== undefined) o.deliveryDatePlanned = dto.deliveryDatePlanned ?? null;
    if (dto.paymentTerms !== undefined) o.paymentTerms = dto.paymentTerms ?? null;
    if (dto.comment !== undefined) o.comment = dto.comment ?? null;
    await this.orderRepo.save(o);
    if (dto.items !== undefined) {
      await this.orderItemRepo.delete({ orderId: id });
      for (const row of dto.items) {
        await this.orderItemRepo.save(
          this.orderItemRepo.create({
            orderId: id,
            sourceRequestItemId: row.sourceRequestItemId ?? null,
            materialId: row.materialId ?? null,
            customName: row.customName ?? null,
            unit: row.unit,
            qtyPlanned: String(row.qtyPlanned),
            unitPrice: row.unitPrice != null ? String(row.unitPrice) : null,
            note: row.note ?? null,
          }),
        );
      }
    }
    await this.audit.log({
      entityType: 'supply_order',
      entityId: id,
      action: 'update',
      message: 'Замовлення оновлено',
      actorId: userId,
    });
    return this.findOne(userId, id);
  }

  async setStatus(userId: number, id: number, status: string) {
    const o = await this.orderRepo.findOne({ where: { id } });
    if (!o) throw new NotFoundException('Supply order not found');
    const prev = o.status;
    o.status = status;
    await this.orderRepo.save(o);
    await this.audit.log({
      entityType: 'supply_order',
      entityId: id,
      action: 'status_change',
      message: `Статус змінено: ${prev} → ${status}`,
      meta: { prev, next: status },
      actorId: userId,
    });
    return this.findOne(userId, id);
  }

  async createReceipt(userId: number, id: number) {
    const o = await this.orderRepo.findOne({ where: { id }, relations: ['items'] });
    if (!o) throw new NotFoundException('Supply order not found');
    const receipt = this.receiptRepo.create({
      projectId: o.projectId,
      sourceOrderId: o.id,
      supplierId: o.supplierId,
      status: 'draft',
      createdById: userId,
    });
    const savedReceipt = await this.receiptRepo.save(receipt);
    let total = 0;
    for (const item of o.items) {
      const price = item.unitPrice ? Number(item.unitPrice) : 0;
      const qty = Number(item.qtyPlanned);
      total += price * qty;
      await this.receiptItemRepo.save(
        this.receiptItemRepo.create({
          receiptId: savedReceipt.id,
          sourceOrderItemId: item.id,
          materialId: item.materialId,
          customName: item.customName,
          unit: item.unit,
          qtyReceived: item.qtyPlanned,
          unitPrice: item.unitPrice,
          note: item.note,
        }),
      );
    }
    savedReceipt.total = String(total.toFixed(2));
    await this.receiptRepo.save(savedReceipt);
    await this.audit.log({
      entityType: 'supply_order',
      entityId: id,
      action: 'create_from',
      message: `Створено прихід №${savedReceipt.id}`,
      meta: { receiptId: savedReceipt.id },
      actorId: userId,
    });
    await this.audit.log({
      entityType: 'supply_receipt',
      entityId: savedReceipt.id,
      action: 'create_from',
      message: `Створено із замовлення №${id}`,
      meta: { sourceOrderId: id },
      actorId: userId,
    });
    return { receiptId: savedReceipt.id };
  }
}
