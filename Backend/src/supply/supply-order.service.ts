import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SupplyOrder } from './entities/supply-order.entity';
import { SupplyOrderItem } from './entities/supply-order-item.entity';
import { SupplyReceipt } from './entities/supply-receipt.entity';
import { SupplyReceiptItem } from './entities/supply-receipt-item.entity';
import { SupplyAuditService } from './audit.service';
import { SupplyPurchaseService } from './supply-purchase.service';
import { CreateSupplyOrderDto, UpdateSupplyOrderDto } from './dto/supply-order.dto';
import { MoveItemsDto } from './dto/move-items.dto';
import { MergeOrdersDto } from './dto/merge-orders.dto';
import { CreateReceiptQuickDto } from './dto/create-receipt-quick.dto';

@Injectable()
export class SupplyOrderService {
  constructor(
    @InjectRepository(SupplyOrder) private readonly orderRepo: Repository<SupplyOrder>,
    @InjectRepository(SupplyOrderItem) private readonly orderItemRepo: Repository<SupplyOrderItem>,
    @InjectRepository(SupplyReceipt) private readonly receiptRepo: Repository<SupplyReceipt>,
    @InjectRepository(SupplyReceiptItem) private readonly receiptItemRepo: Repository<SupplyReceiptItem>,
    private readonly audit: SupplyAuditService,
    private readonly purchaseService: SupplyPurchaseService,
  ) {}

  private computeTotalPlan(items: { qtyPlanned: string; unitPrice: string | null }[]): number {
    return (items ?? []).reduce(
      (sum, i) => sum + Number(i.qtyPlanned || 0) * (i.unitPrice != null ? Number(i.unitPrice) : 0),
      0,
    );
  }

  /** Sum of qtyReceived per orderItem.id from receipts with status received/verified/sent_to_pay/paid. */
  async getReceivedTotalsByOrderItem(orderId: number): Promise<Record<number, number>> {
    const rows = await this.receiptItemRepo
      .createQueryBuilder('ri')
      .innerJoin('ri.receipt', 'r', 'r.id = ri.receiptId')
      .where('r.sourceOrderId = :orderId', { orderId })
      .andWhere('r.status IN (:...statuses)', { statuses: SupplyOrderService.RECEIPT_STATUSES_COUNTED })
      .andWhere('ri.sourceOrderItemId IS NOT NULL')
      .select('ri.sourceOrderItemId', 'orderItemId')
      .addSelect('SUM(CAST(ri.qtyReceived AS DECIMAL))', 'total')
      .groupBy('ri.sourceOrderItemId')
      .getRawMany();
    const map: Record<number, number> = {};
    for (const row of rows as { orderItemId: number; total: string }[]) {
      map[row.orderItemId] = Number(row.total) || 0;
    }
    return map;
  }

