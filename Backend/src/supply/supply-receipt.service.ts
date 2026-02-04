import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplyReceipt } from './entities/supply-receipt.entity';
import { SupplyReceiptItem } from './entities/supply-receipt-item.entity';
import { Payable } from './entities/payable.entity';
import { SupplyAuditService } from './audit.service';
import { AttachmentsService } from '../attachments/attachments.service';
import { UpdateSupplyReceiptDto } from './dto/supply-receipt.dto';

@Injectable()
export class SupplyReceiptService {
  constructor(
    @InjectRepository(SupplyReceipt) private readonly receiptRepo: Repository<SupplyReceipt>,
    @InjectRepository(SupplyReceiptItem) private readonly itemRepo: Repository<SupplyReceiptItem>,
    @InjectRepository(Payable) private readonly payableRepo: Repository<Payable>,
    private readonly audit: SupplyAuditService,
    private readonly attachmentsService: AttachmentsService,
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
    return { ...r, attachments, payable: payable ? { id: payable.id, status: payable.status, amount: payable.amount, paidAmount: payable.paidAmount } : null, audit };
  }

  async update(userId: number, id: number, dto: UpdateSupplyReceiptDto) {
    const r = await this.receiptRepo.findOne({ where: { id }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply receipt not found');
    if (r.status !== 'draft') throw new BadRequestException('Можна редагувати лише чернетку');
    if (dto.docNumber !== undefined) r.docNumber = dto.docNumber ?? null;
    if (dto.comment !== undefined) r.comment = dto.comment ?? null;
    if (dto.items !== undefined) {
      await this.itemRepo.delete({ receiptId: id });
      let total = 0;
      for (const row of dto.items) {
        const price = row.unitPrice ?? 0;
        total += price * row.qtyReceived;
        await this.itemRepo.save(
          this.itemRepo.create({
            receiptId: id,
            sourceOrderItemId: null,
            materialId: row.materialId ?? null,
            customName: row.customName ?? null,
            unit: row.unit,
            qtyReceived: String(row.qtyReceived),
            unitPrice: row.unitPrice != null ? String(row.unitPrice) : null,
            note: row.note ?? null,
          }),
        );
      }
      r.total = String(total.toFixed(2));
    }
    await this.receiptRepo.save(r);
    await this.audit.log({
      entityType: 'supply_receipt',
      entityId: id,
      action: 'update',
      message: 'Прихід оновлено',
      actorId: userId,
    });
    return this.findOne(userId, id);
  }

  async receive(userId: number, id: number) {
    const r = await this.receiptRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Supply receipt not found');
    if (r.status !== 'draft') throw new BadRequestException('Статус не draft');
    const attachments = await this.attachmentsService.findAll({ entityType: 'supply_receipt', entityId: id });
    if (!attachments?.length) throw new BadRequestException('Потрібно хоча б одне фото (attachment)');
    r.status = 'received';
    r.receivedAt = new Date();
    r.receivedById = userId;
    await this.receiptRepo.save(r);
    await this.audit.log({
      entityType: 'supply_receipt',
      entityId: id,
      action: 'status_change',
      message: 'Підтверджено приймання',
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
