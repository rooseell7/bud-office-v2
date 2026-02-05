/**
 * READ-ONLY adapter for Quote/КП data. Used by Supply module only.
 * HARD RULE: This service MUST NOT call any write (save, update, insert, delete) on Document/sheet.
 * Supply is forbidden from modifying Quotes/Sheets — only read.
 */

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../documents/document.entity';

export type QuoteStageInfo = { stageId: string; stageName: string };

export type QuoteStageMaterialItem = {
  materialId: number | null;
  materialName: string;
  unit: string;
  qtySuggested: number;
  quoteId: number;
  quoteRowId: string | null;
  fingerprint: string;
};

export type QuoteStageMaterialsGroup = {
  stageId: string;
  stageName: string;
  items: QuoteStageMaterialItem[];
};

type EstimateStageLike = {
  id: string;
  name: string;
  order: number;
  materialsSheet?: Record<string, any>;
};

/** Migrate legacy meta to stages array (read-only, no save). */
function migrateLegacyToStages(meta: Record<string, any> | null): EstimateStageLike[] {
  const stages = meta?.stages;
  if (Array.isArray(stages) && stages.length > 0) {
    return stages as EstimateStageLike[];
  }
  const legacy = meta?.sheetSnapshot;
  if (legacy && typeof legacy === 'object') {
    return [
      {
        id: 'stg_legacy_1',
        name: 'Етап 1',
        order: 0,
        materialsSheet: legacy,
      },
    ];
  }
  return [
    { id: 'stg_empty_1', name: 'Етап 1', order: 0, materialsSheet: undefined },
  ];
}

/** Parse materials sheet rows: col 1=name, 2=unit, 3=qty. rowIds from sheet.rowIds. */
function parseMaterialsSheetRows(
  sheet: Record<string, any> | undefined,
  quoteId: number,
  stageId: string,
  stageName: string,
): QuoteStageMaterialItem[] {
  if (!sheet || typeof sheet !== 'object') return [];
  const values = sheet.values ?? sheet.rawValues ?? [];
  const rowIds = Array.isArray(sheet.rowIds) ? sheet.rowIds : [];
  const result: QuoteStageMaterialItem[] = [];
  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    if (!Array.isArray(row)) continue;
    const name = String(row[1] ?? '').trim();
    const unit = String(row[2] ?? '').trim();
    const qtyRaw = row[3];
    const qty = Number(qtyRaw);
    if (!name && !unit && !Number.isFinite(qty)) continue;
    const quoteRowId = rowIds[i] ?? null;
    const fingerprint = `${stageId}:${name || 'n/a'}:${unit}`;
    result.push({
      materialId: null,
      materialName: name || '—',
      unit: unit || 'шт',
      qtySuggested: Number.isFinite(qty) && qty >= 0 ? qty : 0,
      quoteId,
      quoteRowId,
      fingerprint,
    });
  }
  return result;
}

@Injectable()
export class QuoteReadService {
  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
  ) {}

  /** Get stages for a project's (latest) quote. READ ONLY — no write. */
  async getStages(projectId: number): Promise<{ quoteId: number; stages: QuoteStageInfo[] }> {
    const doc = await this.docRepo.findOne({
      where: { type: 'quote', projectId },
      order: { updatedAt: 'DESC' },
    });
    if (!doc) throw new NotFoundException('КП для об\'єкта не знайдено');
    const meta = (doc as any).meta ?? {};
    const stages = migrateLegacyToStages(meta);
    return {
      quoteId: doc.id,
      stages: stages.map((s) => ({ stageId: s.id, stageName: s.name || 'Етап' })),
    };
  }

  /** Get materials for given stages of a quote. READ ONLY — no write. */
  async getStageMaterials(
    quoteId: number,
    stageIds: string[],
  ): Promise<QuoteStageMaterialsGroup[]> {
    const doc = await this.docRepo.findOne({
      where: { id: quoteId, type: 'quote' },
    });
    if (!doc) throw new NotFoundException('КП не знайдено');
    const meta = (doc as any).meta ?? {};
    const stages = migrateLegacyToStages(meta);
    const result: QuoteStageMaterialsGroup[] = [];
    for (const stageId of stageIds) {
      const stage = stages.find((s) => s.id === stageId);
      if (!stage) continue;
      const items = parseMaterialsSheetRows(
        stage.materialsSheet,
        quoteId,
        stage.id,
        stage.name || 'Етап',
      );
      result.push({
        stageId: stage.id,
        stageName: stage.name || 'Етап',
        items,
      });
    }
    return result;
  }
}
