import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplyReceiptItem } from './entities/supply-receipt-item.entity';
import { SupplyReceipt } from './entities/supply-receipt.entity';

export interface LastPurchaseResult {
  unitPrice: string;
  supplierId: number | null;
  receivedAt: string;
  receiptId: number;
}

export interface RecentSupplierResult {
  supplierId: number;
  supplierName: string;
  lastPrice: string;
  lastDate: string;
}

@Injectable()
export class SupplyPurchaseService {
  constructor(
    @InjectRepository(SupplyReceiptItem) private readonly receiptItemRepo: Repository<SupplyReceiptItem>,
    @InjectRepository(SupplyReceipt) private readonly receiptRepo: Repository<SupplyReceipt>,
  ) {}

  async getLastPurchase(materialId: number, projectId?: number): Promise<LastPurchaseResult | null> {
    const qb = this.receiptItemRepo
      .createQueryBuilder('ri')
      .innerJoin(SupplyReceipt, 'r', 'r.id = ri.receiptId')
      .where('ri.materialId = :materialId', { materialId })
      .andWhere('r.status NOT IN (:...statuses)', { statuses: ['draft', 'cancelled'] })
      .andWhere('r.receivedAt IS NOT NULL')
      .select('ri.unitPrice', 'unitPrice')
      .addSelect('r.supplierId', 'supplierId')
      .addSelect('r.receivedAt', 'receivedAt')
      .addSelect('r.id', 'receiptId')
      .orderBy('r.receivedAt', 'DESC')
      .limit(1);
    if (projectId != null) {
      qb.andWhere('r.projectId = :projectId', { projectId });
    }
    const row = await qb.getRawOne();
    if (!row || row.unitPrice == null) return null;
    return {
      unitPrice: String(row.unitPrice),
      supplierId: row.supplierId != null ? Number(row.supplierId) : null,
      receivedAt: row.receivedAt instanceof Date ? row.receivedAt.toISOString() : String(row.receivedAt),
      receiptId: Number(row.receiptId),
    };
  }

  async getRecentSuppliers(
    materialId: number,
    limit = 3,
    projectId?: number,
  ): Promise<RecentSupplierResult[]> {
    const qb = this.receiptItemRepo
      .createQueryBuilder('ri')
      .innerJoin(SupplyReceipt, 'r', 'r.id = ri.receiptId')
      .where('ri.materialId = :materialId', { materialId })
      .andWhere('r.status NOT IN (:...statuses)', { statuses: ['draft', 'cancelled'] })
      .andWhere('r.receivedAt IS NOT NULL')
      .andWhere('r.supplierId IS NOT NULL')
      .select('r.supplierId', 'supplierId')
      .addSelect('ri.unitPrice', 'lastPrice')
      .addSelect('r.receivedAt', 'lastDate')
      .orderBy('r.receivedAt', 'DESC');
    if (projectId != null) {
      qb.andWhere('r.projectId = :projectId', { projectId });
    }
    const rows = await qb.getRawMany();
    const bySupplier = new Map<number, { lastPrice: string; lastDate: string }>();
    for (const row of rows) {
      const sid = Number(row.supplierId);
      if (!bySupplier.has(sid)) {
        bySupplier.set(sid, {
          lastPrice: String(row.lastPrice ?? 0),
          lastDate: row.lastDate instanceof Date ? row.lastDate.toISOString() : String(row.lastDate),
        });
        if (bySupplier.size >= limit) break;
      }
    }
    return Array.from(bySupplier.entries()).map(([supplierId, v]) => ({
      supplierId,
      supplierName: `Постачальник #${supplierId}`,
      lastPrice: v.lastPrice,
      lastDate: v.lastDate,
    }));
  }

  async getLastPurchasesBatch(
    materialIds: number[],
    projectId?: number,
  ): Promise<Record<number, LastPurchaseResult>> {
    if (materialIds.length === 0) return {};
    const result: Record<number, LastPurchaseResult> = {};
    const qb = this.receiptItemRepo
      .createQueryBuilder('ri')
      .innerJoin(SupplyReceipt, 'r', 'r.id = ri.receiptId')
      .where('ri.materialId IN (:...ids)', { ids: materialIds })
      .andWhere('r.status NOT IN (:...statuses)', { statuses: ['draft', 'cancelled'] })
      .andWhere('r.receivedAt IS NOT NULL');
    if (projectId != null) {
      qb.andWhere('r.projectId = :projectId', { projectId });
    }
    const rows = await qb
      .select('ri.materialId', 'materialId')
      .addSelect('ri.unitPrice', 'unitPrice')
      .addSelect('r.supplierId', 'supplierId')
      .addSelect('r.receivedAt', 'receivedAt')
      .addSelect('r.id', 'receiptId')
      .orderBy('r.receivedAt', 'DESC')
      .getRawMany();
    const seen = new Set<number>();
    for (const row of rows) {
      const mid = Number(row.materialId);
      if (seen.has(mid)) continue;
      seen.add(mid);
      result[mid] = {
        unitPrice: String(row.unitPrice ?? 0),
        supplierId: row.supplierId != null ? Number(row.supplierId) : null,
        receivedAt: row.receivedAt instanceof Date ? row.receivedAt.toISOString() : String(row.receivedAt),
        receiptId: Number(row.receiptId),
      };
    }
    return result;
  }

  async getRecentSuppliersBatch(
    materialIds: number[],
    projectId?: number,
    limit = 3,
  ): Promise<Record<number, RecentSupplierResult[]>> {
    if (materialIds.length === 0) return {};
    const result: Record<number, RecentSupplierResult[]> = {};
    for (const mid of materialIds) {
      result[mid] = await this.getRecentSuppliers(mid, limit, projectId);
    }
    return result;
  }
}
