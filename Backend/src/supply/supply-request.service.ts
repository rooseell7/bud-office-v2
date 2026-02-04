import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplyRequest } from './entities/supply-request.entity';
import { SupplyRequestItem } from './entities/supply-request-item.entity';
import { SupplyOrder } from './entities/supply-order.entity';
import { SupplyOrderItem } from './entities/supply-order-item.entity';
import { SupplyAuditService } from './audit.service';
import { CreateSupplyRequestDto, UpdateSupplyRequestDto } from './dto/supply-request.dto';

@Injectable()
export class SupplyRequestService {
  constructor(
    @InjectRepository(SupplyRequest) private readonly requestRepo: Repository<SupplyRequest>,
    @InjectRepository(SupplyRequestItem) private readonly itemRepo: Repository<SupplyRequestItem>,
    @InjectRepository(SupplyOrder) private readonly orderRepo: Repository<SupplyOrder>,
    @InjectRepository(SupplyOrderItem) private readonly orderItemRepo: Repository<SupplyOrderItem>,
    private readonly audit: SupplyAuditService,
  ) {}

  async findAll(userId: number, projectId?: number, status?: string) {
    const qb = this.requestRepo.createQueryBuilder('r').leftJoinAndSelect('r.items', 'items').orderBy('r.id', 'DESC');
    if (projectId != null) qb.andWhere('r.projectId = :projectId', { projectId });
    if (status) qb.andWhere('r.status = :status', { status });
    return qb.getMany();
  }

  async findOne(userId: number, id: number) {
    const r = await this.requestRepo.findOne({
      where: { id },
      relations: ['items'],
      order: { items: { id: 'ASC' } },
    });
    if (!r) throw new NotFoundException('Supply request not found');
    const audit = await this.audit.getByEntity('supply_request', id);
    // Avoid circular ref (items[].request) when serializing response
    const items = (r.items ?? []).map((i) => ({ ...i, request: undefined }));
    return { ...r, items, audit };
  }

  async create(userId: number, dto: CreateSupplyRequestDto) {
    const r = this.requestRepo.create({
      projectId: dto.projectId,
      status: 'draft',
      neededAt: dto.neededAt ?? null,
      comment: dto.comment ?? null,
      createdById: userId,
    });
    const saved = await this.requestRepo.save(r);
    if (dto.items?.length) {
      for (const row of dto.items) {
        const customName = row.customName != null && String(row.customName).trim() !== '' ? String(row.customName).trim() : null;
        const materialId = row.materialId ?? null;
        if (materialId == null && customName == null) continue;
        await this.itemRepo.save(
          this.itemRepo.create({
            requestId: saved.id,
            materialId,
            customName: customName ?? null,
            unit: row.unit,
            qty: String(row.qty),
            note: row.note ?? null,
            priority: row.priority ?? 'normal',
          }),
        );
      }
    }
    await this.audit.log({
      entityType: 'supply_request',
      entityId: saved.id,
      action: 'create',
      message: 'Заявку створено',
      meta: { projectId: saved.projectId },
      actorId: userId,
    });
    return this.findOne(userId, saved.id);
  }

  async update(userId: number, id: number, dto: UpdateSupplyRequestDto) {
    const r = await this.requestRepo.findOne({ where: { id }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply request not found');
    if (r.status !== 'draft') throw new BadRequestException('Можна редагувати лише чернетку');
    if (dto.neededAt !== undefined) r.neededAt = dto.neededAt ?? null;
    if (dto.comment !== undefined) r.comment = dto.comment ?? null;
    await this.requestRepo.save(r);
    if (dto.items !== undefined) {
      await this.itemRepo.delete({ requestId: id });
      for (const row of dto.items) {
        await this.itemRepo.save(
          this.itemRepo.create({
            requestId: id,
            materialId: row.materialId ?? null,
            customName: row.customName ?? null,
            unit: row.unit,
            qty: String(row.qty),
            note: row.note ?? null,
            priority: row.priority ?? 'normal',
          }),
        );
      }
    }
    await this.audit.log({
      entityType: 'supply_request',
      entityId: id,
      action: 'update',
      message: 'Заявку оновлено',
      actorId: userId,
    });
    return this.findOne(userId, id);
  }

  async submit(userId: number, id: number) {
    const r = await this.requestRepo.findOne({ where: { id }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply request not found');
    if (r.status !== 'draft') throw new BadRequestException('Статус не draft');
    const prev = r.status;
    r.status = 'submitted';
    await this.requestRepo.save(r);
    await this.audit.log({
      entityType: 'supply_request',
      entityId: id,
      action: 'status_change',
      message: `Статус змінено: ${prev} → submitted`,
      meta: { prev, next: 'submitted' },
      actorId: userId,
    });
    return this.findOne(userId, id);
  }

  async close(userId: number, id: number) {
    const r = await this.requestRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Supply request not found');
    const prev = r.status;
    r.status = 'closed';
    await this.requestRepo.save(r);
    await this.audit.log({
      entityType: 'supply_request',
      entityId: id,
      action: 'status_change',
      message: `Статус змінено: ${prev} → closed`,
      meta: { prev, next: 'closed' },
      actorId: userId,
    });
    return this.findOne(userId, id);
  }

  async createOrder(userId: number, id: number) {
    const r = await this.requestRepo.findOne({ where: { id }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply request not found');
    if (r.status !== 'submitted') throw new BadRequestException('Заявка має бути submitted');
    const requestItems = Array.isArray(r.items) ? r.items : [];
    const order = this.orderRepo.create({
      projectId: r.projectId,
      sourceRequestId: r.id,
      supplierId: null,
      status: 'draft',
      deliveryType: 'supplier_to_object',
      createdById: userId,
    });
    const savedOrder = await this.orderRepo.save(order);
    for (const item of requestItems) {
      await this.orderItemRepo.save(
        this.orderItemRepo.create({
          orderId: savedOrder.id,
          sourceRequestItemId: item.id,
          materialId: item.materialId,
          customName: item.customName,
          unit: item.unit,
          qtyPlanned: item.qty,
          unitPrice: null,
          note: item.note,
        }),
      );
    }
    await this.audit.log({
      entityType: 'supply_request',
      entityId: id,
      action: 'create_from',
      message: `Створено замовлення №${savedOrder.id}`,
      meta: { orderId: savedOrder.id },
      actorId: userId,
    });
    await this.audit.log({
      entityType: 'supply_order',
      entityId: savedOrder.id,
      action: 'create_from',
      message: `Створено із заявки №${id}`,
      meta: { sourceRequestId: id },
      actorId: userId,
    });
    return { orderId: savedOrder.id };
  }
}
