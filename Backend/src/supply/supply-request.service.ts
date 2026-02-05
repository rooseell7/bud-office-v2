import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplyRequest } from './entities/supply-request.entity';
import { SupplyRequestItem } from './entities/supply-request-item.entity';
import { SupplyOrder } from './entities/supply-order.entity';
import { SupplyOrderItem } from './entities/supply-order-item.entity';
import { SupplyRequestTemplate } from './entities/supply-request-template.entity';
import { SupplyRequestTemplateItem } from './entities/supply-request-template-item.entity';
import { SupplyAuditService } from './audit.service';
import { SupplyPurchaseService } from './supply-purchase.service';
import { CreateSupplyRequestDto, UpdateSupplyRequestDto } from './dto/supply-request.dto';
import { SaveRequestAsTemplateDto } from './dto/supply-template.dto';
import { CreateOrdersByPlanDto } from './dto/create-orders-by-plan.dto';

export interface PurchasePlanItem {
  requestItemId: number;
  materialId: number | null;
  customName: string | null;
  unit: string;
  qty: string;
  suggestedUnitPrice: number | null;
  suggestedSupplierId: number | null;
}

export interface PurchasePlanGroup {
  key: string;
  supplierId: number | null;
  supplierName?: string;
  items: PurchasePlanItem[];
  totals: { itemsCount: number; sumSuggested: number };
}

export interface PurchasePlan {
  requestId: number;
  groups: PurchasePlanGroup[];
  totals: { groupsCount: number; itemsCount: number; sumSuggested: number };
}

