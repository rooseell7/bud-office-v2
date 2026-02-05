import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payable } from './entities/payable.entity';
import { Payment } from './entities/payment.entity';
import { SupplyReceipt } from './entities/supply-receipt.entity';
import { SupplyAuditService } from './audit.service';
import { AddPaymentDto } from './dto/payment.dto';

@Injectable()
export class SupplyPayableService {
  constructor(
    @InjectRepository(Payable) private readonly payableRepo: Repository<Payable>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(SupplyReceipt) private readonly receiptRepo: Repository<SupplyReceipt>,
    private readonly audit: SupplyAuditService,
  ) {}

  async findAll(userId: number, projectId?: number, status?: string, supplierId?: number) {
    const qb = this.payableRepo.createQueryBuilder('p').leftJoinAndSelect('p.payments', 'payments').orderBy('p.id', 'DESC');
    if (projectId != null) qb.andWhere('p.projectId = :projectId', { projectId });
    if (status) qb.andWhere('p.status = :status', { status });
    if (supplierId != null) qb.andWhere('p.supplierId = :supplierId', { supplierId });
    const list = await qb.getMany();
    return list.map((p) => {
      const amount = Number(p.amount) || 0;
      const paidAmount = Number(p.paidAmount) || 0;
      const balance = Math.round((amount - paidAmount) * 100) / 100;
      return { ...p, balance };
    });
  }

  async findOne(userId: number, id: number) {
    const p = await this.payableRepo.findOne({
      where: { id },
      relations: ['payments'],
      order: { payments: { id: 'ASC' } },
    });
    if (!p) throw new NotFoundException('Payable not found');
    const audit = await this.audit.getByEntity('payable', id);
    const sourceReceipt = { id: p.sourceReceiptId };
    return { ...p, sourceReceipt, audit };
  }

  async addPayment(userId: number, payableId: number, dto: AddPaymentDto) {
    const p = await this.payableRepo.findOne({ where: { id: payableId } });
    if (!p) throw new NotFoundException('Payable not found');
    if (p.status === 'cancelled') throw new Error('Payable cancelled');
    const amount = Number(dto.amount);
    const payment = this.paymentRepo.create({
      payableId: p.id,
      amount: String(amount),
      paidAt: dto.paidAt,
      method: dto.method ?? 'bank',
      comment: dto.comment ?? null,
      createdById: userId,
    });
    await this.paymentRepo.save(payment);
    const paidBefore = Number(p.paidAmount);
    const paidAfter = paidBefore + amount;
    p.paidAmount = String(paidAfter.toFixed(2));
    const total = Number(p.amount);
    if (paidAfter >= total) {
      p.status = 'paid';
      const receipt = await this.receiptRepo.findOne({ where: { id: p.sourceReceiptId } });
      if (receipt) {
        receipt.status = 'paid';
        await this.receiptRepo.save(receipt);
        await this.audit.log({
          entityType: 'supply_receipt',
          entityId: receipt.id,
          action: 'status_change',
          message: 'Оплачено (payable повністю погашено)',
          meta: { prev: receipt.status, next: 'paid' },
          actorId: userId,
        });
      }
    } else {
      p.status = 'partially_paid';
    }
    await this.payableRepo.save(p);
    const method = dto.method ?? 'bank';
    await this.audit.log({
      entityType: 'payable',
      entityId: p.id,
      action: 'add_payment',
      message: `Додано оплату: ${amount} грн (${method})`,
      meta: { paymentId: payment.id, amount, paidBefore, paidAfter, newStatus: p.status },
      actorId: userId,
    });
    await this.audit.log({
      entityType: 'payment',
      entityId: payment.id,
      action: 'create',
      message: `Оплата ${amount} грн (${dto.paidAt})`,
      meta: { payableId: p.id },
      actorId: userId,
    });
    return this.findOne(userId, payableId);
  }
}
