// FILE: bud_office-backend/src/warehouse/warehouse.service.ts

import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { WarehouseBalance } from './entities/warehouse-balance.entity';
import { WarehouseMovement } from './entities/warehouse-movement.entity';
import { WarehouseMovementItem } from './entities/warehouse-movement-item.entity';
import { WarehouseMovementDraft } from './entities/warehouse-movement-draft.entity';

import { WarehouseInDto } from './dto/warehouse-in.dto';
import { WarehouseOutDto } from './dto/warehouse-out.dto';
import { WarehouseTransferDto } from './dto/warehouse-transfer.dto';
import { WarehouseMovementsQueryDto } from './dto/warehouse-movements-query.dto';
import { SaveWarehouseMovementDraftDto } from './dto/save-warehouse-movement-draft.dto';

type MovementType = 'IN' | 'OUT' | 'TRANSFER';

@Injectable()
export class WarehouseService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(WarehouseBalance)
    private readonly balRepo: Repository<WarehouseBalance>,
    @InjectRepository(WarehouseMovement)
    private readonly movRepo: Repository<WarehouseMovement>,
    @InjectRepository(WarehouseMovementItem)
    private readonly itemRepo: Repository<WarehouseMovementItem>,
    @InjectRepository(WarehouseMovementDraft)
    private readonly draftRepo: Repository<WarehouseMovementDraft>,
  ) {}

  // =========================
  // helpers
  // =========================
  private toInt(value: unknown, field: string): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      throw new BadRequestException(`${field} має бути цілим числом`);
    }
    return n;
  }

  private toPosInt(value: unknown, field: string): number {
    const n = this.toInt(value, field);
    if (n <= 0) throw new BadRequestException(`${field} має бути > 0`);
    return n;
  }

  private toNum(value: unknown, field: string): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) throw new BadRequestException(`${field} має бути числом`);
    return n;
  }

  private normalizeItems(items: any[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('items має бути непорожнім масивом');
    }

    return items.map((it, idx) => {
      const materialId = this.toPosInt(it?.materialId, `items[${idx}].materialId`);
      const qty = this.toNum(it?.qty, `items[${idx}].qty`);
      const price = this.toNum(it?.price, `items[${idx}].price`);

      if (qty <= 0) throw new BadRequestException(`items[${idx}].qty має бути > 0`);
      if (price < 0) throw new BadRequestException(`items[${idx}].price має бути >= 0`);

      return { materialId, qty, price };
    });
  }

  private normalizeObjectId(raw: unknown): number {
    // objectId для Project = int
    const n = this.toPosInt(raw, 'objectId');
    return n;
  }

  private async upsertBalance(
    qr: any,
    warehouseId: number,
    materialId: number,
    deltaQty: number,
  ) {
    let balance = await qr.manager.findOne(WarehouseBalance, {
      where: { warehouseId, materialId },
    });

    if (!balance) {
      balance = qr.manager.create(WarehouseBalance, {
        warehouseId,
        materialId,
        qty: '0',
      });
    }

    const next = Number(balance.qty) + deltaQty;
    if (next < 0) throw new BadRequestException('Недостатньо залишку на складі');

    balance.qty = next.toString();
    await qr.manager.save(WarehouseBalance, balance);
  }

  private async createMovementAndItems(
    userId: number,
    dto: {
      type: MovementType;
      fromWarehouseId: number | null;
      toWarehouseId: number | null;
      objectId: number | null;
      items: Array<{ materialId: number; qty: number; price: number }>;
    },
  ) {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const movement = qr.manager.create(WarehouseMovement, {
        type: dto.type,
        fromWarehouseId: dto.fromWarehouseId,
        toWarehouseId: dto.toWarehouseId,
        objectId: dto.objectId,
        userId,
      });

      const savedMovement = await qr.manager.save(WarehouseMovement, movement);

      for (const it of dto.items) {
        const amount = it.qty * it.price;

        // Баланси:
        if (dto.type === 'IN') {
          // прихід: + на toWarehouse
          if (!dto.toWarehouseId) throw new BadRequestException('toWarehouseId є обовʼязковим для IN');
          await this.upsertBalance(qr, dto.toWarehouseId, it.materialId, +it.qty);
        } else if (dto.type === 'OUT') {
          // списання: - з fromWarehouse
          if (!dto.fromWarehouseId) throw new BadRequestException('fromWarehouseId є обовʼязковим для OUT');
          await this.upsertBalance(qr, dto.fromWarehouseId, it.materialId, -it.qty);
        } else {
          // transfer: - з from + на to
          if (!dto.fromWarehouseId || !dto.toWarehouseId) {
            throw new BadRequestException('fromWarehouseId і toWarehouseId є обовʼязковими для TRANSFER');
          }
          await this.upsertBalance(qr, dto.fromWarehouseId, it.materialId, -it.qty);
          await this.upsertBalance(qr, dto.toWarehouseId, it.materialId, +it.qty);
        }

        const item = qr.manager.create(WarehouseMovementItem, {
          movementId: savedMovement.id,
          materialId: it.materialId,
          qty: it.qty.toString(),
          price: it.price.toString(),
          amount: amount.toString(),
        });

        await qr.manager.save(WarehouseMovementItem, item);
      }

      await qr.commitTransaction();
      return { id: savedMovement.id };
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  // ==================================================
  // IN (Прихід)
  // ==================================================
  async in(userId: number, dto: WarehouseInDto) {
    const toWarehouseId = this.toPosInt(dto.toWarehouseId, 'toWarehouseId');
    const items = this.normalizeItems(dto.items as any[]);

    return this.createMovementAndItems(userId, {
      type: 'IN',
      fromWarehouseId: null,
      toWarehouseId,
      objectId: null,
      items,
    });
  }

  // ==================================================
  // OUT (Списання)
  // ==================================================
  async out(userId: number, dto: WarehouseOutDto) {
    const fromWarehouseId = this.toPosInt(dto.fromWarehouseId, 'fromWarehouseId');
    const objectId = this.normalizeObjectId((dto as any).objectId);
    const items = this.normalizeItems(dto.items as any[]);

    return this.createMovementAndItems(userId, {
      type: 'OUT',
      fromWarehouseId,
      toWarehouseId: null,
      objectId,
      items,
    });
  }

  // ==================================================
  // TRANSFER (Переміщення)
  // ==================================================
  async transfer(userId: number, dto: WarehouseTransferDto) {
    const fromWarehouseId = this.toPosInt(dto.fromWarehouseId, 'fromWarehouseId');
    const toWarehouseId = this.toPosInt(dto.toWarehouseId, 'toWarehouseId');

    if (fromWarehouseId === toWarehouseId) {
      throw new BadRequestException('TRANSFER можливий лише між різними складами');
    }

    const items = this.normalizeItems(dto.items as any[]);

    return this.createMovementAndItems(userId, {
      type: 'TRANSFER',
      fromWarehouseId,
      toWarehouseId,
      objectId: null,
      items,
    });
  }

  // ==================================================
  // READ API
  // ==================================================
  balance() {
    return this.balRepo.find({ relations: ['warehouse', 'material'] });
  }

  async balanceByWarehouse(warehouseId: number) {
    const wid = this.toPosInt(warehouseId, 'warehouseId');

    const rows = await this.balRepo.find({
      where: { warehouseId: wid },
      relations: ['material'],
    });

    return rows.map((r) => ({
      id: r.id,
      materialId: r.materialId,
      materialName: r.material?.name ?? '(матеріал відсутній)',
      unit: (r.material as any)?.unit ?? '',
      qty: Number(r.qty),
    }));
  }

  /**
   * Журнал операцій по складу (IN/OUT/TRANSFER) + фільтри/пагінація
   * ВАЖЛИВО: у movement немає warehouseId, тому базовий відбір:
   * (fromWarehouseId = wid OR toWarehouseId = wid)
   */
  async movementsByWarehouse(warehouseId: number, query?: WarehouseMovementsQueryDto) {
    const wid = this.toPosInt(warehouseId, 'warehouseId');
    const q = query ?? {};

    const limit = Math.min(Math.max(q.limit ?? 50, 1), 200);
    const offset = Math.max(q.offset ?? 0, 0);

    const qb = this.movRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.items', 'i')
      .leftJoinAndSelect('i.material', 'material')
      .leftJoinAndSelect('m.fromWarehouse', 'fromWarehouse')
      .leftJoinAndSelect('m.toWarehouse', 'toWarehouse')
      .leftJoinAndSelect('m.object', 'object')
      .leftJoinAndSelect('m.user', 'user')
      .where('(m.fromWarehouseId = :wid OR m.toWarehouseId = :wid)', { wid });

    if (q.type) qb.andWhere('m.type = :type', { type: q.type });

    if (q.materialId) {
      qb.andWhere('i.materialId = :materialId', { materialId: q.materialId });
    }

    if (q.objectId) {
      qb.andWhere('m.objectId = :objectId', { objectId: q.objectId });
    }

    if (q.fromWarehouseId) {
      qb.andWhere('m.fromWarehouseId = :fromWarehouseId', { fromWarehouseId: q.fromWarehouseId });
    }

    if (q.toWarehouseId) {
      qb.andWhere('m.toWarehouseId = :toWarehouseId', { toWarehouseId: q.toWarehouseId });
    }

    if (q.dateFrom) qb.andWhere('m.createdAt >= :dateFrom', { dateFrom: q.dateFrom });
    if (q.dateTo) qb.andWhere('m.createdAt <= :dateTo', { dateTo: q.dateTo });

    // q.q поки не застосовуємо — у movement немає текстових полів.
    // Якщо додаси comment/number — я дам готовий ILIKE блок.

    qb.orderBy('m.createdAt', 'DESC').skip(offset).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return { total, limit, offset, items };
  }


  // ==================================================
  // DRAFTS (server-side persist введених даних форми)
  // ==================================================

  async getMovementDraft(userId: number, warehouseId: number) {
    const wid = this.toPosInt(warehouseId, 'warehouseId');

    const row = await this.draftRepo.findOne({
      where: { userId, warehouseId: wid },
    });

    if (!row) return null;

    return {
      id: row.id,
      warehouseId: row.warehouseId,
      payload: row.payload ?? {},
      updatedAt: row.updatedAt,
    };
  }

  async saveMovementDraft(userId: number, dto: SaveWarehouseMovementDraftDto) {
    const wid = this.toPosInt(dto.warehouseId, 'warehouseId');
    const payload = dto.payload ?? {};

    const existing = await this.draftRepo.findOne({
      where: { userId, warehouseId: wid },
    });

    if (!existing) {
      const created = this.draftRepo.create({
        userId,
        warehouseId: wid,
        payload,
      });
      const saved = await this.draftRepo.save(created);
      return { id: saved.id, warehouseId: saved.warehouseId, updatedAt: saved.updatedAt };
    }

    existing.payload = payload;
    const saved = await this.draftRepo.save(existing);
    return { id: saved.id, warehouseId: saved.warehouseId, updatedAt: saved.updatedAt };
  }

  async deleteMovementDraft(userId: number, warehouseId: number) {
    const wid = this.toPosInt(warehouseId, 'warehouseId');
    await this.draftRepo.delete({ userId, warehouseId: wid });
    return { ok: true };
  }

}