@Injectable()
export class SupplyRequestService {
  constructor(
    @InjectRepository(SupplyRequest) private readonly requestRepo: Repository<SupplyRequest>,
    @InjectRepository(SupplyRequestItem) private readonly itemRepo: Repository<SupplyRequestItem>,
    @InjectRepository(SupplyOrder) private readonly orderRepo: Repository<SupplyOrder>,
    @InjectRepository(SupplyOrderItem) private readonly orderItemRepo: Repository<SupplyOrderItem>,
    @InjectRepository(SupplyRequestTemplate) private readonly templateRepo: Repository<SupplyRequestTemplate>,
    @InjectRepository(SupplyRequestTemplateItem) private readonly templateItemRepo: Repository<SupplyRequestTemplateItem>,
    private readonly audit: SupplyAuditService,
    private readonly purchaseService: SupplyPurchaseService,
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
    const linkedOrders = await this.orderRepo.find({
      where: { sourceRequestId: id },
      select: ['id', 'status'],
      order: { id: 'ASC' },
    });
    const audit = await this.audit.getByEntity('supply_request', id);
    const items = (r.items ?? []).map((i) => ({ ...i, request: undefined }));
    return { ...r, items, linkedOrders: linkedOrders.map((o) => ({ id: o.id, status: o.status })), audit };
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
        if (materialId == null && customName == null) {
          throw new BadRequestException('У кожної позиції має бути матеріал (materialId) або найменування (customName).');
        }
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
      for (const row of dto.items) {
        const customName = row.customName != null && String(row.customName).trim() !== '' ? String(row.customName).trim() : null;
        const materialId = row.materialId ?? null;
        if (materialId == null && customName == null) {
          throw new BadRequestException('У кожної позиції має бути матеріал (materialId) або найменування (customName).');
        }
      }
      await this.itemRepo.delete({ requestId: id });
      for (const row of dto.items) {
        const customName = row.customName != null && String(row.customName).trim() !== '' ? String(row.customName).trim() : null;
        const materialId = row.materialId ?? null;
        if (materialId == null && customName == null) continue;
        await this.itemRepo.save(
          this.itemRepo.create({
            requestId: id,
            materialId: materialId ?? null,
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
      message: `Статус: ${prev} → submitted`,
      meta: { from: prev, to: 'submitted' },
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
      message: `Статус: ${prev} → closed`,
      meta: { from: prev, to: 'closed' },
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
      message: `Створено замовлення із заявки №${id}`,
      meta: { orderId: savedOrder.id },
      actorId: userId,
    });
    await this.audit.log({
      entityType: 'supply_order',
      entityId: savedOrder.id,
      action: 'create_from',
      message: `Створено замовлення із заявки №${id}`,
      meta: { sourceRequestId: id },
      actorId: userId,
    });
    return { orderId: savedOrder.id };
  }

  async getPurchasePlan(userId: number, requestId: number, projectId?: number): Promise<PurchasePlan> {
    const r = await this.requestRepo.findOne({ where: { id: requestId }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply request not found');
    const items = (r.items ?? []).filter((i) => i.materialId != null || (i.customName != null && String(i.customName).trim() !== ''));
    const materialIds = items.map((i) => i.materialId).filter((id): id is number => id != null);
    const lastMap = materialIds.length > 0
      ? await this.purchaseService.getLastPurchasesBatch(materialIds, projectId ?? r.projectId)
      : {};
    const groupMap = new Map<string, PurchasePlanItem[]>();
    for (const item of items) {
      let key: string;
      let suggestedSupplierId: number | null = null;
      let suggestedUnitPrice: number | null = null;
      if (item.materialId == null) {
        key = 'UNASSIGNED';
      } else {
        const last = lastMap[item.materialId];
        if (last?.supplierId != null) {
          key = `SUPPLIER:${last.supplierId}`;
          suggestedSupplierId = last.supplierId;
          suggestedUnitPrice = last.unitPrice != null && last.unitPrice !== '' ? Number(last.unitPrice) : null;
        } else {
          key = 'UNASSIGNED';
        }
      }
      const planItem: PurchasePlanItem = {
        requestItemId: item.id,
        materialId: item.materialId,
        customName: item.customName,
        unit: item.unit,
        qty: item.qty,
        suggestedUnitPrice,
        suggestedSupplierId,
      };
      const list = groupMap.get(key) ?? [];
      list.push(planItem);
      groupMap.set(key, list);
    }
    const groups: PurchasePlanGroup[] = [];
    let totalItems = 0;
    let totalSum = 0;
    const keyOrder = Array.from(groupMap.keys()).sort((a, b) => (a === 'UNASSIGNED' ? 1 : a.localeCompare(b)));
    for (const key of keyOrder) {
      const groupItems = groupMap.get(key) ?? [];
      let sumSuggested = 0;
      for (const it of groupItems) {
        const qty = Number(it.qty) || 0;
        const price = it.suggestedUnitPrice ?? 0;
        sumSuggested += qty * price;
      }
      sumSuggested = Math.round(sumSuggested * 100) / 100;
      const supplierId = key.startsWith('SUPPLIER:') ? Number(key.replace('SUPPLIER:', '')) : null;
      groups.push({
        key,
        supplierId,
        supplierName: supplierId != null ? `Постачальник #${supplierId}` : undefined,
        items: groupItems,
        totals: { itemsCount: groupItems.length, sumSuggested },
      });
      totalItems += groupItems.length;
      totalSum += sumSuggested;
    }
    totalSum = Math.round(totalSum * 100) / 100;
    return {
      requestId: r.id,
      groups,
      totals: { groupsCount: groups.length, itemsCount: totalItems, sumSuggested: totalSum },
    };
  }

  async createOrdersByPlan(userId: number, requestId: number, dto: CreateOrdersByPlanDto) {
    const r = await this.requestRepo.findOne({ where: { id: requestId }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply request not found');
    const existingOrders = await this.orderRepo.find({ where: { sourceRequestId: requestId }, select: ['id'] });
    if (existingOrders.length > 0) {
      throw new ConflictException('Для цієї заявки вже створені замовлення. Відкрийте існуючі.');
    }
    const includeUnassigned = dto.includeUnassigned !== false;
    const plan = await this.getPurchasePlan(userId, requestId, r.projectId);
    const createdOrderIds: number[] = [];
    const groupAudit: { supplierId: number | null; itemsCount: number; sumSuggested: number }[] = [];
    for (const group of plan.groups) {
      if (group.key === 'UNASSIGNED' && !includeUnassigned) continue;
      if (group.items.length === 0) continue;
      const order = this.orderRepo.create({
        projectId: r.projectId,
        sourceRequestId: r.id,
        supplierId: group.supplierId,
        status: 'draft',
        deliveryType: 'supplier_to_object',
        deliveryDatePlanned: null,
        paymentTerms: null,
        comment: null,
        createdById: userId,
      });
      const savedOrder = await this.orderRepo.save(order);
      createdOrderIds.push(savedOrder.id);
      let sumSuggested = 0;
      for (const it of group.items) {
        const reqItem = r.items?.find((i) => i.id === it.requestItemId);
        if (!reqItem) continue;
        const unitPrice = it.suggestedUnitPrice != null ? String(it.suggestedUnitPrice) : null;
        const qty = Number(it.qty) || 0;
        if (it.suggestedUnitPrice != null) sumSuggested += qty * it.suggestedUnitPrice;
        await this.orderItemRepo.save(
          this.orderItemRepo.create({
            orderId: savedOrder.id,
            sourceRequestItemId: it.requestItemId,
            materialId: it.materialId,
            customName: it.customName,
            unit: it.unit,
            qtyPlanned: it.qty,
            unitPrice,
            note: reqItem.note,
          }),
        );
      }
      sumSuggested = Math.round(sumSuggested * 100) / 100;
      groupAudit.push({ supplierId: group.supplierId, itemsCount: group.items.length, sumSuggested });
      await this.audit.log({
        entityType: 'supply_order',
        entityId: savedOrder.id,
        action: 'create_orders_by_plan',
        message: `Створено із заявки №${requestId} (авто-розбиття)`,
        meta: { sourceRequestId: requestId },
        actorId: userId,
      });
    }
    if (createdOrderIds.length > 0) {
      await this.audit.log({
        entityType: 'supply_request',
        entityId: requestId,
        action: 'create_orders_by_plan',
        message: `Авто-розбиття: створено ${createdOrderIds.length} замовлень із заявки №${requestId}`,
        meta: { createdOrderIds, groups: groupAudit },
        actorId: userId,
      });
    }
    return { createdOrderIds };
  }

  async saveAsTemplate(userId: number, requestId: number, dto: SaveRequestAsTemplateDto) {
    const r = await this.requestRepo.findOne({ where: { id: requestId }, relations: ['items'] });
    if (!r) throw new NotFoundException('Supply request not found');
    const items = (r.items ?? []).filter((i) => i.materialId != null || (i.customName != null && String(i.customName).trim() !== ''));
    if (items.length === 0) throw new BadRequestException('У заявки немає позицій для збереження в шаблон');
    const template = this.templateRepo.create({
      name: dto.name.trim(),
      projectId: dto.projectScoped ? r.projectId : null,
      createdById: userId,
      isActive: true,
    });
    const savedTemplate = await this.templateRepo.save(template);
    for (const item of items) {
      await this.templateItemRepo.save(
        this.templateItemRepo.create({
          templateId: savedTemplate.id,
          materialId: item.materialId,
          customName: item.customName,
          unit: item.unit,
          qtyDefault: item.qty,
          note: item.note,
          priority: item.priority ?? 'normal',
        }),
      );
    }
    await this.audit.log({
      entityType: 'supply_request',
      entityId: requestId,
      action: 'create_from',
      message: `Збережено як шаблон "${savedTemplate.name}"`,
      meta: { templateId: savedTemplate.id },
      actorId: userId,
    });
    await this.audit.log({
      entityType: 'supply_request_template',
      entityId: savedTemplate.id,
      action: 'create',
      message: `Шаблон створено з заявки №${requestId}`,
      meta: { sourceRequestId: requestId },
      actorId: userId,
    });
    return { templateId: savedTemplate.id };
  }
}
