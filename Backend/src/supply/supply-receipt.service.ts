import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplyReceipt } from './entities/supply-receipt.entity';
import { SupplyReceiptItem } from './entities/supply-receipt-item.entity';
import { SupplyOrderItem } from './entities/supply-order-item.entity';
import { Payable } from './entities/payable.entity';
import { Material } from './material.entity';
import { SupplyAuditService } from './audit.service';
import { SupplyPurchaseService } from './supply-purchase.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { SupplyOrderService } from './supply-order.service';
import { UpdateSupplyReceiptDto } from './dto/supply-receipt.dto';
import { SetSubstitutionDto } from './dto/set-substitution.dto';

const SUBSTITUTION_ALLOWED_STATUSES = ['draft', 'received'];

@Injectable()
export class SupplyReceiptService {
  constructor(
    @InjectRepository(SupplyReceipt) private readonly receiptRepo: Repository<SupplyReceipt>,
    @InjectRepository(SupplyReceiptItem) private readonly itemRepo: Repository<SupplyReceiptItem>,
    @InjectRepository(SupplyOrderItem) private readonly orderItemRepo: Repository<SupplyOrderItem>,
    @InjectRepository(Payable) private readonly payableRepo: Repository<Payable>,
    @InjectRepository(Material) private readonly materialRepo: Repository<Material>,
    private readonly audit: SupplyAuditService,
    private readonly purchaseService: SupplyPurchaseService,
    private readonly attachmentsService: AttachmentsService,
    private readonly orderService: SupplyOrderService,
  ) {}

  async findAll(userId: number, projectId?: number, status?: string, supplierId?: number) {
    const qb = this.receiptRepo.createQueryBuilder('r').leftJoinAndSelect('r.items', 'items').orderBy('r.id', 'DESC');
    if (projectId != null) qb.andWhere('r.projectId = :projectId', { projectId });
    if (status) qb.andWhere('r.status = :status', { status });
    if (supplierId != null) qb.andWhere('r.supplierId = :supplierId', { supplierId });
    return qb.getMany();
  }

  async findOne(userId: number, id: number) {
    const r = await this.receiptRepo.findOne({
      where: { id },
      relations: ['items'],
      order: { items: { id: 'ASC' } },
    });
    if (!r) throw new NotFoundException('Supply receipt not found');
    const attachments = await this.attachmentsService.findAll({ entityType: 'supply_receipt', entityId: id });
    const payable = await this.payableRepo.findOne({ where: { sourceReceiptId: id } }).catch(() => null);
    const audit = await this.audit.getByEntity('supply_receipt', id);
    const sourceOrder = { id: r.sourceOrderId };
    const linkedPayable = payable ? { id: payable.id, status: payable.status } : null;
    return { ...r, attachments, sourceOrder, linkedPayable, payable: payable ? { id: payable.id, status: payable.status, amount: payable.amount, paidAmount: payable.paidAmount } : null, audit };
  }

