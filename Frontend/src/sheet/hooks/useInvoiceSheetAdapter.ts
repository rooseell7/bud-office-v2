/**
 * Invoice sheet adapter. Converts Invoice items to materials SheetSnapshot.
 * REST via updateInvoice — no collab.
 * Used by Invoice details: Materials only.
 */

import { useEffect, useState } from 'react';
import { getInvoice, updateInvoice } from '../../modules/invoices/api/invoices.api';
import type { SheetSnapshot } from '../engine/types';
import { M_COL } from '../configs/materialsSheetConfig';

const MAT_ID_COL = 9;

type InvoiceItem = {
  materialId?: number;
  name?: string;
  unit?: string;
  qty?: string;
  supplierPrice?: string;
  clientPrice?: string;
  amountSupplier?: string;
  amountClient?: string;
  [k: string]: any;
};

function n(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

const DEFAULT_INVOICE_ROWS = 20;

/** Build SheetSnapshot from invoice items (materials sheet columns + materialId) */
function itemsToSnapshot(items: InvoiceItem[]): SheetSnapshot {
  const rowCount = Math.max(items.length, DEFAULT_INVOICE_ROWS);
  const colCount = 10;
  const rawValues: string[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const it = items[r];
    const mid = it?.materialId;
    rawValues[r] = [
      '',
      String(it?.name ?? it?.materialName ?? ''),
      String(it?.unit ?? ''),
      String(it?.qty ?? ''),
      String(it?.clientPrice ?? ''),
      '',
      String(it?.supplierPrice ?? ''),
      '',
      '',
      mid != null && Number.isFinite(Number(mid)) ? String(mid) : '',
    ];
  }
  return {
    rawValues,
    values: rawValues.map((row) => [...row]),
    rowCount,
    colCount,
  };
}

/** Convert SheetSnapshot rows to Invoice items */
function snapshotToItems(snapshot: SheetSnapshot): InvoiceItem[] {
  const raw = snapshot.rawValues ?? snapshot.values ?? [];
  const out: InvoiceItem[] = [];
  for (const row of raw) {
    if (!row) continue;
    const name = String(row[M_COL.NAME] ?? '').trim();
    const unit = String(row[M_COL.UNIT] ?? '').trim();
    const qty = String(row[M_COL.QTY] ?? '').trim();
    const clientPrice = String(row[M_COL.PRICE] ?? '').trim();
    const supplierPrice = String(row[M_COL.COST_UNIT] ?? '').trim();
    const materialId = row[MAT_ID_COL] != null ? n(row[MAT_ID_COL]) : undefined;
    if (!name && !unit && !qty && !clientPrice && !supplierPrice && !materialId) continue;
    const qn = n(qty);
    const cp = n(clientPrice);
    const sp = n(supplierPrice);
    const amountClient = qn && cp ? String((qn * cp).toFixed(2)) : '';
    const amountSupplier = qn && sp ? String((qn * sp).toFixed(2)) : '';
    const item: InvoiceItem = {
      name: name || '',
      unit: unit || '',
      qty: qty || '',
      clientPrice: clientPrice || '',
      supplierPrice: supplierPrice || '',
      amountClient: amountClient || '0',
      amountSupplier: amountSupplier || '0',
    };
    if (materialId != null && Number.isFinite(materialId) && materialId > 0) {
      item.materialId = materialId;
    }
    out.push(item);
  }
  if (out.length === 0) {
    out.push({ name: '', unit: '', qty: '', clientPrice: '', supplierPrice: '', amountClient: '0', amountSupplier: '0' });
  }
  return out;
}

export type InvoiceAdapterMode = 'loading' | 'edit' | 'readonly';

export function useInvoiceSheetAdapter(invoiceId: number | null, items: InvoiceItem[], onSaved?: () => void) {
  const [mode, setMode] = useState<InvoiceAdapterMode>('loading');
  const [initialSnapshot, setInitialSnapshot] = useState<SheetSnapshot | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setMode('edit');
      setInitialSnapshot(null);
      return;
    }
    setInitialSnapshot(itemsToSnapshot(items));
    setMode('edit');
  }, [invoiceId, JSON.stringify(items.map((i) => ({ n: i?.name, u: i?.unit, q: i?.qty })))]);

  const adapter = {
    getDraftKey: () => (invoiceId ? `invoice:${invoiceId}` : null),

    loadSnapshot: async () => {
      if (!invoiceId) return null;
      const inv = await getInvoice(invoiceId);
      const items = (inv.items ?? []).map((it: any) => ({
        materialId: Number.isFinite(Number(it?.materialId)) ? Number(it.materialId) : undefined,
        name: it?.materialName ?? it?.name ?? '',
        unit: it?.unit ?? '',
        qty: String(it?.qty ?? ''),
        clientPrice: String(it?.clientPrice ?? ''),
        supplierPrice: String(it?.supplierPrice ?? ''),
        amountClient: String(it?.amountClient ?? '0'),
        amountSupplier: String(it?.amountSupplier ?? '0'),
      }));
      return { snapshot: itemsToSnapshot(items), revision: 0 };
    },

    saveSnapshot: async (snapshot: SheetSnapshot): Promise<{ revision?: number }> => {
      if (!invoiceId) throw new Error('No invoice');
      const inv = await getInvoice(invoiceId);
      const newItems = snapshotToItems(snapshot);
      await updateInvoice(invoiceId, {
        objectId: inv.objectId,
        type: inv.type,
        warehouseId: inv.warehouseId,
        supplierName: inv.supplierName,
        status: inv.status,
        items: newItems,
      });
      onSaved?.();
      return { revision: 0 };
    },
  };

  return { adapter, mode, initialSnapshot };
}
