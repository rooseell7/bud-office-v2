/**
 * Analytics for "remaining need" per project/material (requested, ordered, received).
 * READ-ONLY: no writes to Document/sheet. Used by stage-materials-need endpoint.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupplyRequestItem } from './entities/supply-request-item.entity';
import { SupplyOrderItem } from './entities/supply-order-item.entity';
import { SupplyReceiptItem } from './entities/supply-receipt-item.entity';
import {
  QuoteReadService,
  QuoteStageMaterialsGroup,
  QuoteStageMaterialItem,
} from './quote-read.service';

export type QuoteStageMaterialNeedItem = QuoteStageMaterialItem & {
  qtyFromQuote: number;
  qtyRequested: number;
  qtyOrdered: number;
  qtyReceived: number;
  qtyRemainingNeed: number;
};

export type QuoteStageMaterialsNeedGroup = {
  stageId: string;
  stageName: string;
  items: QuoteStageMaterialNeedItem[];
};

@Injectable()
export class QuoteNeedService {
  constructor(
    private readonly quoteRead: QuoteReadService,
    @InjectRepository(SupplyRequestItem) private readonly requestItemRepo: Repository<SupplyRequestItem>,
    @InjectRepository(SupplyOrderItem) private readonly orderItemRepo: Repository<SupplyOrderItem>,
    @InjectRepository(SupplyReceiptItem) private readonly receiptItemRepo: Repository<SupplyReceiptItem>,
  ) {}

  /** Key: "materialId:unit". Only rows with materialId IS NOT NULL. */
  async getProjectMaterialAggregates(projectId: number): Promise<{
    requested: Record<string, number>;
    ordered: Record<string, number>;
    received: Record<string, number>;
  }> {
    const [requestedRows, orderedRows, receivedRows] = await Promise.all([
      this.requestItemRepo
        .createQueryBuilder('i')
        .innerJoin('i.request', 'r')
        .where('r.projectId = :projectId', { projectId })
        .andWhere('r.status IN (:...statuses)', { statuses: ['draft', 'submitted'] })
        .andWhere('i.materialId IS NOT NULL')
        .select('i.materialId', 'materialId')
        .addSelect('i.unit', 'unit')
        .addSelect('SUM(i.qty::decimal)', 'total')
        .groupBy('i.materialId')
        .addGroupBy('i.unit')
        .getRawMany<{ materialId: number; unit: string; total: string }>(),
      this.orderItemRepo
        .createQueryBuilder('i')
        .innerJoin('i.order', 'o')
        .where('o.projectId = :projectId', { projectId })
        .andWhere('o.status != :cancelled', { cancelled: 'cancelled' })
        .andWhere('i.materialId IS NOT NULL')
        .select('i.materialId', 'materialId')
        .addSelect('i.unit', 'unit')
        .addSelect('SUM("i"."qtyPlanned"::decimal)', 'total')
        .groupBy('i.materialId')
        .addGroupBy('i.unit')
        .getRawMany<{ materialId: number; unit: string; total: string }>(),
      this.receiptItemRepo
        .createQueryBuilder('i')
        .innerJoin('i.receipt', 'r')
        .where('r.projectId = :projectId', { projectId })
        .andWhere('r.status IN (:...statuses)', {
          statuses: ['received', 'verified', 'sent_to_pay', 'paid'],
        })
        .andWhere('i.materialId IS NOT NULL')
        .select('i.materialId', 'materialId')
        .addSelect('i.unit', 'unit')
        .addSelect('SUM("i"."qtyReceived"::decimal)', 'total')
        .groupBy('i.materialId')
        .addGroupBy('i.unit')
        .getRawMany<{ materialId: number; unit: string; total: string }>(),
    ]);

    const toMap = (
      rows: { materialId: number; unit: string; total: string }[],
    ): Record<string, number> =>
      rows.reduce(
        (acc, r) => {
          acc[`${r.materialId}:${r.unit}`] = Number(r.total) || 0;
          return acc;
        },
        {} as Record<string, number>,
      );

    return {
      requested: toMap(requestedRows),
      ordered: toMap(orderedRows),
      received: toMap(receivedRows),
    };
  }

  /**
   * Stage materials with need analytics. READ-ONLY.
   * mode=received_based: qtyRemainingNeed = max(qtyFromQuote - qtyReceived, 0).
   */
  async getStageMaterialsNeed(
    projectId: number,
    quoteId: number,
    stageIds: string[],
    _mode?: string,
  ): Promise<QuoteStageMaterialsNeedGroup[]> {
    const [groups, agg] = await Promise.all([
      this.quoteRead.getStageMaterials(quoteId, stageIds),
      this.getProjectMaterialAggregates(projectId),
    ]);

    return groups.map((g: QuoteStageMaterialsGroup) => ({
      stageId: g.stageId,
      stageName: g.stageName,
      items: g.items.map((it: QuoteStageMaterialItem) => {
        const key =
          it.materialId != null ? `${it.materialId}:${it.unit}` : null;
        const requested = key ? agg.requested[key] ?? 0 : 0;
        const ordered = key ? agg.ordered[key] ?? 0 : 0;
        const received = key ? agg.received[key] ?? 0 : 0;
        const qtyFromQuote = it.qtySuggested;
        const qtyRemainingNeed = Math.max(qtyFromQuote - received, 0);
        return {
          ...it,
          qtyFromQuote,
          qtyRequested: requested,
          qtyOrdered: ordered,
          qtyReceived: received,
          qtyRemainingNeed,
        };
      }),
    }));
  }
}