  async update(userId: number, id: number, dto: UpdateSupplyReceiptDto) {
    const r = await this.receiptRepo.findOne({ where: { id }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply receipt not found');
    if (r.status !== 'draft') throw new BadRequestException('Можна редагувати лише чернетку');
    if (dto.docNumber !== undefined) r.docNumber = dto.docNumber ?? null;
    if (dto.comment !== undefined) r.comment = dto.comment ?? null;
    if (dto.items !== undefined) {
      for (const row of dto.items) {
        const hasMaterial = row.materialId != null;
        const hasName = row.customName != null && String(row.customName).trim() !== '';
        if (!hasMaterial && !hasName) {
          throw new BadRequestException('У кожної позиції має бути матеріал (materialId) або найменування (customName).');
        }
      }
      await this.itemRepo.delete({ receiptId: id });
      let total = 0;
      for (const row of dto.items) {
        const price = row.unitPrice != null ? Number(row.unitPrice) : 0;
        const qty = Number(row.qtyReceived) >= 0 ? Number(row.qtyReceived) : 0;
        total += price * qty;
        await this.itemRepo.save(
          this.itemRepo.create({
            receiptId: id,
            sourceOrderItemId: row.sourceOrderItemId ?? null,
            materialId: row.materialId ?? null,
            customName: row.customName ?? null,
            unit: row.unit,
            qtyReceived: String(Math.max(0, Number(row.qtyReceived))),
            unitPrice: row.unitPrice != null ? String(Math.max(0, Number(row.unitPrice))) : null,
            note: row.note ?? null,
          }),
        );
      }
      r.total = String(total.toFixed(2));
    }
    await this.receiptRepo.save(r);
    await this.orderService.recalculateOrderStatusFromReceipts(r.sourceOrderId, userId);
    await this.audit.log({
      entityType: 'supply_receipt',
      entityId: id,
      action: 'update',
      message: 'Оновлено позиції (к-сть/ціна)',
      actorId: userId,
    });
    return this.findOne(userId, id);
  }

  async receive(userId: number, id: number) {
    const r = await this.receiptRepo.findOne({ where: { id }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply receipt not found');
    if (r.status !== 'draft') throw new BadRequestException('Статус не draft');
    const attachments = await this.attachmentsService.findAll({ entityType: 'supply_receipt', entityId: id });
    if (!attachments?.length) throw new BadRequestException('Додайте фото накладної перед підтвердженням приймання.');
    let total = 0;
    for (const item of r.items ?? []) {
      const price = item.unitPrice != null ? Number(item.unitPrice) : 0;
      total += price * Number(item.qtyReceived || 0);
    }
    r.total = String(total.toFixed(2));
    r.status = 'received';
    r.receivedAt = new Date();
    r.receivedById = userId;
    await this.receiptRepo.save(r);
    await this.orderService.recalculateOrderStatusFromReceipts(r.sourceOrderId, userId);
    await this.audit.log({
      entityType: 'supply_receipt',
      entityId: id,
      action: 'status_change',
      message: 'Статус: draft → received (підтверджено приймання)',
      meta: { prev: 'draft', next: 'received' },
      actorId: userId,
    });
    return this.findOne(userId, id);
  }

  async verify(userId: number, id: number) {
    const r = await this.receiptRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Supply receipt not found');
    if (r.status !== 'received') throw new BadRequestException('Спочатку підтвердіть приймання');
    const prev = r.status;
    r.status = 'verified';
    await this.receiptRepo.save(r);
    await this.orderService.recalculateOrderStatusFromReceipts(r.sourceOrderId, userId);
    await this.audit.log({
      entityType: 'supply_receipt',
      entityId: id,
      action: 'status_change',
      message: `Статус: ${prev} → verified`,
      meta: { prev, next: 'verified' },
      actorId: userId,
    });
    return this.findOne(userId, id);
  }

  async refillFromRemaining(userId: number, id: number) {
    const r = await this.receiptRepo.findOne({ where: { id }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply receipt not found');
    if (r.status !== 'draft') throw new BadRequestException('Можна оновлювати лише чернетку приходу');
    const remainingByOrderItem = await this.orderService.getRemainingByOrderItem(r.sourceOrderId);
    let total = 0;
    for (const item of r.items ?? []) {
      const remaining = item.sourceOrderItemId != null ? (remainingByOrderItem[item.sourceOrderItemId] ?? 0) : 0;
      const qty = Math.round(remaining * 10000) / 10000;
      item.qtyReceived = String(qty);
      await this.itemRepo.save(item);
      const price = item.unitPrice != null ? Number(item.unitPrice) : 0;
      total += price * qty;
    }
    r.total = String(total.toFixed(2));
    await this.receiptRepo.save(r);
    await this.audit.log({
      entityType: 'supply_receipt',
      entityId: id,
      action: 'refill_from_remaining',
      message: 'Кількості оновлено по залишку з замовлення',
      meta: {},
      actorId: userId,
    });
    return this.findOne(userId, id);
  }

  async setSubstitution(userId: number, receiptId: number, itemId: number, dto: SetSubstitutionDto) {
    const r = await this.receiptRepo.findOne({ where: { id: receiptId }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply receipt not found');
    if (!SUBSTITUTION_ALLOWED_STATUSES.includes(r.status)) {
      throw new BadRequestException('Зміну заміни дозволено лише для приходу в статусі чернетка або отримано.');
    }
    const item = r.items?.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Receipt item not found');
    if (item.receiptId !== receiptId) throw new BadRequestException('Item does not belong to this receipt');

    if (!dto.isSubstitution) {
      return this.clearSubstitution(userId, receiptId, itemId);
    }

    const hasSubstitute = (dto.substituteMaterialId != null) || (dto.substituteCustomName != null && String(dto.substituteCustomName).trim() !== '');
    if (!hasSubstitute) throw new BadRequestException('Вкажіть матеріал або найменування заміни (substituteMaterialId або substituteCustomName).');

    let orderItem: SupplyOrderItem | null = null;
    if (item.sourceOrderItemId) {
      orderItem = await this.orderItemRepo.findOne({ where: { id: item.sourceOrderItemId } });
      if (!orderItem) throw new BadRequestException('Order item not found');
      if (orderItem.materialId != null) {
        item.originalMaterialId = orderItem.materialId;
        item.originalCustomName = orderItem.customName;
      } else {
        item.originalMaterialId = null;
        item.originalCustomName = orderItem.customName;
      }
    } else {
      item.originalMaterialId = item.materialId;
      item.originalCustomName = item.customName;
    }

    const orderUnit = orderItem ? orderItem.unit : item.unit;
    if (dto.substituteMaterialId != null) {
      const mat = await this.materialRepo.findOne({ where: { id: dto.substituteMaterialId } });
      if (!mat) throw new NotFoundException('Material not found');
      if (mat.unit != null && orderUnit != null && mat.unit !== orderUnit) {
        throw new BadRequestException(`Одиниця виміру матеріалу (${mat.unit}) не збігається з позицією замовлення (${orderUnit}). Заміна з іншою одиницею заборонена.`);
      }
      item.substituteMaterialId = dto.substituteMaterialId;
      item.substituteCustomName = null;
      item.materialId = dto.substituteMaterialId;
      item.customName = mat.name;
    } else {
      item.substituteMaterialId = null;
      item.substituteCustomName = dto.substituteCustomName?.trim() || null;
      item.materialId = null;
      item.customName = item.substituteCustomName;
    }
    item.isSubstitution = true;
    item.substitutionReason = dto.substitutionReason?.trim() || null;
    await this.itemRepo.save(item);

    const originalName = item.originalCustomName || (item.originalMaterialId ? `Матеріал #${item.originalMaterialId}` : '—');
    const substituteName = item.substituteCustomName || (item.substituteMaterialId ? `Матеріал #${item.substituteMaterialId}` : '—');
    await this.audit.log({
      entityType: 'supply_receipt',
      entityId: receiptId,
      action: 'substitution',
      message: `Заміна: ${originalName} → ${substituteName} (qty ${item.qtyReceived})`,
      meta: {
        receiptItemId: itemId,
        sourceOrderItemId: item.sourceOrderItemId,
        originalMaterialId: item.originalMaterialId,
        originalCustomName: item.originalCustomName,
        substituteMaterialId: item.substituteMaterialId,
        substituteCustomName: item.substituteCustomName,
        reason: item.substitutionReason,
      },
      actorId: userId,
    });
    return this.findOne(userId, receiptId);
  }

  async clearSubstitution(userId: number, receiptId: number, itemId: number) {
    const r = await this.receiptRepo.findOne({ where: { id: receiptId }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply receipt not found');
    if (!SUBSTITUTION_ALLOWED_STATUSES.includes(r.status)) {
      throw new BadRequestException('Зміну заміни дозволено лише для приходу в статусі чернетка або отримано.');
    }
    const item = r.items?.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Receipt item not found');
    if (item.receiptId !== receiptId) throw new BadRequestException('Item does not belong to this receipt');

    if (item.sourceOrderItemId) {
      const orderItem = await this.orderItemRepo.findOne({ where: { id: item.sourceOrderItemId } });
      if (orderItem) {
        item.materialId = orderItem.materialId;
        item.customName = orderItem.customName;
      }
    }
    item.isSubstitution = false;
    item.originalMaterialId = null;
    item.originalCustomName = null;
    item.substituteMaterialId = null;
    item.substituteCustomName = null;
    item.substitutionReason = null;
    await this.itemRepo.save(item);

    await this.audit.log({
      entityType: 'supply_receipt',
      entityId: receiptId,
      action: 'substitution',
      message: 'Заміну знято з позиції',
      meta: { receiptItemId: itemId },
      actorId: userId,
    });
    return this.findOne(userId, receiptId);
  }

  async fillPricesFromLast(userId: number, receiptId: number) {
    const r = await this.receiptRepo.findOne({ where: { id: receiptId }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply receipt not found');
    if (r.status !== 'draft') throw new BadRequestException('Можна заповнювати ціни лише в чернетці приходу');
    const materialIds = (r.items ?? []).map((i) => i.materialId).filter((id): id is number => id != null);
    if (materialIds.length === 0) return { filledCount: 0 };
    const lastMap = await this.purchaseService.getLastPurchasesBatch(materialIds, r.projectId);
    let filledCount = 0;
    for (const item of r.items ?? []) {
      if (item.materialId == null) continue;
      const last = lastMap[item.materialId];
      if (!last) continue;
      const currentPrice = item.unitPrice != null ? Number(item.unitPrice) : 0;
      if (currentPrice > 0) continue;
      item.unitPrice = last.unitPrice;
      await this.itemRepo.save(item);
      filledCount++;
    }
    let total = 0;
    for (const item of r.items ?? []) {
      const price = item.unitPrice != null ? Number(item.unitPrice) : 0;
      total += price * Number(item.qtyReceived || 0);
    }
    r.total = String(Math.round(total * 100) / 100);
    await this.receiptRepo.save(r);
    if (filledCount > 0) {
      await this.audit.log({
        entityType: 'supply_receipt',
        entityId: receiptId,
        action: 'apply_last_prices',
        message: `Заповнено ціни з останніх покупок (${filledCount} позицій)`,
        meta: { filledCount },
        actorId: userId,
      });
    }
    const receipt = await this.findOne(userId, receiptId);
    return { receipt, filledCount };
  }

  async sendToPay(userId: number, id: number) {
    const r = await this.receiptRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Supply receipt not found');
    if (r.status !== 'verified' && r.status !== 'received') throw new BadRequestException('Прихід має бути received або verified');
    const existing = await this.payableRepo.findOne({ where: { sourceReceiptId: id } });
    if (existing) throw new BadRequestException('Payable вже створено для цього приходу');
    const amount = r.total ? Number(r.total) : 0;
    const payable = this.payableRepo.create({
      projectId: r.projectId,
      supplierId: r.supplierId,
      sourceReceiptId: r.id,
      status: 'pending',
      amount: String(amount),
      paidAmount: '0',
      createdById: userId,
    });
    const savedPayable = await this.payableRepo.save(payable);
    const prevStatus = r.status;
    r.status = 'sent_to_pay';
    await this.receiptRepo.save(r);
    await this.orderService.recalculateOrderStatusFromReceipts(r.sourceOrderId, userId);
    await this.audit.log({
      entityType: 'supply_receipt',
      entityId: id,
      action: 'status_change',
      message: `Відправлено на оплату (payable №${savedPayable.id})`,
      meta: { prev: prevStatus, next: 'sent_to_pay', payableId: savedPayable.id },
      actorId: userId,
    });
    await this.audit.log({
      entityType: 'payable',
      entityId: savedPayable.id,
      action: 'create',
      message: `Створено з приходу №${id}`,
      meta: { sourceReceiptId: id, amount },
      actorId: userId,
    });
    return this.findOne(userId, id);
  }
}
