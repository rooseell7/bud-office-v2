/**
 * Act section sheet adapter. Converts Act items (sections + works) to SheetSnapshot.
 * REST via updateAct — no collab.
 * Used by Act editor: Works only, one sheet per section (stage).
 */

import { useEffect, useState } from 'react';
import { getAct, updateAct } from '../../api/acts';
import type { SheetSnapshot } from '../engine/types';
import { W_COL } from '../configs/worksSheetConfig';

type ActItem = { rowType?: string; type?: string; sectionKey?: string; [k: string]: any };

function n(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/** Extract works for a section from act items */
function getWorksForSection(items: ActItem[], sectionKey: string): ActItem[] {
  const out: ActItem[] = [];
  for (const r of items) {
    const t = r?.rowType ?? r?.type;
    if (t === 'work' && (r?.sectionKey === sectionKey || !sectionKey)) {
      out.push(r);
    }
  }
  return out;
}

const DEFAULT_ACT_ROWS = 20;

/** Build SheetSnapshot from work rows (worksSheetConfig columns) */
function worksToSnapshot(works: ActItem[]): SheetSnapshot {
  const rowCount = Math.max(works.length, DEFAULT_ACT_ROWS);
  const colCount = 9; // worksSheetConfig
  const rawValues: string[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const w = works[r];
    rawValues[r] = [
      '', // NUM - computed
      String(w?.name ?? w?.title ?? ''),
      String(w?.unit ?? ''),
      String(n(w?.qty)),
      String(n(w?.price)),
      '', // TOTAL - computed
      String(n(w?.costPrice ?? w?.cost)),
      '', // COST_TOTAL - computed
      String(w?.note ?? ''),
    ];
  }
  return {
    rawValues,
    values: rawValues.map((row) => [...row]),
    rowCount,
    colCount,
  };
}

/** Convert SheetSnapshot rows to Act work items */
function snapshotToWorks(snapshot: SheetSnapshot, sectionKey: string): ActItem[] {
  const raw = snapshot.rawValues ?? snapshot.values ?? [];
  const out: ActItem[] = [];
  for (const row of raw) {
    if (!row) continue;
    const name = String(row[W_COL.NAME] ?? '').trim();
    const unit = String(row[W_COL.UNIT] ?? '').trim();
    const qty = n(row[W_COL.QTY]);
    const price = n(row[W_COL.PRICE]);
    const costUnit = n(row[W_COL.COST_UNIT]);
    const note = String(row[W_COL.NOTE] ?? '').trim();
    if (!name && !unit && qty === 0 && price === 0) continue; // skip empty
    out.push({
      rowType: 'work',
      type: 'work',
      sectionKey,
      name: name || '',
      unit: unit || '',
      qty,
      price,
      costPrice: costUnit,
      note: note || undefined,
    });
  }
  if (out.length === 0) {
    out.push({
      rowType: 'work',
      type: 'work',
      sectionKey,
      name: '',
      unit: '',
      qty: 0,
      price: 0,
      costPrice: 0,
    });
  }
  return out;
}

/** Merge section works into full items, preserve meta/section/percent/subtotal */
function mergeSectionWorks(items: ActItem[], sectionKey: string, newWorks: ActItem[]): ActItem[] {
  const result: ActItem[] = [];
  let replacing = false;
  for (const r of items) {
    const t = r?.rowType ?? r?.type;
    const sk = r?.sectionKey;
    if (t === 'meta') {
      result.push(r);
      replacing = false;
      continue;
    }
    if (t === 'section') {
      replacing = sk === sectionKey;
      result.push(r);
      if (replacing) result.push(...newWorks);
      continue;
    }
    if (replacing && sk === sectionKey && t === 'work') continue;
    result.push(r);
  }
  const hasSection = items.some((r) => (r?.rowType ?? r?.type) === 'section' && r?.sectionKey === sectionKey);
  if (!hasSection) {
    result.push({ rowType: 'section', type: 'section', sectionKey, title: 'Роботи' }, ...newWorks);
  }
  return result;
}

export type ActAdapterMode = 'loading' | 'edit' | 'readonly';

export function useActSheetAdapter(
  actId: number | null,
  sectionKey: string | null,
  items: ActItem[],
  onSaved?: () => void,
) {
  const [mode, setMode] = useState<ActAdapterMode>('loading');
  const [initialSnapshot, setInitialSnapshot] = useState<SheetSnapshot | null>(null);

  useEffect(() => {
    if (!actId || !sectionKey) {
      setMode('edit');
      setInitialSnapshot(null);
      return;
    }
    const works = getWorksForSection(items, sectionKey);
    setInitialSnapshot(worksToSnapshot(works));
    setMode('edit');
  }, [actId, sectionKey, JSON.stringify(items.map((i) => ({ sk: i?.sectionKey, t: i?.rowType ?? i?.type })))]);

  const adapter = {
    getDraftKey: () => (actId && sectionKey ? `act:${actId}:${sectionKey}` : null),

    loadSnapshot: async () => {
      if (!actId) return null;
      const act = await getAct(actId);
      const works = getWorksForSection(act.items ?? [], sectionKey!);
      return { snapshot: worksToSnapshot(works), revision: 0 };
    },

    saveSnapshot: async (snapshot: SheetSnapshot): Promise<{ revision?: number }> => {
      if (!actId || !sectionKey) throw new Error('No act or sectionKey');
      const act = await getAct(actId);
      const currentItems = act.items ?? [];
      const newWorks = snapshotToWorks(snapshot, sectionKey);
      const merged = mergeSectionWorks(currentItems, sectionKey, newWorks);
      const compat = merged.map((r) => {
        const anyR: any = { ...r };
        if (typeof anyR.rowType === 'string') anyR.type = anyR.rowType;
        if (anyR.rowType === 'work') {
          anyR.title = anyR.name;
          anyR.cost = anyR.costPrice;
        }
        if (anyR.rowType === 'percent') {
          anyR.title = anyR.name;
          anyR.percent = anyR.percentValue;
        }
        return anyR;
      });
      await updateAct(actId, {
        projectId: act.projectId,
        foremanId: act.foremanId,
        actDate: act.actDate,
        status: act.status,
        items: compat,
      });
      onSaved?.();
      return { revision: 0 };
    },
  };

  return { adapter, mode, initialSnapshot };
}
