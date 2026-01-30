import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Warehouse } from './warehouse.entity';

// беремо з твого модуля warehouse/entities
import { WarehouseBalance } from '../warehouse/entities/warehouse-balance.entity';
import { WarehouseMovement } from '../warehouse/entities/warehouse-movement.entity';
import { WarehouseMovementItem } from '../warehouse/entities/warehouse-movement-item.entity';
import { CreateWarehouseMovementDto } from './dto/create-warehouse-movement.dto';

type MovementsFilter = {
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
};

function parseISODateStart(iso: string): Date | null {
  if (typeof iso !== 'string') return null;
  const s = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000`);
  return Number.isFinite(d.getTime()) ? d : null;
}

function parseISODateEnd(iso: string): Date | null {
  if (typeof iso !== 'string') return null;
  const s = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T23:59:59.999`);
  return Number.isFinite(d.getTime()) ? d : null;
}

@Injectable()
export class WarehousesService implements OnModuleInit {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(Warehouse)
    private readonly repo: Repository<Warehouse>,

    @InjectRepository(WarehouseBalance)
    private readonly balanceRepo: Repository<WarehouseBalance>,

    @InjectRepository(WarehouseMovement)
    private readonly movementRepo: Repository<WarehouseMovement>,

    @InjectRepository(WarehouseMovementItem)
    private readonly movementItemRepo: Repository<WarehouseMovementItem>,
  ) {}

  async onModuleInit() {
    // idempotent seed
    const required = ['Склад Красів', 'Склад Офіс'];

    for (const name of required) {
      const exists = await this.repo.findOne({ where: { name } });
      if (!exists) {
        await this.repo.save(this.repo.create({ name, isActive: true }));
      }
    }
  }

  findAll() {
    return this.repo.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
  }

  async getWarehouse(id: number) {
    // для фронту (header). Беремо тільки активні (як і findAll)
    return this.ensureWarehouseExists(id);
  }

  async create(name: string) {
    const n = (name ?? '').trim();
    if (!n) throw new BadRequestException('Назва складу є обовʼязковою.');

    return this.repo.save(
      this.repo.create({
        name: n,
        isActive: true,
      }),
    );
  }

  async deactivate(id: number) {
    const wh = await this.repo.findOne({ where: { id } });
    if (!wh) return null;
    wh.isActive = false;
    return this.repo.save(wh);
  }

  private async ensureWarehouseExists(id: number) {
    const wh = await this.repo.findOne({ where: { id, isActive: true } });
    if (!wh) throw new NotFoundException(`Warehouse ${id} not found`);
    return wh;
  }

  // =========================
  // helpers (movements create)
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

  private normalizeCreateItems(items: any[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('items має бути непорожнім масивом');
    }

    return items
      .map((it, idx) => {
        const materialId = this.toPosInt(it?.materialId, `items[${idx}].materialId`);
        const qty = this.toNum(it?.qty, `items[${idx}].qty`);
        const priceRaw = it?.price;
        const price = priceRaw == null || priceRaw === '' ? 0 : this.toNum(priceRaw, `items[${idx}].price`);

        if (qty <= 0) throw new BadRequestException(`items[${idx}].qty має бути > 0`);
        if (price < 0) throw new BadRequestException(`items[${idx}].price має бути >= 0`);

        return { materialId, qty, price };
      })
      // merge duplicates by materialId
      .reduce((acc: Array<{ materialId: number; qty: number; price: number }>, it) => {
        const found = acc.find((x) => x.materialId === it.materialId);
        if (!found) {
          acc.push({ ...it });
        } else {
          // qty sums, price keeps latest non-zero
          found.qty += it.qty;
          if (it.price !== 0) found.price = it.price;
        }
        return acc;
      }, []);
  }

  private async upsertBalance(
    qr: any,
    warehouseId: number,
    materialId: number,
    deltaQty: number,
  ) {
    // Lock row to avoid race conditions
    let balance = await qr.manager.findOne(WarehouseBalance, {
      where: { warehouseId, materialId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!balance) {
      balance = qr.manager.create(WarehouseBalance, {
        warehouseId,
        materialId,
        qty: '0',
      });
    }

    const current = Number(balance.qty) || 0;
    const next = current + deltaQty;
    if (next < 0) {
      throw new BadRequestException(
        `Недостатньо залишку на складі (materialId=${materialId}): ${current} < ${Math.abs(deltaQty)}`,
      );
    }

    balance.qty = next.toString();
    await qr.manager.save(WarehouseBalance, balance);
  }

  /**
   * GET /warehouses/:id/balances
   * Повертаємо entity-рядки (фронт потім відмалює/мапне).
   *
   * ВАЖЛИВО:
   * - у WarehouseBalance має бути relation `warehouse`
   * - і має бути relation `material` (або прибрати material з relations)
   */
  async getWarehouseBalances(warehouseId: number) {
    await this.ensureWarehouseExists(warehouseId);

    const rows = await this.balanceRepo.find({
      where: { warehouse: { id: warehouseId } } as any,
      relations: { material: true, warehouse: true } as any,
      order: { id: 'ASC' } as any,
    });

    // ✅ Повертаємо shape, який очікує фронт у /pages/warehouse/WarehouseDetailsPage.tsx
    return rows.map((r) => {
      const m: any = (r as any).material;
      return {
        id: (r as any).id,
        materialId: m?.id ?? null,
        materialName: m?.name ?? '',
        unit: m?.unit ?? '',
        qty: String((r as any).qty ?? '0'),
        minQty: null,
      };
    });
  }

  /**
   * POST /warehouses/:id/movements
   * Створення операції складу з оновленням залишків.
   *
   * Мапінг:
   * - IN:     toWarehouseId = :id
   * - OUT:    fromWarehouseId = :id
   * - TRANSFER: fromWarehouseId = :id, toWarehouseId = dto.toWarehouseId
   */
  async createWarehouseMovement(userId: number, warehouseId: number, dto: CreateWarehouseMovementDto) {
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestException('Некоректний userId');
    }

    await this.ensureWarehouseExists(warehouseId);

    const type = String((dto as any)?.type || '').toUpperCase() as any;
    if (type !== 'IN' && type !== 'OUT' && type !== 'TRANSFER') {
      throw new BadRequestException('type має бути IN | OUT | TRANSFER');
    }

    const items = this.normalizeCreateItems((dto as any)?.items);

    const fromWarehouseId = type === 'IN' ? null : warehouseId;
    const toWarehouseId = type === 'OUT'
      ? null
      : type === 'IN'
        ? warehouseId
        : this.toPosInt((dto as any)?.toWarehouseId, 'toWarehouseId');

    if (type === 'TRANSFER' && toWarehouseId === warehouseId) {
      throw new BadRequestException('TRANSFER можливий лише між різними складами');
    }

    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const movement = qr.manager.create(WarehouseMovement, {
        type,
        fromWarehouseId,
        toWarehouseId,
        objectId: null,
        userId,
      } as any);

      const savedMovement = await qr.manager.save(WarehouseMovement, movement);

      for (const it of items) {
        const amount = it.qty * it.price;

        if (type === 'IN') {
          await this.upsertBalance(qr, warehouseId, it.materialId, +it.qty);
        } else if (type === 'OUT') {
          await this.upsertBalance(qr, warehouseId, it.materialId, -it.qty);
        } else {
          // TRANSFER: - з from + на to
          await this.upsertBalance(qr, warehouseId, it.materialId, -it.qty);
          await this.upsertBalance(qr, toWarehouseId!, it.materialId, +it.qty);
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

      // Повертаємо shape, який очікує фронт у warehouse.movements.ts
      const details = await this.getWarehouseMovementById(warehouseId, savedMovement.id);
      return {
        warehouseId,
        ...details,
      };
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  /**
   * GET /warehouses/:id/movements
   *
   * FIX:
   * - у WarehouseMovement НЕМАЄ `material` (це було джерелом 500)
   * - у WarehouseMovement user relation називається `user`, не `createdBy`
   * - позиції лежать у warehouse_movement_items і пов’язані через OneToMany `items`
   *
   * Повертаємо рухи + агрегати:
   * - itemsCount (кількість позицій)
   * - totalQty (сума qty)
   */
  async getWarehouseMovements(warehouseId: number, filter?: MovementsFilter) {
    await this.ensureWarehouseExists(warehouseId);

    const from = filter?.dateFrom ? parseISODateStart(filter.dateFrom) : null;
    const to = filter?.dateTo ? parseISODateEnd(filter.dateTo) : null;

    // 1) Тягнемо рухи без items (без GROUP BY)
    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'user')
      .leftJoinAndSelect('m.object', 'object')
      .leftJoinAndSelect('m.fromWarehouse', 'fromWarehouse')
      .leftJoinAndSelect('m.toWarehouse', 'toWarehouse')
      .where('(m.fromWarehouseId = :wid OR m.toWarehouseId = :wid)', {
        wid: warehouseId,
      });

    if (from) qb.andWhere('m.createdAt >= :from', { from });
    if (to) qb.andWhere('m.createdAt <= :to', { to });

    const movements = await qb.orderBy('m.id', 'DESC').take(200).getMany();

    if (!movements.length) return [];

    // 2) Агрегати по items окремо: itemsCount + totalQty
    const ids = movements.map((m) => m.id);

    const rows = await this.movementItemRepo
      .createQueryBuilder('mi')
      .select('mi.movementId', 'movementId')
      .addSelect('COUNT(mi.id)', 'itemsCount')
      // qty у тебе numeric -> в entity як string, тому сумуємо як numeric
      .addSelect('COALESCE(SUM(mi.qty::numeric), 0)', 'totalQty')
      .where('mi.movementId IN (:...ids)', { ids })
      .groupBy('mi.movementId')
      .getRawMany<{ movementId: string; itemsCount: string; totalQty: string }>();

    const aggById = new Map<number, { itemsCount: number; totalQty: number }>();
    for (const r of rows) {
      const mid = Number(r.movementId);
      aggById.set(mid, {
        itemsCount: Number(r.itemsCount) || 0,
        totalQty: Number(r.totalQty) || 0,
      });
    }

    // 3) Розширюємо об’єкти (фронт зможе показати "Позицій" та "Разом к-сть")
    return movements.map((m) => {
      const a = aggById.get(m.id) ?? { itemsCount: 0, totalQty: 0 };
      return {
        ...m,
        itemsCount: a.itemsCount,
        totalQty: a.totalQty,
      };
    });
  }

  /**
   * GET /warehouses/:warehouseId/movements/:movementId
   * Деталі руху + items[] з material.
   */
  async getWarehouseMovementById(warehouseId: number, movementId: number) {
    await this.ensureWarehouseExists(warehouseId);

    const m = await this.movementRepo.findOne({
      where: [
        { id: movementId, fromWarehouseId: warehouseId } as any,
        { id: movementId, toWarehouseId: warehouseId } as any,
      ],
      relations: {
        user: true,
        object: true,
        fromWarehouse: true,
        toWarehouse: true,
        items: { material: true } as any,
      } as any,
    });

    if (!m) throw new NotFoundException(`Movement ${movementId} not found`);
    return m;
  }
}