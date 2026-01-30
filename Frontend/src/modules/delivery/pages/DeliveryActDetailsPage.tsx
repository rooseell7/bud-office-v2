// FILE: src/modules/delivery/pages/DeliveryActDetailsPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { useAuth } from '../../auth/context/AuthContext';

import { getAct, updateAct, type ActDto } from '../../../api/acts';
import { printHtml } from '../../../utils/printHtml';
import { exportInvoiceXlsx } from '../../../utils/exportInvoiceXlsx';

// Shared sheet helpers (KP is the source of truth)
import { cleanNumInput, n, parseClipboardMatrix } from '../../shared/sheet/utils';
import SaveIndicatorChip from '../../shared/sheet/SaveIndicatorChip';
import {
  SHEET_GRID_COLOR_SOFT,
  SHEET_HEADER_BG_SOFT,
  SHEET_OUTLINE_COLOR,
  SHEET_SECTION_BG,
  SHEET_SUBTOTAL_BG,
} from '../../shared/sheet/constants';

import { Sheet, actSheetConfig, draftKey } from '../../../sheet';

import {
  applyTsvPasteToRows,
  copyRangeToClipboard,
  forEachCellInRange,
  handleSheetsGridKeyDown,
  isInRange,
  normalizeRange,
  useSheetSelection,
} from '../../shared/sheet/engine';

type RowType = 'meta' | 'section' | 'work' | 'percent' | 'subtotal';

type ActRow = {
  rowType: RowType;
  sectionKey?: string;

  // meta
  header?: Record<string, any>;

  // section/subtotal
  title?: string;

  // work/percent
  name?: string;
  unit?: string;
  qty?: number;
  price?: number;
  costPrice?: number;
  amount?: number;
  amountCost?: number;

  // percent
  percentValue?: number;
};

// Шапка акту (rowType: 'meta'). Зберігається в acts.items[0].header (jsonb), без міграцій БД.
// Ми тримаємо поля «гнучкими», але даємо структурований UI 1:1 під шаблон Google Sheet.
type ActHeader = {
  // COMPANY
  companyName?: string;
  companyTagline?: string;
  companySite?: string;
  companyEmail?: string;
  companyPhone?: string;

  // ACT
  actNo?: string;
  actDateLabel?: string; // якщо треба переозначити текст дати у шапці
  periodFrom?: string;
  periodTo?: string;

  // OBJECT
  objectName?: string;
  objectAddress?: string;

  // CONTRACTOR (Підрядник)
  contractorName?: string;
  contractorCode?: string;
  contractorIban?: string;
  contractorBank?: string;
  contractorAddress?: string;
  contractorPhone?: string;
  contractorEmail?: string;

  // CUSTOMER (Замовник)
  customerName?: string;
  customerCode?: string;
  customerPassport?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
};