  /** Remaining qty per orderItem.id (max(0, qtyPlanned - received)). */
  async getRemainingByOrderItem(orderId: number): Promise<Record<number, number>> {
    const o = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['items'] });
    if (!o || !o.items?.length) return {};
    const received = await this.getReceivedTotalsByOrderItem(orderId);
    const result: Record<number, number> = {};
    for (const item of o.items) {
      const planned = Number(item.qtyPlanned) || 0;
      const rec = received[item.id] ?? 0;
      result[item.id] = Math.max(0, planned - rec);
    }
    return result;
  }

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
    return orders.map((o) => {
      const totalPlan = this.computeTotalPlan(o.items ?? []);
      return { ...o, receiptsCount: map[o.id] ?? 0, totalPlan: Math.round(totalPlan * 100) / 100 };
    });
  }

  /** Receipt statuses that count toward "received" totals (MVP: from received and above). */
  private static readonly RECEIPT_STATUSES_COUNTED = ['received', 'verified', 'sent_to_pay', 'paid'];

  async findOne(userId: number, id: number) {
    const o = await this.orderRepo.findOne({
      where: { id },
      relations: ['items'],
      order: { items: { id: 'ASC' } },
    });
    if (!o) throw new NotFoundException('Supply order not found');
    const receipts = await this.receiptRepo.find({
      where: { sourceOrderId: id },
      select: ['id', 'status', 'total', 'receivedAt'],
      order: { id: 'ASC' },
    });
    const receivedByOrderItem = await this.getReceivedTotalsByOrderItem(id);
    const audit = await this.audit.getByEntity('supply_order', id);
    const items = (o.items ?? []).map((i) => {
      const receivedTotal = receivedByOrderItem[i.id] ?? 0;
      const planned = Number(i.qtyPlanned) || 0;
      const remaining = Math.max(planned - receivedTotal, 0);
      return {
        ...i,
        order: undefined,
        receivedQtyTotal: Math.round(receivedTotal * 10000) / 10000,
        remainingQty: Math.round(remaining * 10000) / 10000,
      };
    });
    const totalPlan = this.computeTotalPlan(o.items ?? []);
    const sourceRequest = o.sourceRequestId ? { id: o.sourceRequestId } : null;
    const linkedReceipts = receipts.map((r) => ({
      id: r.id,
      status: r.status,
      total: r.total,
      receivedAt: r.receivedAt,
    }));
    return { ...o, items, totalPlan: Math.round(totalPlan * 100) / 100, sourceRequest, linkedReceipts, audit };
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
        const hasMaterial = row.materialId != null;
        const hasName = row.customName != null && String(row.customName).trim() !== '';
        if (!hasMaterial && !hasName) {
          throw new BadRequestException('У кожної позиції має бути матеріал (materialId) або найменування (customName).');
        }
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
      for (const row of dto.items) {
        const hasMaterial = row.materialId != null;
        const hasName = row.customName != null && String(row.customName).trim() !== '';
        if (!hasMaterial && !hasName) {
          throw new BadRequestException('У кожної позиції має бути матеріал (materialId) або найменування (customName).');
        }
      }
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
      message: `Статус: ${prev} → ${status}`,
      meta: { from: prev, to: status },
      actorId: userId,
    });
    return this.findOne(userId, id);
  }

  async createReceiptQuick(userId: number, orderId: number, dto: CreateReceiptQuickDto) {
    const mode = dto.mode ?? 'remaining';
    const includeZeroLines = dto.includeZeroLines ?? false;
    if (mode !== 'remaining') throw new BadRequestException('Підтримується лише mode=remaining');
    const o = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['items'] });
    if (!o) throw new NotFoundException('Supply order not found');
    if (o.status === 'cancelled' || o.status === 'closed') {
      throw new BadRequestException('Швидкий прихід заборонено для скасованого або закритого замовлення.');
    }
    const receivedByOrderItem = await this.getReceivedTotalsByOrderItem(orderId);
    const itemsWithRemaining = (o.items ?? []).map((item) => {
      const planned = Number(item.qtyPlanned) || 0;
      const received = receivedByOrderItem[item.id] ?? 0;
      const remaining = Math.max(0, planned - received);
      return { item, remaining };
    });
    const nonZero = itemsWithRemaining.filter((x) => x.remaining > 0);
    if (nonZero.length === 0) {
      throw new BadRequestException('Немає залишку до отримання.');
    }
    const receipt = this.receiptRepo.create({
      projectId: o.projectId,
      sourceOrderId: o.id,
      supplierId: o.supplierId,
      status: 'draft',
      createdById: userId,
    });
    const savedReceipt = await this.receiptRepo.save(receipt);
    let total = 0;
    let itemsCount = 0;
    let nonZeroItemsCount = 0;
    for (const { item, remaining } of itemsWithRemaining) {
      if (remaining === 0 && !includeZeroLines) continue;
      const qty = remaining;
      if (qty > 0) nonZeroItemsCount++;
      itemsCount++;
      const price = item.unitPrice != null ? Number(item.unitPrice) : 0;
      total += price * qty;
      await this.receiptItemRepo.save(
        this.receiptItemRepo.create({
          receiptId: savedReceipt.id,
          sourceOrderItemId: item.id,
          materialId: item.materialId,
          customName: item.customName,
          unit: item.unit,
          qtyReceived: String(Math.round(qty * 10000) / 10000),
          unitPrice: item.unitPrice,
          note: item.note,
        }),
      );
    }
    savedReceipt.total = String(total.toFixed(2));
    await this.receiptRepo.save(savedReceipt);
    await this.audit.log({
      entityType: 'supply_receipt',
      entityId: savedReceipt.id,
      action: 'create_receipt_quick',
      message: `Створено швидкий прихід із замовлення №${orderId} (залишок)`,
      meta: { orderId, receiptId: savedReceipt.id, mode, itemsCount, nonZeroItemsCount },
      actorId: userId,
    });
    await this.audit.log({
      entityType: 'supply_order',
      entityId: orderId,
      action: 'create_receipt_quick',
      message: `Створено швидкий прихід №${savedReceipt.id}`,
      meta: { receiptId: savedReceipt.id, mode, itemsCount, nonZeroItemsCount },
      actorId: userId,
    });
    return { receiptId: savedReceipt.id };
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
    await this.recalculateOrderStatusFromReceipts(id, userId);
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

  async fillPricesFromLast(userId: number, orderId: number) {
    const o = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['items'] });
    if (!o) throw new NotFoundException('Supply order not found');
    if (o.status !== 'draft') throw new BadRequestException('Можна заповнювати ціни лише в чернетці замовлення');
    const materialIds = (o.items ?? []).map((i) => i.materialId).filter((id): id is number => id != null);
    if (materialIds.length === 0) return { filledCount: 0 };
    const lastMap = await this.purchaseService.getLastPurchasesBatch(materialIds, o.projectId);
    let filledCount = 0;
    const supplierCounts: Record<number, number> = {};
    for (const item of o.items ?? []) {
      if (item.materialId == null) continue;
      const last = lastMap[item.materialId];
      if (!last) continue;
      const currentPrice = item.unitPrice != null ? Number(item.unitPrice) : 0;
      if (currentPrice > 0) continue;
      item.unitPrice = last.unitPrice;
      await this.orderItemRepo.save(item);
      filledCount++;
      if (last.supplierId != null) {
        supplierCounts[last.supplierId] = (supplierCounts[last.supplierId] ?? 0) + 1;
      }
    }
    const entries = Object.entries(supplierCounts);
    let suggestedSupplierId: number | undefined;
    if (entries.length > 0) {
      const max = entries.reduce((a, b) => (a[1] >= b[1] ? a : b));
      if (max[1] > 0 && max[1] >= filledCount / 2) suggestedSupplierId = Number(max[0]);
    }
    if (filledCount > 0) {
      await this.audit.log({
        entityType: 'supply_order',
        entityId: orderId,
        action: 'apply_last_prices',
        message: `Заповнено ціни з останніх покупок (${filledCount} позицій)`,
        meta: { filledCount, suggestedSupplierId: suggestedSupplierId ?? undefined },
        actorId: userId,
      });
    }
    const order = await this.findOne(userId, orderId);
    return { order, filledCount, suggestedSupplierId };
  }

  async moveItems(userId: number, fromOrderId: number, dto: MoveItemsDto) {
    const { toOrderId, itemIds, mergeDuplicates = false } = dto;
    if (fromOrderId === toOrderId) throw new BadRequestException('Замовлення відправлення та призначення однакові');
    const fromOrder = await this.orderRepo.findOne({ where: { id: fromOrderId }, relations: ['items'] });
    const toOrder = await this.orderRepo.findOne({ where: { id: toOrderId }, relations: ['items'] });
    if (!fromOrder) throw new NotFoundException('Замовлення відправлення не знайдено');
    if (!toOrder) throw new NotFoundException('Замовлення призначення не знайдено');
    if (fromOrder.projectId !== toOrder.projectId) throw new BadRequestException('Замовлення мають належати одному об\'єкту');
    const fromItems = (fromOrder.items ?? []).filter((i) => itemIds.includes(i.id));
    if (fromItems.length !== itemIds.length) throw new BadRequestException('Не всі позиції належать замовленню відправлення');
    const orderItemIds = fromItems.map((i) => i.id);
    const usedInReceipts = await this.receiptItemRepo.find({
      where: { sourceOrderItemId: In(orderItemIds) },
      select: ['sourceOrderItemId'],
    });
    if (usedInReceipts.length > 0) {
      throw new ConflictException('Позиція вже має прихід, переміщення заборонене.');
    }
    const toItems = [...(toOrder.items ?? [])];
    const movedToTargetInThisOp: SupplyOrderItem[] = [];
    let movedCount = 0;
    const merged: number[] = [];
    const findInTarget = (sourceRequestItemId: number | null) => {
      if (sourceRequestItemId == null) return null;
      const inTo = toItems.find((t) => t.sourceRequestItemId === sourceRequestItemId);
      if (inTo) return inTo;
      return movedToTargetInThisOp.find((t) => t.sourceRequestItemId === sourceRequestItemId) ?? null;
    };
    for (const item of fromItems) {
      const existingInTarget = findInTarget(item.sourceRequestItemId);
      if (existingInTarget && mergeDuplicates) {
        const existingQty = Number(existingInTarget.qtyPlanned) || 0;
        const addQty = Number(item.qtyPlanned) || 0;
        existingInTarget.qtyPlanned = String(Math.round((existingQty + addQty) * 10000) / 10000);
        const notes = [existingInTarget.note, item.note].filter(Boolean).map(String);
        existingInTarget.note = notes.length > 0 ? notes.join('; ') : null;
        await this.orderItemRepo.save(existingInTarget);
        await this.orderItemRepo.remove(item);
        merged.push(item.id);
        movedCount++;
      } else if (existingInTarget) {
        throw new ConflictException(`У замовленні призначення вже є позиція з тієї ж заявки (sourceRequestItemId ${item.sourceRequestItemId}). Увімкніть "Зливати дублікати".`);
      } else {
        item.orderId = toOrderId;
        await this.orderItemRepo.save(item);
        movedToTargetInThisOp.push(item);
        movedCount++;
      }
    }
    if (movedCount > 0) {
      await this.audit.log({
        entityType: 'supply_order',
        entityId: fromOrderId,
        action: 'move_items',
        message: `Переміщено ${movedCount} позицій у замовлення №${toOrderId}`,
        meta: { itemIds, toOrderId, fromOrderId, movedCount, merged: merged.length > 0 ? merged : undefined },
        actorId: userId,
      });
      await this.audit.log({
        entityType: 'supply_order',
        entityId: toOrderId,
        action: 'move_items',
        message: `Отримано ${movedCount} позицій із замовлення №${fromOrderId}`,
        meta: { itemIds, fromOrderId, toOrderId, movedCount },
        actorId: userId,
      });
    }
    return { movedCount, fromOrder: await this.findOne(userId, fromOrderId), toOrder: await this.findOne(userId, toOrderId) };
  }

  async mergeOrder(userId: number, sourceOrderId: number, dto: MergeOrdersDto) {
    const { targetOrderId, mergeDuplicates = true, cancelSourceOrder = true } = dto;
    if (sourceOrderId === targetOrderId) throw new BadRequestException('Замовлення джерела та цілі однакові');
    const sourceOrder = await this.orderRepo.findOne({ where: { id: sourceOrderId }, relations: ['items'] });
    const targetOrder = await this.orderRepo.findOne({ where: { id: targetOrderId }, relations: ['items'] });
    if (!sourceOrder) throw new NotFoundException('Замовлення джерела не знайдено');
    if (!targetOrder) throw new NotFoundException('Замовлення цілі не знайдено');
    if (sourceOrder.projectId !== targetOrder.projectId) throw new BadRequestException('Замовлення мають належати одному об\'єкту');
    const sourceReceipts = await this.receiptRepo.find({ where: { sourceOrderId }, select: ['id'] });
    if (sourceReceipts.length > 0) throw new ConflictException('Замовлення має приходи, злиття заборонене.');
    const sourceItemIds = (sourceOrder.items ?? []).map((i) => i.id);
    const usedInReceipts = await this.receiptItemRepo.find({
      where: { sourceOrderItemId: In(sourceItemIds) },
      select: ['sourceOrderItemId'],
    });
    if (usedInReceipts.length > 0) throw new ConflictException('Позиція вже має прихід, переміщення заборонене.');
    const result = await this.moveItems(userId, sourceOrderId, {
      toOrderId: targetOrderId,
      itemIds: sourceItemIds,
      mergeDuplicates,
    });
    if (cancelSourceOrder) {
      sourceOrder.status = 'cancelled';
      await this.orderRepo.save(sourceOrder);
      await this.audit.log({
        entityType: 'supply_order',
        entityId: sourceOrderId,
        action: 'merge',
        message: `Замовлення злито в №${targetOrderId}`,
        meta: { targetOrderId, cancelSourceOrder: true },
        actorId: userId,
      });
      await this.audit.log({
        entityType: 'supply_order',
        entityId: targetOrderId,
        action: 'merge',
        message: `Злиття: додано позиції з №${sourceOrderId}`,
        meta: { sourceOrderId },
        actorId: userId,
      });
    }
    return { movedCount: result.movedCount, sourceOrder: await this.findOne(userId, sourceOrderId), toOrder: await this.findOne(userId, targetOrderId) };
  }

  /** Auto-update order status from receipts: partially_delivered / delivered. closed only manually. Counts only received+ receipts. */
  async recalculateOrderStatusFromReceipts(orderId: number, actorId: number): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { id: orderId }, relations: ['items'] });
    if (!order || !order.items?.length) return;
    const receivedMap = await this.getReceivedTotalsByOrderItem(orderId);
    let allFulfilled = true;
    for (const oi of order.items) {
      const planned = Number(oi.qtyPlanned) || 0;
      const received = receivedMap[oi.id] ?? 0;
      if (received < planned) allFulfilled = false;
    }
    const nextStatus = allFulfilled ? 'delivered' : 'partially_delivered';
    if (order.status === 'closed' || order.status === 'cancelled') return;
    if (nextStatus === order.status) return;
    const prev = order.status;
    order.status = nextStatus;
    await this.orderRepo.save(order);
    await this.audit.log({
      entityType: 'supply_order',
      entityId: orderId,
      action: 'status_change',
      message: `Авто-статус: ${prev} → ${nextStatus} (за приходами)`,
      meta: { from: prev, to: nextStatus, reason: 'receipts_aggregate' },
      actorId,
    });
  }
}