function fmtMoney(v: unknown): string {
  const x = n(v);
  return x.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDateUA(v?: string | null): string {
  const s = (v ?? '').trim();
  if (!s) return '';
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(s);
  if (!m) return s;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

type ColKey = 'name' | 'unit' | 'qty' | 'price' | 'amount' | 'costPrice' | 'amountCost' | 'percentValue';
const COLS: Array<{ key: ColKey; label: string; w: number; align?: 'left' | 'right' }> = [
  { key: 'name', label: 'Вид робіт', w: 520 },
  { key: 'unit', label: 'Од.вимір', w: 90 },
  { key: 'qty', label: 'К-ть', w: 95, align: 'right' },
  { key: 'price', label: 'Ціна за од', w: 125, align: 'right' },
  { key: 'amount', label: 'Загальна', w: 135, align: 'right' },
  { key: 'costPrice', label: 'Собівартість од', w: 140, align: 'right' },
  { key: 'amountCost', label: 'Загалом собівартість', w: 170, align: 'right' },
];

function makeSectionKey(i: number) {
  return `sec_${i + 1}`;
}

function ensureBaseStructure(items: any[] | undefined): ActRow[] {
  const src: ActRow[] = Array.isArray(items) ? (items as any) : [];
  const out: ActRow[] = [];

  const hasMeta = src.some((r) => r?.rowType === 'meta');
  if (!hasMeta) out.push({ rowType: 'meta', header: {} });

  // carry all rows
  for (const r of src) out.push(r);

  const hasSection = out.some((r) => r.rowType === 'section');
  const hasWork = out.some((r) => r.rowType === 'work');

  if (!hasSection) out.push({ rowType: 'section', sectionKey: makeSectionKey(0), title: 'Роботи' });
  if (!hasWork) out.push({ rowType: 'work', sectionKey: makeSectionKey(0), name: '', unit: '', qty: 0, price: 0, costPrice: 0 });

  return out;
}

/**
 * Сумісність із попередніми форматами, де рядки могли зберігатись у вигляді
 * { type: 'work', title: '...', qty, price, cost, ... } тощо.
 * Backend канонічно працює з rowType/name/costPrice/percentValue.
 */
function normalizeIncomingRows(items: any[] | undefined): ActRow[] {
  if (!Array.isArray(items)) return [];
  // вже канонічний формат
  if (items.some((r) => r && typeof r === 'object' && typeof r.rowType === 'string')) return items as any;

  return items
    .map((r) => {
      if (!r || typeof r !== 'object') return null;
      const t = (r as any).type;
      if (t === 'meta') return { rowType: 'meta', header: (r as any).header ?? {} } as ActRow;
      if (t === 'section') {
        return {
          rowType: 'section',
          sectionKey: String((r as any).sectionKey ?? makeSectionKey(0)),
          title: String((r as any).title ?? ''),
        } as ActRow;
      }
      if (t === 'work') {
        return {
          rowType: 'work',
          sectionKey: String((r as any).sectionKey ?? makeSectionKey(0)),
          name: String((r as any).name ?? (r as any).title ?? ''),
          unit: String((r as any).unit ?? ''),
          qty: Number(cleanNumInput(String((r as any).qty ?? 0)) || 0),
          price: Number(cleanNumInput(String((r as any).price ?? 0)) || 0),
          costPrice: Number(cleanNumInput(String((r as any).costPrice ?? (r as any).cost ?? 0)) || 0),
          amount: typeof (r as any).amount === 'number' ? (r as any).amount : undefined,
          costAmount: typeof (r as any).costAmount === 'number' ? (r as any).costAmount : undefined,
        } as ActRow;
      }
      if (t === 'percent') {
        return {
          rowType: 'percent',
          sectionKey: String((r as any).sectionKey ?? makeSectionKey(0)),
          name: String((r as any).name ?? (r as any).title ?? ''),
          percentValue: Number(cleanNumInput(String((r as any).percentValue ?? (r as any).percent ?? 0)) || 0),
          amount: typeof (r as any).amount === 'number' ? (r as any).amount : undefined,
          costAmount: typeof (r as any).costAmount === 'number' ? (r as any).costAmount : undefined,
        } as ActRow;
      }
      if (t === 'subtotal') {
        return { rowType: 'subtotal', sectionKey: String((r as any).sectionKey ?? makeSectionKey(0)) } as ActRow;
      }
      return null;
    })
    .filter(Boolean) as any;
}

function toCompatRows(rows: ActRow[]): any[] {
  return rows.map((r) => {
    const anyR: any = { ...r };
    // дубль поля type для старих бекендів/даних
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
}

function stripComputed(rows: ActRow[]): ActRow[] {
  // subtotal генерує сервер; залишаємо meta/section/work/percent
  // але у шапці акту матеріали не використовуємо — прибираємо, щоб не тягнути "materials" у БД.
  return rows
    .filter((r) => r.rowType !== 'subtotal')
    .map((r) => {
      if (r.rowType !== 'meta') return r;
      const hdr: any = { ...((r as any).header ?? {}) };
      if ('materials' in hdr) delete hdr.materials;
      return { ...r, header: hdr } as any;
    });
}

function canEditCell(row: ActRow, col: ColKey): boolean {
  if (row.rowType === 'work') return col !== 'amount' && col !== 'amountCost';
  // % рядок: редагуємо через колонку qty (UI), але пишемо у percentValue
  if (row.rowType === 'percent') return col === 'name' || col === 'qty';
  return false;
}

function cellValue(row: ActRow, col: ColKey): string {
  // % рядок: UI колонка qty = percentValue
  if (row.rowType === 'percent' && col === 'qty') return String(n(row.percentValue));

  if (col === 'name') return String(row.name ?? '');
  if (col === 'unit') return String(row.unit ?? '');
  if (col === 'qty') return String(n(row.qty));
  if (col === 'price') return String(n(row.price));
  if (col === 'costPrice') return String(n(row.costPrice));
  if (col === 'amount') return String(n(row.amount));
  if (col === 'amountCost') return String(n(row.amountCost));
  if (col === 'percentValue') return String(n(row.percentValue));
  return '';
}

function setCell(row: ActRow, col: ColKey, v: string): ActRow {
  const s = v ?? '';

  // % рядок: UI колонка qty = percentValue
  if (row.rowType === 'percent' && col === 'qty') return { ...row, percentValue: n(s) };

  if (col === 'name') return { ...row, name: s };
  if (col === 'unit') return { ...row, unit: s };
  if (col === 'qty') return { ...row, qty: n(s) };
  if (col === 'price') return { ...row, price: n(s) };
  if (col === 'costPrice') return { ...row, costPrice: n(s) };
  if (col === 'percentValue') return { ...row, percentValue: n(s) };
  return row;
}

function buildGridRowIndices(rr: ActRow[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < rr.length; i++) {
    const t = rr[i]?.rowType;
    if (t === 'work' || t === 'percent' || t === 'subtotal') out.push(i);
  }
  return out;
}

export default function DeliveryActDetailsPage() {
  const { id } = useParams();
  const actId = Number(id);

  const nav = useNavigate();
  const { can } = useAuth();

  const canRead = can('delivery:read');
  const canWrite = can('delivery:write');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [act, setAct] = useState<ActDto | null>(null);
  const [rows, setRows] = useState<ActRow[]>([]);

  // Header is stored inside the meta row (rowType: 'meta').
  const header = useMemo<ActHeader>(() => {
    const headerRow = rows.find((r) => r.rowType === 'meta') as any;
    return (headerRow?.header ?? {}) as ActHeader;
  }, [rows]);

  function getHeader(): ActHeader {
    return header;
  }

  function setHeaderField<K extends keyof ActHeader>(key: K, value: ActHeader[K]) {
    if (!canWrite) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.rowType !== 'meta') return r;
        const hdr = { ...((r.header ?? {}) as any), [key]: value } as ActHeader;
        return { ...r, header: hdr } as any;
      }),
    );
    markDirty();
  }

  /**
   * ✅ IMPORTANT: always save the latest rows snapshot.
   *
   * Some actions (paste / fast edit / autofill) call markDirty() in the same tick as setRows().
   * If doSave() relies on the closure-captured `rows`, it can send a stale array and overwrite
   * server state with a blank template.
   */
  const rowsRef = useRef<ActRow[]>([]);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  async function load() {
    if (!canRead) {
      setError('Немає доступу: delivery:read');
      setLoading(false);
      return;
    }

    if (!Number.isFinite(actId) || actId <= 0) {
      setError('Невірний ID акту');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const a = await getAct(actId);
      setAct(a);
      setRows(ensureBaseStructure(normalizeIncomingRows(a.items)));
      setSaving('idle');
    } catch (e: any) {
      setError(e?.message || 'Не вдалося завантажити акт');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actId, canRead]);

  type GridColKey = Exclude<ColKey, 'percentValue'>;
  const GRID_COLS = useMemo(() => COLS.map((c) => c.key as GridColKey), []);

  const gridRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<number | null>(null);

  const gridRowIndices = useMemo(() => buildGridRowIndices(rows), [rows]);
  const gridRows = useMemo(() => gridRowIndices.map((ai) => rows[ai]).filter(Boolean) as ActRow[], [rows, gridRowIndices]);

  // actual row index (rows[]) -> grid row index (selection model)
  const actualToGrid = useMemo(() => {
    const m = new Map<number, number>();
    for (let gi = 0; gi < gridRowIndices.length; gi++) {
      m.set(gridRowIndices[gi], gi);
    }
    return m;
  }, [gridRowIndices]);

  const {
    activeCell,
    setActiveCell,
    sel,
    setSel,
    anchorRef,
    setAnchor,
    selectCell,
    beginMouseSelection,
    extendMouseSelection,
  } = useSheetSelection<GridColKey>(GRID_COLS);

  const selNorm = useMemo(() => (sel ? normalizeRange(sel) : null), [sel]);

  const [editor, setEditor] = useState<{ r: number; c: GridColKey } | null>(null);
  const [editorValue, setEditorValue] = useState<string>('');
  const editorInputRef = useRef<HTMLInputElement | null>(null);

  const [dragFill, setDragFill] = useState<{ startR: number; col: GridColKey; endR: number } | null>(null);

  const totals = useMemo(() => {
    // prefer server totals
    const totalAmount = n((act as any)?.totalAmount);
    if (totalAmount > 0) return { totalAmount, totalCost: n((act as any)?.totalCost) };

    // fallback: take last subtotal sum
    let sum = 0;
    let cost = 0;
    for (const r of rows) {
      if (r.rowType === 'subtotal') {
        sum += n(r.amount);
        cost += n(r.amountCost);
      }
    }
    return { totalAmount: sum, totalCost: cost };
  }, [act, rows]);

  function markDirty() {
    setSaving('dirty');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void doSave(), 800);
  }

  async function doSave() {
    if (!canWrite || !act) return;
    if (saving === 'saving') return;
    setSaving('saving');

    try {
      const snapshot = rowsRef.current;
      const payload = {
        projectId: act.projectId,
        foremanId: act.foremanId,
        actDate: act.actDate,
        status: act.status,
        items: toCompatRows(stripComputed(snapshot)),
      };

      const updated = await updateAct(act.id, payload as any);
      setAct(updated);
      setRows(ensureBaseStructure(normalizeIncomingRows(updated.items)));
      setSaving('saved');
      window.setTimeout(() => setSaving((s) => (s === 'saved' ? 'idle' : s)), 1200);
    } catch (e: any) {
      setSaving('error');
      setError(e?.message || 'Помилка збереження');
    }
  }
  function getClipboardCellValue(row: ActRow, col: GridColKey): string {
    if (row.rowType === 'subtotal') {
      if (col === 'name') return String(row.title ?? '');
      if (col === 'amount') return String(n(row.amount));
      if (col === 'amountCost') return String(n(row.amountCost));
      return '';
    }

    if (row.rowType === 'percent') {
      if (col === 'name') return String(row.name ?? '');
      if (col === 'unit') return '%';
      if (col === 'qty') return String(n(row.percentValue));
      if (col === 'amount') return String(n(row.amount));
      if (col === 'amountCost') return String(n(row.amountCost));
      return '';
    }

    // work
    if (col === 'name') return String(row.name ?? '');
    if (col === 'unit') return String(row.unit ?? '');
    if (col === 'qty') return String(n(row.qty));
    if (col === 'price') return String(n(row.price));
    if (col === 'costPrice') return String(n(row.costPrice));
    if (col === 'amount') return String(n(row.amount));
    if (col === 'amountCost') return String(n(row.amountCost));
    return '';
  }

  function openEditor(ri: number, col: GridColKey, opts?: { replace?: boolean; ch?: string }) {
    const ai = gridRowIndices[ri];
    if (ai === undefined) return;
    const row = rows[ai];
    if (!row) return;
    if (!canWrite) return;
    if (!canEditCell(row, col as any)) return;

    selectCell(ri, col);

    const cur = getClipboardCellValue(row, col);
    const next = opts?.replace ? String(opts?.ch ?? '') : cur;
    setEditorValue(next);
    setEditor({ r: ri, c: col });

    window.setTimeout(() => {
      editorInputRef.current?.focus();
      editorInputRef.current?.select?.();
    }, 20);
  }

  function closeEditor() {
    setEditor(null);
  }

  function commitEditor(dir: 'down' | 'right' | 'none' = 'none') {
    if (!editor) return;
    const { r, c } = editor;

    setRows((prev) => {
      const next = [...prev];
      const g = buildGridRowIndices(next);
      const ai = g[r];
      if (ai === undefined) return prev;
      const row = next[ai];
      if (!row) return prev;
      if (!canEditCell(row, c as any)) return next;
      next[ai] = setCell(row, c as any, editorValue) as any;
      return next;
    });

    closeEditor();
    markDirty();

    if (dir === 'down') {
      const nr = Math.min(Math.max(0, gridRowIndices.length - 1), r + 1);
      selectCell(nr, c);
    } else if (dir === 'right') {
      const ci = GRID_COLS.indexOf(c);
      const nc = Math.min(GRID_COLS.length - 1, ci + 1);
      selectCell(r, GRID_COLS[nc]);
    }
  }

  function copySelectionToClipboard() {
    if (!sel) return;
    const gridRows = gridRowIndices.map((ai) => rows[ai]).filter(Boolean) as ActRow[];
    void copyRangeToClipboard(gridRows, GRID_COLS, sel, getClipboardCellValue);
  }

  function clearSelectionCells() {
    if (!sel) return;
    const s = normalizeRange(sel);
    setRows((prev) => {
      const next = [...prev];
      const g = buildGridRowIndices(next);
      forEachCellInRange(s, GRID_COLS, (ri, _ci, col) => {
        const ai = g[ri];
        if (ai === undefined) return;
        const row = next[ai];
        if (!row) return;
        if (!canEditCell(row, col as any)) return;
        next[ai] = setCell(row, col as any, '') as any;
      });
      return next;
    });
    markDirty();
  }

  function pasteTsv(startR: number, startC: number, tsv: string) {
    const matrix = parseClipboardMatrix(tsv);
    if (!matrix.length) return;

    setRows((prev) => {
      let next = [...prev];
      let g = buildGridRowIndices(next);

      const baseAi = g[startR];
      if (baseAi === undefined) return prev;
      const baseRow = next[baseAi];
      if (!baseRow) return prev;

      const baseIsWork = baseRow.rowType === 'work';
      const baseIsPercent = baseRow.rowType === 'percent';
      if (!baseIsWork && !baseIsPercent) return prev;

      // section for autogrow
      let baseSectionKey: string | undefined = baseRow.sectionKey;
      if (!baseSectionKey) {
        for (let i = baseAi; i >= 0; i--) {
          const r = next[i];
          if (r?.rowType === 'section' && r.sectionKey) {
            baseSectionKey = r.sectionKey;
            break;
          }
        }
      }
      if (!baseSectionKey) {
        baseSectionKey = next.find((r) => r.rowType === 'section')?.sectionKey ?? makeSectionKey(0);
      }

      const makeWork = (sectionKey: string): ActRow => ({
        rowType: 'work',
        sectionKey,
        name: '',
        unit: '',
        qty: 0,
        price: 0,
        costPrice: 0,
      });

      function insertWorkBeforeSubtotal(sectionKey: string) {
        const idxSub = next.findIndex((r) => r.rowType === 'subtotal' && r.sectionKey === sectionKey);
        const ins = idxSub >= 0 ? idxSub : next.length;
        next.splice(ins, 0, makeWork(sectionKey));
      }

      const normalize = (col: GridColKey, raw: string) => {
        if (col === 'qty' || col === 'price' || col === 'costPrice') return cleanNumInput(raw);
        return raw;
      };

      for (let ro = 0; ro < matrix.length; ro++) {
        const targetGridR = startR + ro;

        // refresh grid mapping for current next
        g = buildGridRowIndices(next);

        // extend grid if needed (work only)
        if (targetGridR >= g.length) {
          if (!baseIsWork) break;
          insertWorkBeforeSubtotal(baseSectionKey!);
          g = buildGridRowIndices(next);
        }

        let ai = g[targetGridR];
        if (ai === undefined) break;

        // if pasting work into non-work row (subtotal/percent) — insert work row at that position
        if (baseIsWork && next[ai]?.rowType !== 'work') {
          const targetSectionKey = next[ai]?.sectionKey ?? baseSectionKey!;
          next.splice(ai, 0, makeWork(targetSectionKey));
          g = buildGridRowIndices(next);
          ai = g[targetGridR];
          if (ai === undefined) break;
        }

        const row = next[ai];
        if (!row) continue;
        if (baseIsPercent && row.rowType !== 'percent') continue;

        const line = matrix[ro];
        for (let co = 0; co < line.length; co++) {
          const ci = startC + co;
          if (ci < 0 || ci >= GRID_COLS.length) continue;
          const col = GRID_COLS[ci];
          if (!canEditCell(row, col as any)) continue;
          const raw = String(line[co] ?? '');
          const v = col === 'name' || col === 'unit' ? raw : normalize(col, raw);
          next[ai] = setCell(next[ai], col as any, v) as any;
        }
      }

      return next;
    });

    markDirty();
  }

  function handleGridKeyDown(e: React.KeyboardEvent) {
    const canEdit = canWrite;
    handleSheetsGridKeyDown(e, {
      canEdit,
      editorOpen: Boolean(editor),
      commitEditor,
      closeEditor,
      openEditor,
      activeCell,
      setActiveCell,
      anchor: anchorRef.current,
      setAnchor,
      cols: GRID_COLS,
      rowsCount: gridRowIndices.length,
      sel,
      setSel,
      copySelectionToClipboard,
      clearSelectionCells,
    });
  }

  function handleGridPaste(e: React.ClipboardEvent) {
    if (!canWrite) return;
    const txt = e.clipboardData.getData('text');
    if (!txt) return;
    if (!activeCell && !sel) return;
    e.preventDefault();

    const s = sel ? normalizeRange(sel) : null;
    const startR = s ? s.r1 : (activeCell?.r ?? 0);
    const startC = s ? s.c1 : GRID_COLS.indexOf(activeCell!.c);
    pasteTsv(startR, startC, txt);
  }


  function startFill(r: number, c: GridColKey) {
    if (!canWrite) return;
    const ai = gridRowIndices[r];
    if (ai === undefined) return;
    const row = rows[ai];
    if (!row) return;
    if (!canEditCell(row, c as any)) return;
    setDragFill({ startR: r, col: c, endR: r });
  }

  function applyFill(df: { startR: number; col: GridColKey; endR: number }) {
    const { startR, endR, col } = df;
    if (endR <= startR) return;

    setRows((prev) => {
      const next = [...prev];
      const g = buildGridRowIndices(next);
      const srcAi = g[startR];
      if (srcAi === undefined) return prev;
      const srcRow = next[srcAi];
      if (!srcRow) return prev;
      const srcVal = cellValue(srcRow, col as any);

      for (let ri = startR + 1; ri <= endR; ri++) {
        const ai = g[ri];
        if (ai === undefined) break;
        const row = next[ai];
        if (!row) break;
        if (!canEditCell(row, col as any)) continue;
        next[ai] = setCell(row, col as any, srcVal) as any;
      }
      return next;
    });

    markDirty();
  }

  useEffect(() => {
    function onUp() {
      if (dragFill) {
        applyFill(dragFill);
        setDragFill(null);
      }
    }
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragFill, rows]);

  function insertSection() {
    if (!canWrite) return;
    const sectionCount = rows.filter((r) => r.rowType === 'section').length;
    const key = makeSectionKey(sectionCount);
    setRows((prev) => [
      ...prev,
      { rowType: 'section', sectionKey: key, title: `Секція ${sectionCount + 1}` },
      { rowType: 'work', sectionKey: key, name: '', unit: '', qty: 0, price: 0, costPrice: 0 },
    ]);
    markDirty();
  }

  function insertPercent(sectionKey?: string) {
    if (!canWrite) return;
    const key = sectionKey || (rows.find((r) => r.rowType === 'section')?.sectionKey ?? makeSectionKey(0));
    setRows((prev) => {
      // insert before subtotal of this section if exists, else append at end
      const idx = prev.findIndex((r) => r.rowType === 'subtotal' && r.sectionKey === key);
      const row: ActRow = { rowType: 'percent', sectionKey: key, name: 'Адміністративні витрати', percentValue: 5 };
      if (idx >= 0) {
        const next = [...prev];
        next.splice(idx, 0, row);
        return next;
      }
      return [...prev, row];
    });
    markDirty();
  }

  
  function insertWorkRow() {
    if (!canWrite) return;

    setRows((prev) => {
      const next = [...prev];
      const g = buildGridRowIndices(next);

      // default insert position: end of last section
      let insertAt = next.length;
      let sectionKey: string | undefined = next.find((r) => r.rowType === 'section')?.sectionKey ?? makeSectionKey(0);

      if (activeCell) {
        const ai = g[activeCell.r];
        if (ai !== undefined && next[ai]) {
          const base = next[ai];
          sectionKey = base.sectionKey ?? sectionKey;

          // if active row is subtotal — insert before it
          if (base.rowType === 'subtotal') {
            insertAt = ai;
          } else {
            insertAt = Math.min(ai + 1, next.length);
          }

          // find nearest section above if sectionKey missing
          if (!sectionKey) {
            for (let i = ai; i >= 0; i--) {
              if (next[i]?.rowType === 'section' && next[i]?.sectionKey) {
                sectionKey = next[i].sectionKey;
                break;
              }
            }
          }

          // if inserting into a section that has subtotal, keep insertion before subtotal
          if (sectionKey) {
            const subIdx = next.findIndex((r) => r.rowType === 'subtotal' && r.sectionKey === sectionKey);
            if (subIdx >= 0) insertAt = Math.min(insertAt, subIdx);
          }
        }
      }

      if (!sectionKey) sectionKey = next.find((r) => r.rowType === 'section')?.sectionKey ?? makeSectionKey(0);
      next.splice(insertAt, 0, { rowType: 'work', sectionKey, name: '', unit: '', qty: 0, price: 0, costPrice: 0 });
      return next;
    });

    markDirty();
  }

function printAct() {
    if (!act) return;
    const dateUA = fmtDateUA(act.actDate);

    const headerRow = rows.find((r) => r.rowType === 'meta') as any;
    const hdr = (headerRow?.header ?? {}) as Record<string, any>;

    const companyName = hdr.companyName || 'Будуй';
    const companyTagline = hdr.companyTagline || 'Будуємо ваше завтра – сьогодні.';
    const companySite = hdr.companySite || 'buduy.lviv';
    const companyEmail = hdr.companyEmail || '';
    const companyPhone = hdr.companyPhone || '';

    const actNo = hdr.actNo || String(act.id);
    const periodLine = (hdr.periodFrom || hdr.periodTo)
      ? `за період ${fmtDateUA(hdr.periodFrom || '')} — ${fmtDateUA(hdr.periodTo || '')}`
      : '';

    const objectName = hdr.objectName || '';
    const objectAddress = hdr.objectAddress || '';

    const contractorName = hdr.contractorName || '';
    const contractorCode = hdr.contractorCode || '';
    const contractorIban = hdr.contractorIban || '';
    const contractorBank = hdr.contractorBank || '';
    const contractorAddress = hdr.contractorAddress || '';

    const customerName = hdr.customerName || '';
    const customerCode = hdr.customerCode || '';
    const customerPassport = hdr.customerPassport || '';
    const customerAddress = hdr.customerAddress || '';

    const sectionsHtml = rows
      .filter((r) => r.rowType !== 'meta')
      .map((r) => {
        if (r.rowType === 'section') {
          return `<tr><td colspan="8" style="background:#e6efe9;font-weight:700;">${r.title ?? ''}</td></tr>`;
        }
        if (r.rowType === 'subtotal') {
          return `<tr>
            <td colspan="5" style="font-weight:700;text-align:right;">${r.title ?? 'Всього'}</td>
            <td style="font-weight:700;text-align:right;">${fmtMoney(r.amount)}</td>
            <td></td>
            <td style="font-weight:700;text-align:right;">${fmtMoney(r.amountCost)}</td>
          </tr>`;
        }
        if (r.rowType === 'percent') {
          return `<tr>
            <td>${r.name ?? ''}</td>
            <td style="text-align:center;">%</td>
            <td style="text-align:right;">${fmtMoney(r.percentValue)}</td>
            <td></td>
            <td></td>
            <td style="text-align:right;">${fmtMoney(r.amount)}</td>
            <td></td>
            <td></td>
          </tr>`;
        }
        // work
        return `<tr>
          <td>${r.name ?? ''}</td>
          <td style="text-align:center;">${r.unit ?? ''}</td>
          <td style="text-align:right;">${fmtMoney(r.qty)}</td>
          <td style="text-align:right;">${fmtMoney(r.price)}</td>
          <td style="text-align:right;">${fmtMoney(r.amount)}</td>
          <td style="text-align:right;">${fmtMoney(r.costPrice)}</td>
          <td style="text-align:right;">${fmtMoney(r.amountCost)}</td>
          <td style="text-align:right;">${fmtMoney(0)}</td>
        </tr>`;
      })
      .join('');

    const html = `
<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Акт #${act.id}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color:#111; }
  .wrap { max-width: 920px; margin: 0 auto; padding: 16px; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; border:1px solid #2b2b2b; padding:10px; background:#e6efe9; }
  .logo { font-size: 18px; font-weight: 800; }
  .muted { color:#333; font-size: 11px; }
  .title { margin: 10px 0 6px; text-align:center; font-weight:700; }
  .box { border:1px solid #2b2b2b; padding:8px; }
  .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
  .hlabel { font-weight:700; margin-bottom:4px; }
  .row { display:flex; gap:8px; }
  .row > div { flex: 1; }
  table { width:100%; border-collapse:collapse; margin-top:10px; }
  th, td { border:1px solid #2b2b2b; padding:6px; vertical-align:top; }
  th { background:#e6efe9; font-weight:700; text-align:center; }
  .tot { margin-top: 10px; display:flex; justify-content:flex-end; gap:16px; font-weight:800; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div>
        <div class="logo">${companyName}</div>
        <div class="muted">${companyTagline}</div>
      </div>
      <div class="muted" style="text-align:right;">
        <div>${companySite}</div>
        ${companyEmail ? `<div>${companyEmail}</div>` : ''}
        ${companyPhone ? `<div>${companyPhone}</div>` : ''}
      </div>
    </div>

    <div class="title box">
      Акт виконаних робіт №${actNo} від ${dateUA}
      ${periodLine ? `<div class="muted" style="margin-top:4px;">${periodLine}</div>` : ''}
    </div>

    <div class="grid2" style="margin-top:8px;">
      <div class="box">
        <div class="hlabel">Обʼєкт</div>
        ${objectName ? `<div>${objectName}</div>` : ''}
        ${objectAddress ? `<div class="muted">${objectAddress}</div>` : ''}
      </div>
      <div class="box">
        <div class="hlabel">Додаткова інформація</div>
        <div class="muted">projectId: ${act.projectId}</div>
        <div class="muted">foremanId: ${act.foremanId}</div>
      </div>
    </div>

    <div class="grid2" style="margin-top:8px;">
      <div class="box">
        <div class="hlabel">Підрядник</div>
        ${contractorName ? `<div>${contractorName}</div>` : ''}
        ${contractorCode ? `<div class="muted">Код ЄДРПОУ: ${contractorCode}</div>` : ''}
        ${contractorIban ? `<div class="muted">Рахунок (IBAN): ${contractorIban}</div>` : ''}
        ${contractorBank ? `<div class="muted">Банк: ${contractorBank}</div>` : ''}
        ${contractorAddress ? `<div class="muted">Адреса: ${contractorAddress}</div>` : ''}
      </div>
      <div class="box">
        <div class="hlabel">Замовник</div>
        ${customerName ? `<div>${customerName}</div>` : ''}
        ${customerCode ? `<div class="muted">Код / ІПН: ${customerCode}</div>` : ''}
        ${customerPassport ? `<div class="muted">Паспорт: ${customerPassport}</div>` : ''}
        ${customerAddress ? `<div class="muted">Адреса: ${customerAddress}</div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Вид робіт</th>
          <th>Од.вимір</th>
          <th>К-ть</th>
          <th>Ціна за од</th>
          <th>Загальна</th>
          <th>Собівартість од</th>
          <th>Загалом собівартість</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${sectionsHtml}
      </tbody>
    </table>

    <div class="tot">
      <div>Загальна сума:</div>
      <div>${fmtMoney(totals.totalAmount)} грн</div>
    </div>
  </div>
</body></html>`;

    printHtml(html);
  }

  function exportXlsx() {
    if (!act) return;
    const hdr = getHeader();
    const dateUA = fmtDateUA(act.actDate);

    const headerRows: Array<Array<string | number | boolean | null>> = [
      [String(hdr.companyName || 'Будуй')],
      [String(hdr.companyTagline || 'Будуємо ваше завтра – сьогодні.')],
      [String(hdr.companySite || ''), String(hdr.companyEmail || ''), String(hdr.companyPhone || '')],
      [],
      [`Акт виконаних робіт №${hdr.actNo || act.id} від ${dateUA}`],
      (hdr.periodFrom || hdr.periodTo)
        ? [`Період: ${fmtDateUA(hdr.periodFrom || '')} — ${fmtDateUA(hdr.periodTo || '')}`]
        : [],
      [],
      ['Обʼєкт', String(hdr.objectName || ''), String(hdr.objectAddress || '')],
      [],
      ['Підрядник', String(hdr.contractorName || ''), String(hdr.contractorCode || ''), String(hdr.contractorIban || '')],
      ['', String(hdr.contractorBank || ''), String(hdr.contractorAddress || ''), String(hdr.contractorPhone || '')],
      ['', String(hdr.contractorEmail || ''), '', ''],
      [],
      ['Замовник', String(hdr.customerName || ''), String(hdr.customerCode || ''), String(hdr.customerPassport || '')],
      ['', String(hdr.customerAddress || ''), String(hdr.customerPhone || ''), String(hdr.customerEmail || '')],
    ].filter((r) => r.length > 0);

    const tableHeader: Array<string> = [
      'Вид робіт',
      'Од.вимір',
      'К-ть',
      'Ціна за од',
      'Загальна',
      'Собівартість од',
      'Загалом собівартість',
    ];

    const tableRows: Array<Array<string | number | boolean | null>> = rows
      .filter((r) => r.rowType !== 'meta')
      .map((r) => {
        if (r.rowType === 'section') {
          return [String(r.title || ''), '', '', '', '', '', ''];
        }
        if (r.rowType === 'subtotal') {
          return [String(r.title || 'Всього'), '', '', '', n(r.amount), '', n(r.amountCost)];
        }
        if (r.rowType === 'percent') {
          return [String(r.name || ''), '%', n(r.percentValue), '', n(r.amount), '', ''];
        }
        return [
          String(r.name || ''),
          String(r.unit || ''),
          n(r.qty),
          n(r.price),
          n(r.amount),
          n(r.costPrice),
          n(r.amountCost),
        ];
      });

    const footerRows: Array<Array<string | number | boolean | null>> = [
      ['Загальна сума', '', '', '', n(totals.totalAmount)],
    ];

    exportInvoiceXlsx({
      fileNameBase: `Act_${act.id}_${act.actDate}`,
      headerRows,
      tableHeader,
      tableRows,
      footerRows,
    });
  }

  if (!canRead) {
    return (
      <Box p={2}>
        <Alert severity="warning">Немає доступу (delivery:read)</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box p={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={20} />
          <Typography>Завантаження акту…</Typography>
        </Stack>
      </Box>
    );
  }

  if (!act) {
    return (
      <Box p={2}>
        <Alert severity="error">{error ?? 'Акт не знайдено'}</Alert>
        <Box mt={2}>
          <Button variant="outlined" onClick={() => nav(-1)}>
            Назад
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Акт №{act.id}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
            <Chip size="small" label={`Дата: ${fmtDateUA(act.actDate)}`} />
            <Chip size="small" label={`Статус: ${act.status}`} />          </Stack>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => void load()}>
            Оновити
          </Button>
          <Button variant="outlined" onClick={printAct}>
            Друк / PDF
          </Button>
          <Button variant="outlined" onClick={exportXlsx}>
            Excel
          </Button>
          <Button variant="contained" disabled={!canWrite} onClick={() => void doSave()}>
            Зберегти
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Box mt={2}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {act?.id && (
        <Box sx={{ mb: 2, p: 1, border: '1px solid #e2e8f0', borderRadius: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Таблиця (canonical Sheet)
          </Typography>
          <Sheet
            config={actSheetConfig}
            adapter={{ getDraftKey: () => draftKey('act', act.id) }}
          />
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* ШАПКА (1:1 як у Google Sheet) */}
      <Box
        sx={{
          border: '1px solid #2b2b2b',
          borderRadius: 1,
          overflow: 'hidden',
          mb: 2,
          background: '#e6efe9',
        }}
      >
        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ minWidth: 340 }}>
            <TextField
              fullWidth
              label="Назва компанії"
              size="small"
              value={getHeader().companyName ?? 'Будуй'}
              onChange={(e) => setHeaderField('companyName', e.target.value)}
              disabled={!canWrite}
            />
            <Box mt={1}>
              <TextField
                fullWidth
                label="Слоган"
                size="small"
                value={getHeader().companyTagline ?? 'Будуємо ваше завтра – сьогодні.'}
                onChange={(e) => setHeaderField('companyTagline', e.target.value)}
                disabled={!canWrite}
              />
            </Box>
          </Box>

          <Box sx={{ minWidth: 360 }}>
            <Stack direction="row" spacing={1}>
              <TextField
                fullWidth
                label="Сайт"
                size="small"
                value={getHeader().companySite ?? 'buduy.lviv'}
                onChange={(e) => setHeaderField('companySite', e.target.value)}
                disabled={!canWrite}
              />
              <TextField
                fullWidth
                label="Телефон"
                size="small"
                value={getHeader().companyPhone ?? ''}
                onChange={(e) => setHeaderField('companyPhone', e.target.value)}
                disabled={!canWrite}
              />
            </Stack>
            <Box mt={1}>
              <TextField
                fullWidth
                label="Email"
                size="small"
                value={getHeader().companyEmail ?? ''}
                onChange={(e) => setHeaderField('companyEmail', e.target.value)}
                disabled={!canWrite}
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ background: '#fff', borderTop: '1px solid #2b2b2b', p: 1.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={800} mb={1}>
                Обʼєкт
              </Typography>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  label="Назва/код обʼєкта"
                  size="small"
                  value={getHeader().objectName ?? ''}
                  onChange={(e) => setHeaderField('objectName', e.target.value)}
                  disabled={!canWrite}
                />
                <TextField
                  fullWidth
                  label="Адреса"
                  size="small"
                  value={getHeader().objectAddress ?? ''}
                  onChange={(e) => setHeaderField('objectAddress', e.target.value)}
                  disabled={!canWrite}
                />
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    label="№ акту"
                    size="small"
                    value={getHeader().actNo ?? String(act.id)}
                    onChange={(e) => setHeaderField('actNo', e.target.value)}
                    disabled={!canWrite}
                  />
                  <TextField
                    fullWidth
                    label="Період з"
                    size="small"
                    value={getHeader().periodFrom ?? ''}
                    onChange={(e) => setHeaderField('periodFrom', e.target.value)}
                    disabled={!canWrite}
                    placeholder="YYYY-MM-DD"
                  />
                  <TextField
                    fullWidth
                    label="по"
                    size="small"
                    value={getHeader().periodTo ?? ''}
                    onChange={(e) => setHeaderField('periodTo', e.target.value)}
                    disabled={!canWrite}
                    placeholder="YYYY-MM-DD"
                  />
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={800} mb={1}>
                Підрядник
              </Typography>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  label="Назва"
                  size="small"
                  value={getHeader().contractorName ?? ''}
                  onChange={(e) => setHeaderField('contractorName', e.target.value)}
                  disabled={!canWrite}
                />
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    label="Код ЄДРПОУ"
                    size="small"
                    value={getHeader().contractorCode ?? ''}
                    onChange={(e) => setHeaderField('contractorCode', e.target.value)}
                    disabled={!canWrite}
                  />
                  <TextField
                    fullWidth
                    label="IBAN"
                    size="small"
                    value={getHeader().contractorIban ?? ''}
                    onChange={(e) => setHeaderField('contractorIban', e.target.value)}
                    disabled={!canWrite}
                  />
                </Stack>
                <TextField
                  fullWidth
                  label="Банк"
                  size="small"
                  value={getHeader().contractorBank ?? ''}
                  onChange={(e) => setHeaderField('contractorBank', e.target.value)}
                  disabled={!canWrite}
                />
                <TextField
                  fullWidth
                  label="Адреса"
                  size="small"
                  value={getHeader().contractorAddress ?? ''}
                  onChange={(e) => setHeaderField('contractorAddress', e.target.value)}
                  disabled={!canWrite}
                />
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    label="Телефон"
                    size="small"
                    value={getHeader().contractorPhone ?? ''}
                    onChange={(e) => setHeaderField('contractorPhone', e.target.value)}
                    disabled={!canWrite}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    size="small"
                    value={getHeader().contractorEmail ?? ''}
                    onChange={(e) => setHeaderField('contractorEmail', e.target.value)}
                    disabled={!canWrite}
                  />
                </Stack>
              </Stack>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={800} mb={1}>
                Замовник
              </Typography>
              <Stack spacing={1}>
                <TextField
                  fullWidth
                  label="ПІБ / Назва"
                  size="small"
                  value={getHeader().customerName ?? ''}
                  onChange={(e) => setHeaderField('customerName', e.target.value)}
                  disabled={!canWrite}
                />
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    label="Код / ІПН"
                    size="small"
                    value={getHeader().customerCode ?? ''}
                    onChange={(e) => setHeaderField('customerCode', e.target.value)}
                    disabled={!canWrite}
                  />
                  <TextField
                    fullWidth
                    label="Паспорт"
                    size="small"
                    value={getHeader().customerPassport ?? ''}
                    onChange={(e) => setHeaderField('customerPassport', e.target.value)}
                    disabled={!canWrite}
                  />
                </Stack>
                <TextField
                  fullWidth
                  label="Адреса"
                  size="small"
                  value={getHeader().customerAddress ?? ''}
                  onChange={(e) => setHeaderField('customerAddress', e.target.value)}
                  disabled={!canWrite}
                />
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    label="Телефон"
                    size="small"
                    value={getHeader().customerPhone ?? ''}
                    onChange={(e) => setHeaderField('customerPhone', e.target.value)}
                    disabled={!canWrite}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    size="small"
                    value={getHeader().customerEmail ?? ''}
                    onChange={(e) => setHeaderField('customerEmail', e.target.value)}
                    disabled={!canWrite}
                  />
                </Stack>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Box>

      <Stack direction="row" spacing={1} mb={1}>
        <Button size="small" variant="outlined" disabled={!canWrite} onClick={insertSection}>
          Додати секцію
        </Button>
        <Button size="small" variant="outlined" disabled={!canWrite} onClick={() => insertPercent()}>
          Додати %
        </Button>
        <Button size="small" variant="outlined" disabled={!canWrite} onClick={insertWorkRow}>
          Додати рядок
        </Button>
      </Stack>

      {/* Таблиця (sheet-style grid) */}
      <Box sx={{ border: `1px solid ${SHEET_OUTLINE_COLOR}`, borderRadius: 1, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', background: SHEET_HEADER_BG_SOFT, borderBottom: `1px solid ${SHEET_OUTLINE_COLOR}` }}>
          {COLS.map((c) => (
            <Box
              key={c.key}
              sx={{
                width: c.w,
                p: 1,
                fontWeight: 700,
                fontSize: 12,
                borderRight: `1px solid ${SHEET_OUTLINE_COLOR}`,
                textAlign: c.align ?? 'left',
              }}
            >
              {c.label}
            </Box>
          ))}
        </Box>

        {rows.map((row, i) => {
            if (row.rowType === 'meta') return null;
            if (row.rowType === 'section') {
              return (
                <Box key={i} sx={{ display: 'flex', background: SHEET_SECTION_BG, borderBottom: `1px solid ${SHEET_OUTLINE_COLOR}` }}>
                  <Box sx={{ p: 1, fontWeight: 800, width: COLS.reduce((s, c) => s + c.w, 0) }}>
                    {row.title}
                  </Box>
                </Box>
              );
            }

            const bg = row.rowType === 'subtotal' ? SHEET_SUBTOTAL_BG : '#fff';

            return (
              <Box key={i} sx={{ display: 'flex', borderBottom: `1px solid ${SHEET_OUTLINE_COLOR}`,
                background: bg }}>
                {COLS.map((c) => {
                  const rIndex = i;
                  const gridRi = actualToGrid.get(rIndex) ?? null;
                  const isActive = gridRi !== null && activeCell?.r === gridRi && activeCell?.c === (c.key as any);
                  const ci = GRID_COLS.indexOf(c.key as any);
                  const isSelected = gridRi !== null && selNorm ? isInRange(gridRi, ci, selNorm) : false;

                  const editable = canEditCell(row, c.key) && canWrite;
                  const val =
                    row.rowType === 'subtotal'
                      ? (c.key === 'name' ? row.title ?? '' : c.key === 'amount' ? fmtMoney(row.amount) : c.key === 'amountCost' ? fmtMoney(row.amountCost) : '')
                      : row.rowType === 'percent'
                        ? (c.key === 'name'
                            ? String(row.name ?? '')
                            : c.key === 'unit'
                              ? '%'
                              : c.key === 'qty'
                                ? fmtMoney(row.percentValue)
                                : c.key === 'amount'
                                  ? fmtMoney(row.amount)
                                  : '')
                        : (c.key === 'amount' || c.key === 'amountCost')
                          ? fmtMoney((row as any)[c.key])
                          : String((row as any)[c.key] ?? '');

                  return (
                    <Box
                      key={c.key}
                      onDoubleClick={() => {
                        if (gridRi !== null) openEditor(gridRi, c.key as any);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (gridRi !== null) {
                          beginMouseSelection(gridRi, c.key as any);
                          requestAnimationFrame(() => gridRef.current?.focus());
                        }
                      }}
                      onMouseEnter={() => {
                        if (gridRi !== null) {
                          extendMouseSelection(gridRi, c.key as any);
                        }
                        if (dragFill && dragFill.col === (c.key as any) && gridRi !== null && gridRi >= dragFill.startR) {
                          setDragFill({ ...dragFill, endR: gridRi });
                        }
                      }}
                      sx={{
                        width: c.w,
                        p: 1,
                        fontSize: 12,
                        borderRight: `1px solid ${SHEET_GRID_COLOR_SOFT}`,
                        textAlign: c.align ?? 'left',
                        outline: isActive ? '2px solid #1e6f5c' : 'none',
                        backgroundColor: isSelected ? 'rgba(26,115,232,0.10)' : bg,

                        cursor: editable ? 'text' : 'default',
                        userSelect: 'none',
                        position: 'relative',
                      }}
                      title={editable ? 'Подвійний клік для редагування' : ''}
                    >
                                            {val}
                      {isActive && editable && (c.key === 'qty' || c.key === 'price' || c.key === 'costPrice' || c.key === 'name' || c.key === 'unit') && (
                        <Box
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (gridRi !== null) startFill(gridRi, c.key as any);
                          }}
                          sx={{
                            position: 'absolute',
                            right: 2,
                            bottom: 2,
                            width: 8,
                            height: 8,
                            border: '1px solid #1e6f5c',
                            background: '#1e6f5c',
                            cursor: 'crosshair',
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            );
          })}
      </Box>

<Stack direction="row" justifyContent="flex-end" spacing={2} mt={2}>
        <Typography fontWeight={800}>Загальна сума: {fmtMoney(totals.totalAmount)} грн</Typography>
      </Stack>

      {/* Overlay editor (bottom, fixed; does not shift layout) */}
      {editor && (
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 24,
            display: 'flex',
            justifyContent: 'center',
            zIndex: 1300,
          }}
        >
          <Box sx={{ width: 860, background: '#fff', border: '1px solid #d0d0d0', borderRadius: 2, p: 1.5, boxShadow: 6 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography sx={{ width: 120, fontSize: 12, color: '#333' }}>Редагування</Typography>
              <TextField
                fullWidth
                inputRef={editorInputRef}
                size="small"
                value={editorValue}
                onChange={(e) => setEditorValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitEditor('down');
                  }
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    commitEditor(e.shiftKey ? 'none' : 'right');
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    closeEditor();
                  }
                }}
              />
              <Button variant="contained" onClick={() => commitEditor('none')}>
                OK
              </Button>
              <Button variant="text" onClick={closeEditor}>
                Скасувати
              </Button>
            </Stack>
          </Box>
        </Box>
      )}
      {/* Save indicator (shared; fixed; does not shift layout) */}
      <SaveIndicatorChip state={saving} />

    </Box>

  );
}