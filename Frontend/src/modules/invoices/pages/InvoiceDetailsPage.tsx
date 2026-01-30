import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Checkbox,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import SaveIndicatorChip from '../../shared/sheet/SaveIndicatorChip';

import AddIcon from '@mui/icons-material/Add';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import TableViewOutlinedIcon from '@mui/icons-material/TableViewOutlined';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { useAuth } from '../../auth/context/AuthContext';

import api from '../../../api/api';
import { getObjects, type ObjectDto } from '../../../api/objects';

import {
  getInvoice,
  downloadInvoicePdf,
  updateInvoice,
  type Id,
  type Invoice,
} from '../api/invoices.api';

import { getMaterials, type MaterialDto } from '../../../api/materials';

import {
  listAttachments,
  uploadAttachment,
  deleteAttachment,
  downloadAttachment,
} from '../../attachments/api/attachments.api';
import type { Attachment } from '../../attachments/types/attachment.types';

import buduyLogoUrl from '../../../assets/buduy-logo.svg?url';
import { COMPANY } from '../../../config/company';
import { exportInvoiceXlsx } from '../../../utils/xlsxExport';



import { cleanNumInput, f2, formatFixed, n } from '../../shared/sheet/utils';
import {
  SHEET_GRID_COLOR_SOFT,
  SHEET_GOOGLE_BORDER,
  SHEET_GOOGLE_HEADER_BORDER,
  SHEET_HEADER_BG,
} from '../../shared/sheet/constants';

import { Sheet, invoiceSheetConfig, draftKey } from '../../../sheet';

import {
  type SheetRange,
  clamp,
  normalizeRange,
  isInRange,
  copyRangeToClipboard,
  applyTsvPasteToRows,
  forEachCellInRange,
  handleSheetsGridKeyDown,
  useSheetSelection,
} from '../../shared/sheet/engine';
type InvoiceItemRow = {
  id: number;
  materialId?: number;
  name?: string;
  unit?: string;
  qty?: string;
  supplierPrice?: string;
  clientPrice?: string;
  amountSupplier?: string;
  amountClient?: string;
};

// numeric helpers are centralized in shared/sheet/utils.ts

function safeFilePart(v: string): string {
  return String(v || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .slice(0, 60);
}

const INVOICE_STATUSES = ['draft', 'sent', 'paid'] as const;
type InvoiceStatus = (typeof INVOICE_STATUSES)[number] | string;

type WarehouseLike = { id: number; name: string };

function statusLabel(s: string): string {
  switch (s) {
    case 'draft':
      return 'Чернетка';
    case 'sent':
      return 'Відправлено';
    case 'paid':
      return 'Оплачено';
    default:
      return s;
  }
}

function statusColor(s: string): 'default' | 'info' | 'success' | 'warning' {
  switch (s) {
    case 'draft':
      return 'default';
    case 'sent':
      return 'info';
    case 'paid':
      return 'success';
    default:
      return 'warning';
  }
}

function normalizeItem(it: any, fallbackId: number): InvoiceItemRow {
  const qty = it?.qty ?? '';
  const supplierPrice = it?.supplierPrice ?? '';
  const clientPrice = it?.clientPrice ?? '';

  const qn = n(qty);
  const sp = n(supplierPrice);
  const cp = n(clientPrice);
  const amountSupplier = it?.amountSupplier ?? (qn && sp ? f2(qn * sp) : '');
  const amountClient = it?.amountClient ?? (qn && cp ? f2(qn * cp) : '');

  return {
    id: Number.isFinite(Number(it?.id)) ? Number(it?.id) : fallbackId,
    materialId: Number.isFinite(Number(it?.materialId)) ? Number(it?.materialId) : undefined,
    name: it?.materialName ?? it?.name ?? '',
    unit: it?.unit ?? '',
    qty: String(qty ?? ''),
    supplierPrice: String(supplierPrice ?? ''),
    clientPrice: String(clientPrice ?? ''),
    amountSupplier: String(amountSupplier ?? ''),
    amountClient: String(amountClient ?? ''),
  };
}

function toApiItems(rows: InvoiceItemRow[]) {
  // Зберігаємо JSONB у мінімально необхідному форматі.
  return rows.map((r) => {
    const qn = n(r.qty);
    const sp = n(r.supplierPrice);
    const cp = n(r.clientPrice);

    const amountSupplier = r.amountSupplier?.trim()
      ? r.amountSupplier
      : qn && sp
        ? f2(qn * sp)
        : '0';
    const amountClient = r.amountClient?.trim()
      ? r.amountClient
      : qn && cp
        ? f2(qn * cp)
        : '0';

    return {
      materialId: r.materialId ?? null,
      name: r.name ?? '',
      unit: r.unit ?? '',
      qty: String(r.qty ?? ''),
      supplierPrice: String(r.supplierPrice ?? ''),
      clientPrice: String(r.clientPrice ?? ''),
      amountSupplier: String(amountSupplier ?? '0'),
      amountClient: String(amountClient ?? '0'),
    };
  });
}

export default function InvoiceDetailsPage() {
  const { id } = useParams();
  const invoiceId = Number(id ?? '');
  const navigate = useNavigate();

  const { can } = useAuth();
  const canWrite = can('supply:write');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [attUploading, setAttUploading] = useState(false);
  const [attError, setAttError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [invoice, setInvoice] = useState<Invoice | null>(null);

  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  const [supplierName, setSupplierName] = useState('');
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [rows, setRows] = useState<InvoiceItemRow[]>([]);

  // internal invoices (warehouse in/out)
  const [invoiceType, setInvoiceType] = useState<'external' | 'internal'>('external');
  const [internalDirection, setInternalDirection] = useState<'IN' | 'OUT'>('IN');
  const [invoiceWarehouse, setInvoiceWarehouse] = useState<WarehouseLike | null>(null);

  // ===== Invoice → Warehouse (server draft) =====
  const canWarehouseRead = can('warehouse:read');
  const canWarehouseWrite = can('warehouse:write');

  const [warehouses, setWarehouses] = useState<WarehouseLike[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseLike | null>(null);
  const [objectName, setObjectName] = useState('');
  const [pushToWarehouseLoading, setPushToWarehouseLoading] = useState(false);
  const [pushToWarehouseError, setPushToWarehouseError] = useState<string | null>(null);

  // === Sheets-like range selection (STEP 1.6) ===
  type ColKey = 'name' | 'unit' | 'qty' | 'supplierPrice' | 'amountSupplier' | 'clientPrice' | 'amountClient';
  const COLS: ColKey[] = ['name', 'unit', 'qty', 'supplierPrice', 'amountSupplier', 'clientPrice', 'amountClient'];

  // === STEP 1.7–1.9: Google-Sheets-like UX polish ===
  // Column metadata (labels + default widths) + lightweight column resizing.
  const COL_META: { key: ColKey; label: string; defaultWidth: number; align?: 'left' | 'center' | 'right' }[] = [
    { key: 'name', label: 'Найменування', defaultWidth: 320, align: 'left' },
    { key: 'unit', label: 'Од.', defaultWidth: 90, align: 'center' },
    { key: 'qty', label: 'К-сть', defaultWidth: 110, align: 'right' },
    { key: 'supplierPrice', label: 'Ціна пост.', defaultWidth: 130, align: 'right' },
    { key: 'amountSupplier', label: 'Сума пост.', defaultWidth: 140, align: 'right' },
    { key: 'clientPrice', label: 'Ціна клієнт', defaultWidth: 130, align: 'right' },
    { key: 'amountClient', label: 'Сума клієнт', defaultWidth: 140, align: 'right' },
  ];

  const colStorageKey = useMemo(() => `invoice:grid:colwidths:${invoiceId}`, [invoiceId]);
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>(() => {
    try {
      const raw = localStorage.getItem(colStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const out: any = {};
        for (const k of COLS) out[k] = Math.max(60, Number(parsed?.[k] ?? 0) || COL_META.find((m) => m.key === k)?.defaultWidth || 120);
        return out;
      }
    } catch {
      // ignore
    }
    const out: any = {};
    for (const m of COL_META) out[m.key] = m.defaultWidth;
    return out;
  });

  useEffect(() => {
    try {
      localStorage.setItem(colStorageKey, JSON.stringify(colWidths));
    } catch {
      // ignore
    }
  }, [colWidths, colStorageKey]);

  const resizingRef = useRef<{ key: ColKey; startX: number; startW: number } | null>(null);

  useEffect(() => {
    function onMove(ev: MouseEvent) {
      const r = resizingRef.current;
      if (!r) return;
      const dx = ev.clientX - r.startX;
      setColWidths((prev) => {
        const next = { ...prev };
        const w = Math.max(80, Math.round(r.startW + dx));
        next[r.key] = w;
        return next;
      });
    }

    function onUp() {
      resizingRef.current = null;
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  function startResize(key: ColKey, ev: React.MouseEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    const th = ev.currentTarget.parentElement as HTMLElement | null;
    const startW = colWidths[key] ?? (th ? th.getBoundingClientRect().width : 140);
    resizingRef.current = { key, startX: ev.clientX, startW };
  }

  // Formula bar (optional editing surface, closer to Google Sheets).
  const [formulaValue, setFormulaValue] = useState('');
  const [formulaDirty, setFormulaDirty] = useState(false);
  const [formulaHasFocus, setFormulaHasFocus] = useState(false);

  const gridRef = useRef<HTMLDivElement | null>(null);

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
  } = useSheetSelection<ColKey>(COLS);

  // Minimal undo/redo for committed edits (blur/enter/paste).
  type UndoAction = { rowId: number; col: ColKey; prev: string; next: string };
  const undoRef = useRef<UndoAction[]>([]);
  const redoRef = useRef<UndoAction[]>([]);

  // === STEP 2.x: Overlay editor (single input) + Fill-handle (Sheets-like) ===
  const [editor, setEditor] = useState<{ r: number; c: ColKey } | null>(null);
  const [editorValue, setEditorValue] = useState<string>('');
  const editorInputRef = useRef<HTMLInputElement | null>(null);

  const [overlayRect, setOverlayRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const [isFilling, setIsFilling] = useState(false);
  const fillTargetRef = useRef<{ r: number; c: ColKey } | null>(null);
  const fillBaseRef = useRef<{ r: number; c: ColKey; value: string; series: boolean } | null>(null);

  function isCellEditable(col: ColKey) {
    return canEdit && !isLocked; // узгоджено з поточними правилами
  }

  function getCellEl(ri: number, col: ColKey): HTMLElement | null {
    const host = gridRef.current;
    if (!host) return null;
    return host.querySelector(`[data-cell="1"][data-ri="${ri}"][data-col="${col}"]`) as HTMLElement | null;
  }

  function computeOverlayRect(ri: number, col: ColKey) {
    const host = gridRef.current;
    const el = getCellEl(ri, col);
    if (!host || !el) return null;
    const hostRect = host.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top - hostRect.top + host.scrollTop),
      left: Math.round(r.left - hostRect.left + host.scrollLeft),
      width: Math.round(r.width),
      height: Math.round(r.height),
    };
  }

  function openEditor(ri: number, col: ColKey, initial?: { replace: boolean; ch?: string }) {
    if (!isCellEditable(col)) return;

    selectCell(ri, col);

    if (col !== 'name') {
      const row = rows[ri];
      const current = row ? String(getCellValue(row, col) ?? '') : '';
      const next = initial?.replace ? String(initial?.ch ?? '') : current;
      setEditorValue(next);
    }

    setEditor({ r: ri, c: col });
    setOverlayRect(computeOverlayRect(ri, col));

    requestAnimationFrame(() => {
      if (editorInputRef.current) {
        editorInputRef.current.focus();
        editorInputRef.current.select?.();
      }
    });
  }

  function closeEditor() {
    setEditor(null);
    setOverlayRect(null);
  }

  function commitEditor(move: 'none' | 'down' | 'right' = 'none') {
    if (!editor) return;
    const { r, c } = editor;
    const row = rows[r];
    if (!row) {
      closeEditor();
      return;
    }

    if (c !== 'name') {
      const prev = String(getCellValue(row, c) ?? '');
      const next = String(editorValue ?? '');
      if (prev !== next) {
        pushUndo({ rowId: row.id, col: c, prev, next });
        redoRef.current = [];
        setCellValue(row.id, c, next);
      }
    }

    closeEditor();

    if (move === 'down') {
      const nr = Math.min(Math.max(0, rows.length - 1), r + 1);
      selectCell(nr, c);
    } else if (move === 'right') {
      const ci = COLS.indexOf(c);
      const nc = Math.min(COLS.length - 1, ci + 1);
      const nk = COLS[nc];
      selectCell(r, nk);
    }
  }

  useEffect(() => {
    const host = gridRef.current;
    if (!host) return;
    function upd() {
      if (!editor) return;
      setOverlayRect(computeOverlayRect(editor.r, editor.c));
    }
    host.addEventListener('scroll', upd);
    window.addEventListener('resize', upd);
    return () => {
      host.removeEventListener('scroll', upd);
      window.removeEventListener('resize', upd);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    if (!activeCell) return;
    if (editor.r !== activeCell.r || editor.c !== activeCell.c) {
      closeEditor();
    }
  }, [activeCell?.r, activeCell?.c, editor]);


  useEffect(() => {
    if (!isFilling) return;

    function onMove(ev: MouseEvent) {
      const host = gridRef.current;
      if (!host) return;

      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const cell = el?.closest?.('[data-cell="1"]') as HTMLElement | null;
      if (!cell) return;

      const ri = Number(cell.getAttribute('data-ri') ?? '');
      const col = (cell.getAttribute('data-col') ?? '') as ColKey;
      const base = fillBaseRef.current;
      if (!base) return;

      if (!Number.isFinite(ri)) return;

      // Sheets-like: fill either DOWN (same column) or RIGHT (same row)
      // We choose axis based on where the pointer lands.
      const sameCol = col === base.c;
      const sameRow = ri === base.r;
      if (!sameCol && !sameRow) return;

      fillTargetRef.current = { r: ri, c: col };

      const c1 = COLS.indexOf(base.c);
      const c2 = COLS.indexOf(col);
      setSel({
        r1: Math.min(base.r, ri),
        c1: Math.min(c1, c2),
        r2: Math.max(base.r, ri),
        c2: Math.max(c1, c2),
      });
    }

    function onUp() {
      const base = fillBaseRef.current;
      const tgt = fillTargetRef.current;
      setIsFilling(false);

      if (!base || !tgt) {
        fillBaseRef.current = null;
        fillTargetRef.current = null;
        return;
      }

      const isDown = tgt.c === base.c;
      const isRight = tgt.r === base.r;

      // normalize base value from latest state
      setRows((prev) => {
        const extended = [...prev];

        // For DOWN fill: ensure enough rows exist
        if (isDown) {
          const start = Math.min(base.r, tgt.r);
          const end = Math.max(base.r, tgt.r);
          if (extended.length < end + 1) {
            let maxId = extended.reduce((mm, rr) => Math.max(mm, Number(rr.id) || 0), 0);
            while (extended.length < end + 1) {
              maxId += 1;
              extended.push(recompute({ id: maxId, name: '', unit: '', qty: '', supplierPrice: '', clientPrice: '', amountSupplier: '', amountClient: '' } as any));
            }
          }

          const baseRow = extended[base.r];
          const baseVal = baseRow ? String(getCellValue(baseRow, base.c) ?? '') : base.value;
          const baseNum = n(baseVal);
          const baseIsNum = String(baseVal ?? '').trim() !== '' && Number.isFinite(baseNum);

          const next = extended.map((row, idx) => {
            if (idx < start || idx > end) return row;
            if (idx === base.r) return row;

            const prevVal = String(getCellValue(row, base.c) ?? '');
            let nextVal = baseVal;

            // Ctrl/Meta → numeric series (+1)
            if (base.series && baseIsNum) {
              const step = idx > base.r ? (idx - base.r) : -(base.r - idx);
              nextVal = f2(baseNum + step);
            }

            if (prevVal !== nextVal) {
              pushUndo({ rowId: row.id, col: base.c, prev: prevVal, next: nextVal });
            }

            if (base.c === 'name') {
              return recompute({ ...row, name: nextVal, materialId: undefined });
            }
            return recompute({ ...row, [base.c]: nextVal } as any);
          });
          return next;
        }

        // For RIGHT fill: apply across columns within the same row
        if (isRight) {
          const row = extended[base.r];
          if (!row) return prev;

          const cStart = Math.min(COLS.indexOf(base.c), COLS.indexOf(tgt.c));
          const cEnd = Math.max(COLS.indexOf(base.c), COLS.indexOf(tgt.c));

          const baseVal = String(getCellValue(row, base.c) ?? base.value);
          const baseNum = n(baseVal);
          const baseIsNum = String(baseVal ?? '').trim() !== '' && Number.isFinite(baseNum);

          const updated = { ...row } as any;
          for (let ci = cStart; ci <= cEnd; ci += 1) {
            const colKey = COLS[ci];
            if (colKey === base.c) continue;
            const prevVal = String(getCellValue(row, colKey) ?? '');
            let nextVal = baseVal;
            if (base.series && baseIsNum) {
              const step = ci > COLS.indexOf(base.c) ? (ci - COLS.indexOf(base.c)) : -(COLS.indexOf(base.c) - ci);
              nextVal = f2(baseNum + step);
            }
            if (prevVal !== nextVal) {
              pushUndo({ rowId: row.id, col: colKey, prev: prevVal, next: nextVal });
            }
            if (colKey === 'name') {
              updated.name = nextVal;
              updated.materialId = undefined;
            } else {
              updated[colKey] = nextVal;
            }
          }
          extended[base.r] = recompute(updated);
          return extended;
        }

        return prev;
      });

      fillBaseRef.current = null;
      fillTargetRef.current = null;
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isFilling, rows]);


  function pushUndo(a: UndoAction) {
    undoRef.current.push(a);
    if (undoRef.current.length > 120) undoRef.current.shift();
    redoRef.current = [];
  }

  const editStartRef = useRef<Map<string, string>>(new Map());
  function cellKey(rowId: number, col: ColKey) {
    return `${rowId}:${col}`;
  }

  function colLetter(idx: number) {
    // 0 -> A
    const A = 'A'.charCodeAt(0);
    return String.fromCharCode(A + idx);
  }

  function activeCellLabel() {
    if (!activeCell) return '';
    const ci = COLS.indexOf(activeCell.c);
    return `${colLetter(ci)}${activeCell.r + 1}`;
  }

  function beginEdit(rowId: number, col: ColKey, current: unknown) {
    const k = cellKey(rowId, col);
    if (!editStartRef.current.has(k)) editStartRef.current.set(k, String(current ?? ''));
  }

  function endEdit(rowId: number, col: ColKey, next: unknown) {
    const k = cellKey(rowId, col);
    const prev = editStartRef.current.get(k);
    if (prev === undefined) return;
    editStartRef.current.delete(k);
    const n = String(next ?? '');
    if (prev !== n) {
      pushUndo({ rowId, col, prev, next: n });
    }
  }

  function commitFormula(moveDelta: -1 | 0 | 1) {
    if (!activeCell) return;
    const row = rows[activeCell.r];
    if (!row) return;
    const prev = String(getCellValue(row, activeCell.c) ?? '');
    const next = String(formulaValue ?? '');
    if (prev !== next) {
      pushUndo({ rowId: row.id, col: activeCell.c, prev, next });
      setCellValue(row.id, activeCell.c, next);
    }
    setFormulaHasFocus(false);
    setFormulaDirty(false);
    if (moveDelta !== 0) {
      const nr = Math.max(0, Math.min(rows.length - 1, activeCell.r + moveDelta));
      setActiveCell({ r: nr, c: activeCell.c });
    }
  }

  useEffect(() => {
    if (!activeCell) {
      if (!formulaHasFocus) {
        setFormulaValue('');
        setFormulaDirty(false);
      }
      return;
    }
    if (formulaHasFocus || formulaDirty) return;
    const row = rows[activeCell.r];
    if (!row) return;
    setFormulaValue(String(getCellValue(row, activeCell.c) ?? ''));
  }, [activeCell?.r, activeCell?.c, rows, formulaHasFocus, formulaDirty]);


  // clamp/normalizeRange/isInRange are shared (KP is the source of truth)

  function cellSx(ri: number, col: ColKey) {
    const ci = COLS.indexOf(col);
    const isActive = activeCell?.r === ri && activeCell?.c === col;
    const isSelected = isInRange(ri, ci, sel);

    const bg = isSelected
      ? 'rgba(26,115,232,0.10)'
      : isActive
        ? 'rgba(232,240,254,1)'
        : '#fff';

    return {
      // Google-Sheets-like cell chrome
      p: 0,
      px: 0.75,
      height: 32,
      borderRight: `1px solid ${SHEET_GOOGLE_HEADER_BORDER}`,
      borderBottom: `1px solid ${SHEET_GOOGLE_HEADER_BORDER}`,
      verticalAlign: 'middle',
      backgroundColor: bg,
      fontSize: 13,
      lineHeight: '20px',
      '&:hover': {
        backgroundColor: isSelected ? 'rgba(26,115,232,0.10)' : 'rgba(60,64,67,0.04)',
      },
      ...(isActive ? { outline: '2px solid rgba(26,115,232,0.95)', outlineOffset: '-2px' } : null),
    };
  }

  function startSel(ri: number, col: ColKey) {
    beginMouseSelection(ri, col);
    requestAnimationFrame(() => gridRef.current?.focus());
  }

  function extendSel(ri: number, col: ColKey) {
    extendMouseSelection(ri, col);
  }

  function getCellValue(row: InvoiceItemRow, col: ColKey): string {
    switch (col) {
      case 'name': return String(row.name ?? '');
      case 'unit': return String(row.unit ?? '');
      case 'qty': return String(row.qty ?? '');
      case 'supplierPrice': return String(row.supplierPrice ?? '');
      case 'amountSupplier': return String(row.amountSupplier ?? '');
      case 'clientPrice': return String(row.clientPrice ?? '');
      case 'amountClient': return String(row.amountClient ?? '');
      default: return '';
    }
  }

  function setCellValue(rowId: number, col: ColKey, value: string) {
    if (col === 'name') {
      updateRow(rowId, { name: value, materialId: undefined });
      return;
    }
    updateRow(rowId, { [col]: value } as any);
  }

  function ensureRowsCount(minCount: number) {
    setRows((prev) => {
      if (prev.length >= minCount) return prev;
      const next = [...prev];
      let maxId = next.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
      while (next.length < minCount) {
        maxId += 1;
        next.push({ id: maxId, name: '', unit: '', qty: '', supplierPrice: '', clientPrice: '', amountSupplier: '', amountClient: '' });
      }
      return next;
    });
  }

  function copySelectionToClipboard() {
    if (!sel || rows.length === 0) return;
    void copyRangeToClipboard(rows, COLS, sel, getCellValue);
  }

  function clearSelectionCells() {
    if (!sel) return;
    const s = normalizeRange(sel);
    forEachCellInRange(s, COLS, (ri, _ci, col) => {
      const row = rows[ri];
      if (!row) return;
      if (col === 'name') updateRow(row.id, { name: '', materialId: undefined });
      else updateRow(row.id, { [col]: '' } as any);
    });
  }

  function pasteTsv(startR: number, startC: number, tsv: string) {
    setRows((prev) =>
      applyTsvPasteToRows(prev, {
        startR,
        startC,
        tsv,
        cols: COLS,
        ensureRowAt: (rowsArg, targetIndex) => {
          let next = rowsArg;
          if (targetIndex < 0) return { rows: next, index: targetIndex };
          if (targetIndex >= next.length) {
            let maxId = next.reduce((m, r) => Math.max(m, Number((r as any).id) || 0), 0);
            const nn = [...next];
            while (nn.length <= targetIndex) {
              maxId += 1;
              nn.push({
                id: maxId,
                name: '',
                unit: '',
                qty: '',
                supplierPrice: '',
                clientPrice: '',
                amountSupplier: '',
                amountClient: '',
              } as any);
            }
            next = nn as any;
          }
          return { rows: next, index: targetIndex };
        },
        normalizeValue: (col, raw) => {
          return col !== 'name' && col !== 'unit' ? cleanNumInput(raw) : raw;
        },
        setCell: (row, col, value) => {
          if (col === 'name') return { ...(row as any), name: value, materialId: undefined };
          return { ...(row as any), [col]: value } as any;
        },
        afterRow: (row) => recompute(row as any) as any,
      }),
    );
  }


  function handleGridKeyDown(e: React.KeyboardEvent) {
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
      cols: COLS,
      rowsCount: rows.length,
      sel,
      setSel,
      copySelectionToClipboard,
      clearSelectionCells,
      undo: () => {
        const a = undoRef.current.pop();
        if (a) {
          redoRef.current.push(a);
          setCellValue(a.rowId, a.col, a.prev);
          const rr = rows.findIndex((x) => x.id === a.rowId);
          setActiveCell({ r: rr, c: a.col });
          setAnchor({ r: rr, c: COLS.indexOf(a.col) });
        }
      },
      redo: () => {
        const a = redoRef.current.pop();
        if (a) {
          undoRef.current.push(a);
          setCellValue(a.rowId, a.col, a.next);
          const rr = rows.findIndex((x) => x.id === a.rowId);
          setActiveCell({ r: rr, c: a.col });
          setAnchor({ r: rr, c: COLS.indexOf(a.col) });
        }
      },
    });
  }

  function handleGridPaste(e: React.ClipboardEvent) {
    if (!canEdit) return;
    const txt = e.clipboardData.getData('text');
    if (!txt) return;
    if (!activeCell && !sel) return;

    e.preventDefault();
    const s = sel ? normalizeRange(sel) : null;
    const startR = s ? s.r1 : (activeCell?.r ?? 0);
    const startC = s ? s.c1 : COLS.indexOf(activeCell!.c);
    pasteTsv(startR, startC, txt);
  }

  // Автозбереження (тільки для draft)
  const lastSavedRef = useRef<string>('');
  const autosaveTimerRef = useRef<number | null>(null);
  const [dirty, setDirty] = useState(false);

  const isLocked = String(status) !== 'draft';
  const canEdit = canWrite && !isLocked;

  async function loadMaterials() {
    setMaterialsLoading(true);
    try {
      const mats = await getMaterials();
      // показуємо активні першими
      const sorted = [...mats].sort((a, b) => {
        const aa = a?.isActive === false ? 1 : 0;
        const bb = b?.isActive === false ? 1 : 0;
        if (aa !== bb) return aa - bb;
        return String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'uk');
      });
      setMaterials(sorted);
    } catch {
      // не блокуємо роботу накладних — просто залишаємо список порожнім
      setMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  }

  async function loadWarehouses() {
    if (!canWarehouseRead) {
      setWarehouses([]);
      setSelectedWarehouse(null);
      return;
    }

    setWarehousesLoading(true);
    try {
      const res = await api.get<any>('/warehouses');
      const data = res.data;
      const list: WarehouseLike[] = Array.isArray(data)
        ? (data as WarehouseLike[])
        : Array.isArray(data?.items)
          ? (data.items as WarehouseLike[])
          : Array.isArray(data?.data)
            ? (data.data as WarehouseLike[])
            : [];

      const sorted = [...list].sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'uk'));
      setWarehouses(sorted);

      // default selection
      setSelectedWarehouse((prev) => {
        if (prev && sorted.some((w) => w.id === prev.id)) return prev;
        return sorted[0] ?? null;
      });
    } catch (e) {
      setWarehouses([]);
      setSelectedWarehouse(null);
    } finally {
      setWarehousesLoading(false);
    }
  }

  async function load() {
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
      setError('Некоректний id накладної');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const inv = await getInvoice(invoiceId as Id);
      setInvoice(inv);

      // attachments
      setAttError(null);
      setAttLoading(true);
      try {
        const atts = await listAttachments({ entityType: 'invoice', entityId: Number(inv.id) });
        setAttachments(Array.isArray(atts) ? atts : []);
      } catch (e) {
        console.error(e);
        setAttachments([]);
        setAttError('Не вдалося завантажити список файлів. Спробуйте ще раз.');
      } finally {
        setAttLoading(false);
      }
      setSupplierName(String(inv.supplierName ?? ''));
      setInvoiceType(String((inv as any).type) === 'internal' ? 'internal' : 'external');
      setInternalDirection(String((inv as any).internalDirection) === 'OUT' ? 'OUT' : 'IN');
      setStatus((String(inv.status ?? 'draft') as InvoiceStatus) || 'draft');

      const raw = Array.isArray(inv.items) ? inv.items : [];
      const normalized = raw.map((it, idx) => normalizeItem(it, idx + 1));
      setRows(normalized.length ? normalized : []);

      // snapshot для автозбереження
      const snap = JSON.stringify({
        type: String((inv as any).type ?? 'external'),
        internalDirection: (inv as any).internalDirection ?? null,
        warehouseId: (inv as any).warehouseId ?? null,
        supplierName: String(inv.supplierName ?? ''),
        status: String(inv.status ?? 'draft'),
        items: toApiItems(normalized),
      });
      lastSavedRef.current = snap;
      setDirty(false);
    } catch (e: any) {
      setError(e?.response?.data?.message?.join?.('\n') || e?.message || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void loadMaterials();
    void loadWarehouses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  // when invoice + warehouses are loaded — resolve invoice's own warehouse
  useEffect(() => {
    if (!invoice) return;
    if (invoiceType !== 'internal') {
      setInvoiceWarehouse(null);
      return;
    }
    const wid = Number((invoice as any).warehouseId ?? 0);
    const w = warehouses.find((x) => Number(x.id) === wid) ?? null;
    setInvoiceWarehouse(w);
  }, [invoice, invoiceType, warehouses]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!invoice || !invoice.objectId) {
        setObjectName('');
        return;
      }

      try {
        const all = await getObjects();
        const name = all.find((o: ObjectDto) => Number(o?.id) === Number(invoice.objectId))?.name ?? '';
        if (!cancelled) setObjectName(String(name || ''));
      } catch {
        if (!cancelled) setObjectName('');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invoice?.objectId]);

  // Attachments helpers
  async function refreshAttachments() {
    if (!invoice) return;
    setAttLoading(true);
    setAttError(null);
    try {
      const atts = await listAttachments({ entityType: 'invoice', entityId: Number(invoice.id) });
      setAttachments(Array.isArray(atts) ? atts : []);
    } catch (e: any) {
      setAttError(e?.response?.data?.message || e?.message || 'Помилка завантаження файлів');
    } finally {
      setAttLoading(false);
    }
  }

  async function handleUploadAttachment(file: File) {
    if (!invoice) return;
    setAttUploading(true);
    setAttError(null);
    try {
      // uploadAttachment(meta, file)
      await uploadAttachment({ entityType: 'invoice', entityId: Number(invoice.id) }, file);
      await refreshAttachments();
    } catch (e: any) {
      setAttError(e?.response?.data?.message || e?.message || 'Помилка завантаження файлу');
    } finally {
      setAttUploading(false);
    }
  }

  async function handleDeleteAttachment(attId: number) {
    if (!invoice) return;
    setAttDeleting(attId);
    setAttError(null);
    try {
      await deleteAttachment(attId);
      await refreshAttachments();
    } catch (e: any) {
      setAttError(e?.response?.data?.message || e?.message || 'Помилка видалення файлу');
    } finally {
      setAttDeleting(null);
    }
  }

  async function handleDownloadAttachment(attId: number) {
    try {
      await downloadAttachment(attId);
    } catch (e: any) {
      setAttError(e?.response?.data?.message || e?.message || 'Помилка завантаження');
    }
  }
  const materialsById = useMemo(() => {
    const m = new Map<number, MaterialDto>();
    for (const x of materials) {
      if (Number.isFinite(Number(x?.id))) m.set(Number(x.id), x);
    }
    return m;
  }, [materials]);

  const totals = useMemo(() => {
    const supplier = rows.reduce((acc, r) => acc + n(r.amountSupplier), 0);
    const client = rows.reduce((acc, r) => acc + n(r.amountClient), 0);
    const profit = client - supplier;
    const marginPct = client > 0 ? (profit / client) * 100 : 0;

    return {
      supplier,
      client,
      profit,
      marginPct,
      supplierF: f2(supplier),
      clientF: f2(client),
      profitF: f2(profit),
      marginPctF: formatFixed(marginPct, 2),
    };
  }, [rows]);

  const currentSnapshot = useMemo(() => {
    const fallbackWarehouseId = Number((invoice as any)?.warehouseId ?? 0) || null;
    return JSON.stringify({
      type: invoiceType,
      internalDirection: invoiceType === 'internal' ? internalDirection : null,
      warehouseId: invoiceType === 'internal' ? (invoiceWarehouse?.id ?? fallbackWarehouseId) : null,
      supplierName: supplierName,
      status: String(status ?? ''),
      items: toApiItems(rows),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id, (invoice as any)?.warehouseId, invoiceType, internalDirection, invoiceWarehouse?.id, supplierName, status, rows]);

  useEffect(() => {
    const isDirty = currentSnapshot !== lastSavedRef.current;
    setDirty(isDirty);

    if (!invoice) return;
    if (!canEdit) return;
    if (String(status) !== 'draft') return;
    if (!isDirty) return;
    if (loading || saving) return;

    // debounce
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      void onSave({ silent: true });
    }, 800);

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSnapshot, invoice?.id, canEdit, status, loading, saving]);

  const savedTotals = useMemo(() => {
    if (!invoice) return null;
    const supplier = n((invoice as any).totalSupplier);
    const client = n((invoice as any).totalCustomer);
    const has = (invoice as any).totalSupplier != null || (invoice as any).totalCustomer != null;
    if (!has) return null;
    return {
      supplier,
      client,
      supplierF: f2(supplier),
      clientF: f2(client),
    };
  }, [invoice]);

  function recompute(r: InvoiceItemRow): InvoiceItemRow {
    const qn = n(r.qty);
    const sp = n(r.supplierPrice);
    const cp = n(r.clientPrice);

    const amountSupplier = qn && sp ? f2(qn * sp) : r.amountSupplier ?? '';
    const amountClient = qn && cp ? f2(qn * cp) : r.amountClient ?? '';

    return {
      ...r,
      amountSupplier,
      amountClient,
    };
  }

  function updateRow(id: number, patch: Partial<InvoiceItemRow>) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return recompute({ ...r, ...patch });
      }),
    );
  }

  function addRow() {
    const nextId = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
    setRows((prev) => [
      ...prev,
      {
        id: nextId,
        name: '',
        unit: '',
        qty: '',
        supplierPrice: '',
        clientPrice: '',
        amountSupplier: '',
        amountClient: '',
      },
    ]);
  }

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  function toggleSelected(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (checked) s.add(id);
      else s.delete(id);
      return Array.from(s);
    });
  }

  function toggleAll(checked: boolean) {
    if (!checked) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(rows.map((r) => r.id));
  }

  function removeSelected() {
    if (!selectedIds.length) return;
    const s = new Set(selectedIds);
    setRows((prev) => prev.filter((r) => !s.has(r.id)));
    setSelectedIds([]);
  }

  async function changeStatus(next: InvoiceStatus) {
    if (!invoice) return;
    if (!canWrite) return;

    const current = String(invoice.status ?? 'draft');
    const target = String(next);

    if (current === target) return;

    // підтвердження для незворотніх/важливих переходів
    if (target === 'paid') {
      // eslint-disable-next-line no-alert
      const ok = window.confirm('Позначити накладну як “Оплачено”? Після цього редагування позицій буде заблоковано.');
      if (!ok) return;
    }
    if (current === 'paid' && target !== 'paid') {
      // eslint-disable-next-line no-alert
      const ok = window.confirm('Накладна вже “Оплачено”. Повернути у попередній статус?');
      if (!ok) return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateInvoice(invoice.id, { status: target } as any);
      setInvoice(updated);
      setStatus((String(updated.status ?? target) as InvoiceStatus) || target);
    } catch (e: any) {
      setError(e?.response?.data?.message?.join?.('\n') || e?.message || 'Не вдалося змінити статус');
    } finally {
      setSaving(false);
    }
  }

  async function onSave(opts?: { silent?: boolean }) {
    if (!invoice) return;
    if (!canEdit) return;

    setSaving(true);
    setError(null);
    try {
      const fallbackWarehouseId = Number((invoice as any)?.warehouseId ?? 0) || null;
      const warehouseId = invoiceType === 'internal' ? (invoiceWarehouse?.id ?? fallbackWarehouseId) : null;
      const dto = {
        type: invoiceType,
        internalDirection: invoiceType === 'internal' ? internalDirection : null,
        warehouseId,
        supplierName: supplierName.trim() || undefined,
        status: (String(status) as any) || undefined,
        items: toApiItems(rows),
      };

      const updated = await updateInvoice(invoice.id, dto);
      setInvoice(updated);

      // ре-нормалізація (на випадок, якщо бек відкоригував дані)
      const raw = Array.isArray(updated.items) ? updated.items : [];
      setRows(raw.map((it, idx) => normalizeItem(it, idx + 1)));

      // оновлюємо snapshot для автозбереження
      lastSavedRef.current = JSON.stringify({
        type: String((updated as any).type ?? invoiceType),
        internalDirection: (updated as any).internalDirection ?? (invoiceType === 'internal' ? internalDirection : null),
        warehouseId: (updated as any).warehouseId ?? warehouseId,
        supplierName: String(updated.supplierName ?? supplierName).trim(),
        // Важливо: "??" і "||" мають різний пріоритет у JS — потрібні дужки.
        status: String((updated.status ?? status) || 'draft'),
        items: toApiItems(raw.map((it, idx) => normalizeItem(it, idx + 1))),
      });
      setDirty(false);
    } catch (e: any) {
      setError(e?.response?.data?.message?.join?.('\n') || e?.message || 'Не вдалося зберегти');
    } finally {
      setSaving(false);
    }
  }

  function toNum(v: unknown): number {
    return n(v, 0);
  }

  async function onPushToWarehouseDraft() {
    if (!invoice) return;
    if (!canWarehouseRead) {
      setPushToWarehouseError('Немає доступу warehouse:read.');
      return;
    }
    if (!selectedWarehouse) {
      setPushToWarehouseError('Оберіть склад.');
      return;
    }

    setPushToWarehouseLoading(true);
    setPushToWarehouseError(null);

    try {
      const invNo = (invoice as any)?.objectSeq && Number((invoice as any)?.objectSeq) > 0
        ? String((invoice as any).objectSeq)
        : String(invoice.id);

      const srcSupplier = String(supplierName || invoice.supplierName || '').trim();

      const validItems = rows
        .filter((r) => Number(r.materialId ?? 0) > 0 && toNum(r.qty) > 0)
        .map((r) => ({
          materialId: Number(r.materialId),
          qty: toNum(r.qty),
          price: toNum(r.supplierPrice),
          unit: String(r.unit ?? '').trim(),
        }));

      if (!validItems.length) {
        setPushToWarehouseError('У накладній немає жодної позиції з матеріалом та кількістю > 0.');
        return;
      }

      const payload = {
        type: 'IN' as const,
        docNo: `Накладна №${invNo}`,
        objectName: String(objectName || ''),
        counterpartyName: srcSupplier,
        note: `Чернетка зі сторінки накладної (ID: ${invoice.id}).`,
        items: validItems,
      };

      await api.post('/warehouse/movements/draft', {
        warehouseId: Number(selectedWarehouse.id),
        payload,
      });

      navigate(`/warehouses/${selectedWarehouse.id}?openCreate=1&tab=movements`);
    } catch (e: any) {
      setPushToWarehouseError(e?.response?.data?.message?.join?.('\n') || e?.message || 'Не вдалося створити чернетку для складу.');
    } finally {
      setPushToWarehouseLoading(false);
    }
  }

  async function onInternalWarehouseDraft() {
    if (!invoice) return;
    if (!canWarehouseRead) {
      setPushToWarehouseError('Немає доступу warehouse:read.');
      return;
    }
    if (!invoiceWarehouse) {
      setPushToWarehouseError('Оберіть склад у параметрах накладної.');
      return;
    }

    setPushToWarehouseLoading(true);
    setPushToWarehouseError(null);

    try {
      const invNo = (invoice as any)?.objectSeq && Number((invoice as any)?.objectSeq) > 0
        ? String((invoice as any).objectSeq)
        : String(invoice.id);

      const validItems = rows
        .filter((r) => Number(r.materialId ?? 0) > 0 && toNum(r.qty) > 0)
        .map((r) => ({
          materialId: Number(r.materialId),
          qty: toNum(r.qty),
          price: toNum(r.supplierPrice),
          unit: String(r.unit ?? '').trim(),
        }));

      if (!validItems.length) {
        setPushToWarehouseError('У накладній немає жодної позиції з матеріалом та кількістю > 0.');
        return;
      }

      const dir = internalDirection === 'OUT' ? 'OUT' : 'IN';
      const counterparty = dir === 'IN'
        ? String(supplierName || invoice.supplierName || '').trim()
        : String(objectName || '');

      const payload = {
        type: dir as 'IN' | 'OUT',
        docNo: `Внутрішня накладна №${invNo}`,
        objectName: String(objectName || ''),
        counterpartyName: counterparty,
        note: `Чернетка з внутрішньої накладної (ID: ${invoice.id}).`,
        items: validItems,
      };

      await api.post('/warehouse/movements/draft', {
        warehouseId: Number(invoiceWarehouse.id),
        payload,
      });

      navigate(`/warehouses/${invoiceWarehouse.id}?openCreate=1&tab=movements`);
    } catch (e: any) {
      setPushToWarehouseError(e?.response?.data?.message?.join?.('\n') || e?.message || 'Не вдалося створити чернетку для складу.');
    } finally {
      setPushToWarehouseLoading(false);
    }
  }

  async function onPdf(view: 'client' | 'internal') {
    if (!invoice) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await downloadInvoicePdf(invoice.id, view);
      const url = URL.createObjectURL(blob);

      const datePart = (() => {
        const s = String((invoice as any)?.invoiceDate || invoice?.createdAt || '');
        const d = s ? new Date(s) : new Date();
        // YYYY-MM-DD
        return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      })();

      const supplierPart = safeFilePart(String(supplierName || invoice.supplierName || ''));
      const invNo = (invoice as any)?.objectSeq && Number((invoice as any).objectSeq) > 0
        ? String((invoice as any).objectSeq)
        : String(invoice.id);
      const suffix = view === 'internal' ? '_internal' : '';
      const fn = `Накладна_${invNo}_${datePart}${supplierPart ? '_' + supplierPart : ''}${suffix}.pdf`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fn;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Не вдалося згенерувати PDF');
    } finally {
      setSaving(false);
    }
  }

  function fmtDateUA(value: unknown): string {
    const s = String(value ?? '').trim();
    if (!s) return '';
    const d = new Date(s);
    if (!Number.isFinite(d.getTime())) return s;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear());
    return `${dd}.${mm}.${yy}`;
  }

  function buildPrintHtml() {
    if (!invoice) return '';

    const invNo = (invoice as any)?.objectSeq && Number((invoice as any).objectSeq) > 0
      ? String((invoice as any).objectSeq)
      : String(invoice.id);

    const invDate = fmtDateUA((invoice as any)?.invoiceDate || invoice.createdAt);
    const supplier = String(supplierName || invoice.supplierName || '').trim();

    const headerLines = COMPANY.lines
      .map((l) => String(l))
      .filter((l) => l.trim().length > 0)
      .map((l) => `<div class="line">${l.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`)
      .join('');

    const tr = rows
      .filter((r) => (r.name || '').trim() || (r.materialId ?? null) !== null)
      .map((r, idx) => {
        const name = String(r.name || '').trim();
        const unit = String(r.unit || '').trim();
        const qty = String(r.qty || '').trim();
        const sp = String(r.supplierPrice || '').trim();
        const ap = String(r.amountSupplier || '').trim();
        const cp = String(r.clientPrice || '').trim();
        const ac = String(r.amountClient || '').trim();
        return `
          <tr>
            <td class="c num">${idx + 1}</td>
            <td class="c name">${name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            <td class="c">${unit.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            <td class="c r">${qty}</td>
            <td class="c r">${sp}</td>
            <td class="c r">${ap}</td>
            <td class="c r">${cp}</td>
            <td class="c r">${ac}</td>
          </tr>`;
      })
      .join('');

    const tSupplier = totals.supplierF;
    const tClient = totals.clientF;

    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Накладна №${invNo}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; margin: 18mm 14mm; color: #111; }
      .header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 10mm; }
      .brand { display: flex; gap: 12px; align-items: center; }
      .brand img { width: 58px; height: 58px; object-fit: contain; border-radius: 10px; }
      .brand .t1 { font-size: 18px; font-weight: 700; margin: 0; }
      .brand .t2 { font-size: 12px; margin: 2px 0 0 0; color: #444; }
      .meta { text-align: right; }
      .meta .no { font-size: 18px; font-weight: 700; }
      .meta .dt { font-size: 12px; color: #444; margin-top: 3px; }
      .requisites { font-size: 11px; color: #333; line-height: 1.25; }
      .line { margin: 1px 0; }
      .supplier { margin: 2mm 0 6mm 0; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
      th, td { border: 1px solid #e0e0e0; padding: 6px 8px; vertical-align: top; }
      th { background: #f5f5f5; text-align: left; font-weight: 700; }
      .r { text-align: right; font-variant-numeric: tabular-nums; }
      .num { width: 26px; }
      .name { width: 42%; }
      .totals { margin-top: 6mm; display: flex; justify-content: flex-end; }
      .totals .box { min-width: 280px; border: 1px solid #e0e0e0; padding: 8px 10px; }
      .totals .row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; }
      @media print { .noprint { display: none; } }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand">
        <img src="${buduyLogoUrl}" alt="logo" />
        <div>
          <div class="t1">${COMPANY.name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          ${COMPANY.subtitle ? `<div class="t2">${COMPANY.subtitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
          <div class="requisites">${headerLines}</div>
        </div>
      </div>
      <div class="meta">
        <div class="no">Накладна №${invNo}</div>
        <div class="dt">Дата: ${invDate || ''}</div>
      </div>
    </div>

    ${supplier ? `<div class="supplier"><b>Постачальник:</b> ${supplier.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}

    <table>
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Найменування</th>
          <th>Од.</th>
          <th class="r">К-сть</th>
          <th class="r">Ціна пост.</th>
          <th class="r">Сума пост.</th>
          <th class="r">Ціна клієнт</th>
          <th class="r">Сума клієнт</th>
        </tr>
      </thead>
      <tbody>
        ${tr}
      </tbody>
    </table>

    <div class="totals">
      <div class="box">
        <div class="row"><span>Разом (постачальник)</span><span><b>${tSupplier}</b></span></div>
        <div class="row"><span>Разом (клієнт)</span><span><b>${tClient}</b></span></div>
      </div>
    </div>

    </body>
</html>`;
  }

  function onPrint() {
    if (!invoice) return;
    const html = buildPrintHtml();
    if (!html) return;

    // More reliable than popup + document.write: print via hidden iframe.
    // Falls back to popup window if iframe printing fails.
    try {
      const iframeId = 'invoice-print-frame';
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);
      }

      const doPrint = async () => {
        const w = iframe!.contentWindow;
        const d = iframe!.contentDocument || w?.document;
        if (!w || !d) throw new Error('print-iframe-missing-window');

        // wait for images (logo) to load to avoid blank header in PDF
        const imgs = Array.from(d.images || []);
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((resolve) => {
                if ((img as any).complete) return resolve();
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
              }),
          ),
        );

        w.focus();
        w.print();
      };

      iframe.onload = () => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        doPrint();
      };

      // Use srcdoc if available
      (iframe as any).srcdoc = html;
      return;
    } catch (_e) {
      // fallback: popup window
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w) return;
      const cleanup = () => {
        try { URL.revokeObjectURL(url); } catch {}
      };
      w.addEventListener('beforeunload', cleanup, { once: true });
      setTimeout(cleanup, 60_000);
    }
  }

  function onExportXlsx() {
    if (!invoice) return;
    const invNo = (invoice as any)?.objectSeq && Number((invoice as any).objectSeq) > 0
      ? String((invoice as any).objectSeq)
      : String(invoice.id);
    const datePart = (() => {
      const s = String((invoice as any)?.invoiceDate || invoice?.createdAt || '');
      const d = s ? new Date(s) : new Date();
      return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    })();
    const supplierPart = safeFilePart(String(supplierName || invoice.supplierName || ''));

    const headerRows = [
      [COMPANY.name, '', '', '', '', '', '', ''],
      [COMPANY.subtitle || '', '', '', '', '', '', '', ''],
      ['Накладна №' + invNo, '', '', '', '', '', '', 'Дата: ' + fmtDateUA((invoice as any)?.invoiceDate || invoice.createdAt)],
      [supplierPart ? 'Постачальник: ' + (supplierName || invoice.supplierName || '') : '', '', '', '', '', '', '', ''],
    ];

    const tableHeader = [
      '#',
      'Найменування товару',
      'Од. виміру',
      'Кіл-ть',
      'Ціна собівартість',
      'Сума собівартість',
      'Ціна для клієнта',
      'Сума клієнт',
    ];

    const tableRows = rows
      .filter((r) => (r.name || '').trim() || (r.materialId ?? null) !== null)
      .map((r, idx) => [
        idx + 1,
        String(r.name || '').trim(),
        String(r.unit || '').trim(),
        String(r.qty || '').trim(),
        String(r.supplierPrice || '').trim(),
        String(r.amountSupplier || '').trim(),
        String(r.clientPrice || '').trim(),
        String(r.amountClient || '').trim(),
      ]);

    const footerRows = [
      ['', '', '', '', 'Разом (собівартість)', totals.supplierF, 'Разом (клієнт)', totals.clientF],
    ];

    const fnBase = `Накладна_${invNo}_${datePart}${supplierPart ? '_' + supplierPart : ''}`;
    exportInvoiceXlsx({
      fileNameBase: fnBase,
      headerRows,
      tableHeader,
      tableRows,
      footerRows,
    });
  }

  
  // Attachments
  useEffect(() => {
    if (!invoice?.id) return;
    refreshAttachments(Number(invoice.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoice?.id]);

return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Stack>
          <Typography variant="h5" fontWeight={700}>
            {invoice ? `Накладна №${(invoice as any)?.objectSeq && Number((invoice as any).objectSeq) > 0 ? (invoice as any).objectSeq : invoice.id}` : 'Накладна'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Табличне редагування позицій (items) з підрахунком сум.
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/invoices')}>
            До списку
          </Button>
          <Button variant="outlined" onClick={load} disabled={loading || saving}>
            Оновити
          </Button>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfOutlinedIcon />}
            onClick={() => void onPdf('client')}
            disabled={!invoice || loading || saving}
          >
            PDF клієнт
          </Button>
          <Button
            variant="outlined"
            startIcon={<PictureAsPdfOutlinedIcon />}
            onClick={() => void onPdf('internal')}
            disabled={!invoice || loading || saving}
          >
            PDF внутр.
          </Button>
          <Button
            variant="outlined"
            startIcon={<PrintOutlinedIcon />}
            onClick={onPrint}
            disabled={!invoice || loading || saving}
          >
            Друк / PDF
          </Button>
          <Button
            variant="outlined"
            startIcon={<TableViewOutlinedIcon />}
            onClick={onExportXlsx}
            disabled={!invoice || loading || saving}
          >
            Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            onClick={onSave}
            disabled={!canEdit || saving || loading}
          >
            Зберегти
          </Button>
        </Stack>
      </Stack>

      {/*
        UX: не показуємо технічні валідаційні помилки під час табличного вводу,
        зокрема "items.X.materialId must not be less than 1".
        Такі рядки відсікаються safe-save і не повинні лякати користувача.
      */}
      {error && !String(error).includes('materialId') ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {invoice && invoiceId > 0 && (
        <Box sx={{ mb: 2, p: 1, border: '1px solid #e2e8f0', borderRadius: 1 }}>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Таблиця (canonical Sheet)
          </Typography>
          <Sheet
            config={invoiceSheetConfig}
            adapter={{ getDraftKey: () => draftKey('invoice', invoiceId) }}
          />
        </Box>
      )}

      {(loading || saving) && (
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            {saving ? 'Збереження…' : 'Завантаження…'}
          </Typography>
        </Box>
      )}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mb={2} sx={{ flexWrap: 'wrap' }}>
            <TextField
              select
              label="Тип"
              value={invoiceType}
              onChange={(e) => {
                const v = String(e.target.value) === 'internal' ? 'internal' : 'external';
                setInvoiceType(v);
                if (v !== 'internal') {
                  setInternalDirection('IN');
                  setInvoiceWarehouse(null);
                }
              }}
              disabled={!canEdit}
              sx={{ width: { xs: '100%', md: 260 } }}
            >
              <MenuItem value="external">Зовнішня (постачальник → обʼєкт)</MenuItem>
              <MenuItem value="internal">Внутрішня (на склад / зі складу)</MenuItem>
            </TextField>

            {invoiceType === 'internal' && (
              <TextField
                select
                label="Напрям"
                value={internalDirection}
                onChange={(e) => setInternalDirection(String(e.target.value) === 'OUT' ? 'OUT' : 'IN')}
                disabled={!canEdit}
                sx={{ width: { xs: '100%', md: 190 } }}
              >
                <MenuItem value="IN">На склад (IN)</MenuItem>
                <MenuItem value="OUT">Зі складу (OUT)</MenuItem>
              </TextField>
            )}

            {invoiceType === 'internal' && (
              <Autocomplete
                options={warehouses}
                loading={warehousesLoading}
                value={invoiceWarehouse}
                onChange={(_, v) => setInvoiceWarehouse(v)}
                getOptionLabel={(o) => String(o?.name ?? '')}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Склад"
                    placeholder="Оберіть склад"
                  />
                )}
                sx={{ width: { xs: '100%', md: 320 } }}
                disabled={!canEdit}
              />
            )}

            <TextField
              fullWidth
              label={invoiceType === 'internal' ? 'Коментар' : 'Постачальник'}
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              disabled={!canEdit}
              sx={{ minWidth: 280 }}
            />
            <Stack direction="row" alignItems="center" spacing={1} sx={{ width: { xs: '100%', md: 420 } }}>
              <Chip
                label={statusLabel(String(status))}
                color={statusColor(String(status))}
                size="medium"
                variant={String(status) === 'draft' ? 'outlined' : 'filled'}
                sx={{ minWidth: 140, justifyContent: 'center' }}
              />

              <TextField
                select
                label="Статус"
                value={String(status)}
                onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                disabled={!canWrite || saving || loading}
                sx={{ flex: 1 }}
                helperText={String(status) !== 'draft' ? 'Позиції заблоковано для редагування' : 'Позиції можна редагувати'}
              >
                {INVOICE_STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {statusLabel(s)}
                  </MenuItem>
                ))}
              </TextField>

              <Button
                variant="outlined"
                onClick={() => void changeStatus(status)}
                disabled={!canWrite || saving || loading || String(status) === String(invoice?.status ?? 'draft')}
              >
                Застосувати
              </Button>
            </Stack>
          </Stack>

          {isLocked && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Накладна має статус “{statusLabel(String(status))}”. Редагування позицій вимкнено. За потреби змініть статус.
            </Alert>
          )}

          {invoiceType === 'external' && (
            <Box
              sx={{
                p: 2,
                mb: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
                <Typography sx={{ minWidth: 90, fontWeight: 700 }}>
                  Склад
                </Typography>
                <Autocomplete
                  options={warehouses}
                  value={selectedWarehouse}
                  onChange={(_, v) => setSelectedWarehouse(v)}
                  loading={warehousesLoading}
                  getOptionLabel={(o) => String(o?.name ?? '')}
                  isOptionEqualToValue={(o, v) => Number(o?.id) === Number(v?.id)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Оберіть склад"
                      size="small"
                      helperText={!canWarehouseRead ? 'Немає прав warehouse:read' : 'Додатково: створить чернетку руху IN на основі позицій накладної'}
                    />
                  )}
                  disabled={!canWarehouseRead}
                  sx={{ flex: 1, minWidth: 260 }}
                />
                <Button
                  variant="contained"
                  onClick={() => void onPushToWarehouseDraft()}
                  disabled={!canWarehouseRead || !selectedWarehouse || pushToWarehouseLoading || loading}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {pushToWarehouseLoading ? 'Створення...' : 'Передати в склад'}
                </Button>
              </Stack>

              {pushToWarehouseError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {pushToWarehouseError}
                </Alert>
              )}

              {canWarehouseRead && !canWarehouseWrite && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  У вас немає прав warehouse:write. Чернетка створиться, але підтвердити рух у складі ви не зможете.
                </Alert>
              )}
            </Box>
          )}

          {invoiceType === 'internal' && (
            <Box
              sx={{
                p: 2,
                mb: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }}>
                <Typography sx={{ minWidth: 90, fontWeight: 700 }}>
                  Склад
                </Typography>
                <TextField
                  size="small"
                  label="Склад"
                  value={invoiceWarehouse?.name ?? ''}
                  placeholder="Оберіть склад"
                  disabled
                  sx={{ flex: 1, minWidth: 260 }}
                />
                <Button
                  variant="contained"
                  onClick={() => void onInternalWarehouseDraft()}
                  disabled={!canWarehouseRead || !invoiceWarehouse || pushToWarehouseLoading || loading}
                  sx={{ whiteSpace: 'nowrap' }}
                >
                  {pushToWarehouseLoading
                    ? 'Створення...'
                    : internalDirection === 'OUT'
                      ? 'Чернетка OUT'
                      : 'Чернетка IN'}
                </Button>
              </Stack>

              {pushToWarehouseError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {pushToWarehouseError}
                </Alert>
              )}

              {!invoiceWarehouse && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Для внутрішньої накладної оберіть склад у параметрах (Тип → Внутрішня).
                </Alert>
              )}
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />

          <Stack direction="row" spacing={1} mb={1}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addRow}
              disabled={!canEdit}
            >
              Додати рядок
            </Button>
            <Button
              variant="outlined"
              onClick={removeSelected}
              disabled={!canEdit || selectedIds.length === 0}
            >
              Видалити вибрані
            </Button>
          </Stack>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Box
              sx={{
                width: 58,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'background.paper',
                fontVariantNumeric: 'tabular-nums',
                fontSize: 12,
              }}
              title="Адреса активної клітинки"
            >
              {activeCellLabel() || '—'}
            </Box>
            <TextField
              size="small"
              fullWidth
              placeholder="Рядок формул (Enter — підтвердити)"
              value={formulaValue}
              onFocus={() => (formulaEditingRef.current = true)}
              onBlur={(e) => {
                formulaEditingRef.current = false;
                if (!activeCell) return;
                const row = rows[activeCell.r];
                if (!row) return;
                const prev = String(getCellValue(row, activeCell.c) ?? '');
                const next = String(e.target.value ?? '');
                if (prev !== next) {
                  pushUndo({ rowId: row.id, col: activeCell.c, prev, next });
                  redoRef.current = [];
                  setCellValue(row.id, activeCell.c, next);
                }
              }}
              onChange={(e) => {
                setFormulaValue(e.target.value);
                setFormulaDirty(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!activeCell) return;
                  const row = rows[activeCell.r];
                  if (!row) return;
                  const prev = String(getCellValue(row, activeCell.c) ?? '');
                  const next = String(formulaValue ?? '');
                  if (prev !== next) {
                    pushUndo({ rowId: row.id, col: activeCell.c, prev, next });
                    redoRef.current = [];
                    setCellValue(row.id, activeCell.c, next);
                  }
                  // Move down like Sheets
                  const nr = Math.min(rows.length - 1, activeCell.r + 1);
                  setActiveCell({ r: nr, c: activeCell.c });
                  setFormulaDirty(false);
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!activeCell) return;
                  const row = rows[activeCell.r];
                  const v = row ? String(getCellValue(row, activeCell.c) ?? '') : '';
                  setFormulaValue(v);
                  setFormulaDirty(false);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              inputProps={{
                style: { fontVariantNumeric: 'tabular-nums' },
              }}
            />
          </Box>

          <Box
            ref={gridRef}
            tabIndex={0}
            onKeyDown={handleGridKeyDown}
            onPaste={handleGridPaste}
            sx={{ width: '100%', overflow: 'auto', maxHeight: '65vh', outline: 'none', border: `1px solid ${SHEET_GOOGLE_BORDER}`, position: 'relative' }}
          >
            {overlayRect && editor && (
              <Box
                sx={{
                  position: 'absolute',
                  top: overlayRect.top,
                  left: overlayRect.left,
                  width: overlayRect.width,
                  height: overlayRect.height,
                  zIndex: 20,
                  backgroundColor: '#fff',
                  border: '2px solid rgba(26,115,232,0.95)',
                  boxSizing: 'border-box',
                  display: 'flex',
                  alignItems: 'center',
                  px: 0.75,
                }}
                onMouseDown={(e) => {
                  // не даємо таблиці зняти фокус
                  e.stopPropagation();
                }}
              >
                {editor.c === 'name' ? (
                  <Autocomplete<MaterialDto, false, false, true>
                    size="small"
                    options={materials}
                    loading={materialsLoading}
                    getOptionLabel={(opt) => (typeof opt === 'string' ? opt : String(opt?.name ?? ''))}
                    isOptionEqualToValue={(a, b) => Number(a?.id) === Number(b?.id)}
                    value={(() => {
                      const rr = rows[editor.r];
                      if (!rr?.materialId) return null;
                      return materialsById.get(Number(rr.materialId)) ?? null;
                    })()}
                    inputValue={(() => {
                      const rr = rows[editor.r];
                      return String(rr?.name ?? '');
                    })()}
                    freeSolo
                    onInputChange={(_, value, reason) => {
                      if (reason === 'input') {
                        const rr = rows[editor.r];
                        if (!rr) return;
                        updateRow(rr.id, { name: value, materialId: undefined });
                      }
                    }}
                    onChange={(_, value) => {
                      const rr = rows[editor.r];
                      if (!rr) return;
                      if (!value) {
                        updateRow(rr.id, { materialId: undefined });
                        return;
                      }
                      if (typeof value === 'string') {
                        updateRow(rr.id, { name: value, materialId: undefined });
                        return;
                      }
                      updateRow(rr.id, {
                        materialId: Number(value.id),
                        name: value.name,
                        unit: String(value.unit ?? ''),
                      });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        variant="standard"
                        fullWidth
                        placeholder={materials.length ? 'Почніть вводити…' : 'Найменування'}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            // commit as-is and move down
                            closeEditor();
                            const nr = Math.min(rows.length - 1, editor.r + 1);
                            selectCell(nr, 'name');
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault();
                            e.stopPropagation();
                            closeEditor();
                          }
                        }}
                        onBlur={() => {
                          // фіксуємо undo як зміну і виходимо
                          closeEditor();
                        }}
                        disabled={!canEdit}
                        InputProps={{
                          ...params.InputProps,
                          disableUnderline: true,
                          sx: { fontSize: 13, p: 0, height: 28 },
                        }}
                      />
                    )}
                  />
                ) : (
                  <TextField
                    variant="standard"
                    fullWidth
                    inputRef={editorInputRef}
                    value={editorValue}
                    onChange={(e) => setEditorValue(e.target.value)}
                    onBlur={() => commitEditor('none')}
                    InputProps={{ disableUnderline: true, sx: { fontSize: 13, p: 0, height: 28 } }}
                    inputProps={{ style: { fontVariantNumeric: 'tabular-nums' } }}
                  />
                )}
              </Box>
            )}

            {/* Fill-handle (Sheets-like): drag DOWN or RIGHT; Ctrl/Meta enables numeric series */}
            {!editor && activeCell && canEdit && (() => {
              const r = computeOverlayRect(activeCell.r, activeCell.c);
              if (!r) return null;
              return (
                <Box
                  sx={{
                    position: 'absolute',
                    top: r.top + r.height - 6,
                    left: r.left + r.width - 6,
                    width: 8,
                    height: 8,
                    zIndex: 18,
                    backgroundColor: 'rgba(26,115,232,0.95)',
                    border: '1px solid #fff',
                    cursor: 'crosshair',
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!activeCell) return;
                    const row = rows[activeCell.r];
                    if (!row) return;
                    const baseVal = String(getCellValue(row, activeCell.c) ?? '');
                    setIsFilling(true);
                    fillBaseRef.current = { r: activeCell.r, c: activeCell.c, value: baseVal, series: !!(e.ctrlKey || e.metaKey) };
                    fillTargetRef.current = { r: activeCell.r, c: activeCell.c };
                    // підсвічуємо як сел
                    const ci = COLS.indexOf(activeCell.c);
                    setAnchor({ r: activeCell.r, c: ci });
                    setSel({ r1: activeCell.r, c1: ci, r2: activeCell.r, c2: ci });
                  }}
                />
              );
            })()}

            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    padding="checkbox"
                    sx={{ position: 'sticky', left: 0, zIndex: 6, backgroundColor: SHEET_HEADER_BG, borderRight: `1px solid ${SHEET_GOOGLE_HEADER_BORDER}` }}
                  >
                    {canEdit && (
                      <Checkbox
                        checked={rows.length > 0 && selectedIds.length === rows.length}
                        indeterminate={selectedIds.length > 0 && selectedIds.length < rows.length}
                        onChange={(e) => toggleAll(e.target.checked)}
                      />
                    )}
                  </TableCell>
                  {COL_META.map((c) => (
                    <TableCell
                      key={c.key}
                      align={c.align ?? 'left'}
                      sx={{
                        width: colWidths[c.key],
                        minWidth: c.minWidth,
                        maxWidth: c.maxWidth,
                        position: c.key === 'name' ? 'sticky' : 'relative',
                        left: c.key === 'name' ? 44 : undefined,
                        zIndex: c.key === 'name' ? 6 : 2,
                        backgroundColor: SHEET_HEADER_BG,
                        borderBottom: `1px solid ${SHEET_GOOGLE_HEADER_BORDER}`,
                        borderRight: `1px solid ${SHEET_GOOGLE_HEADER_BORDER}`,
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.label}
                      <Box
                        onMouseDown={(ev) => startResize(c.key, ev)}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: 6,
                          height: '100%',
                          cursor: 'col-resize',
                          zIndex: 5,
                        }}
                      />
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ width: 60 }}>
                    Дії
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, ri) => (
                  <TableRow key={r.id} sx={{ height: 32 }}>
                    <TableCell
                      padding="checkbox"
                      sx={{ position: 'sticky', left: 0, zIndex: 4, backgroundColor: '#fff', borderRight: `1px solid ${SHEET_GOOGLE_HEADER_BORDER}` }}
                    >
                      {canEdit && (
                        <Checkbox
                          checked={selectedIds.includes(r.id)}
                          onChange={(e) => toggleSelected(r.id, e.target.checked)}
                        />
                      )}
                    </TableCell>
                    <TableCell
                      data-cell="1"
                      data-ri={ri}
                      data-col="name"
                      sx={{ position: 'sticky', left: 44, zIndex: 3, backgroundColor: '#fff', ...cellSx(ri, 'name'), width: colWidths.name, minWidth: 240 }}
                      onMouseDown={() => startSel(ri, 'name')}
                      onMouseOver={() => extendSel(ri, 'name')}
                      onDoubleClick={() => openEditor(ri, 'name')}
                    >
                      <Box sx={{ px: 0.75, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getCellValue(r, 'name') || ''}
                      </Box>
                    </TableCell>
                    <TableCell
                      data-cell="1"
                      data-ri={ri}
                      data-col="unit"
                      sx={{ ...cellSx(ri, 'unit'), width: colWidths.unit, minWidth: 90 }}
                      onMouseDown={() => startSel(ri, 'unit')}
                      onMouseOver={() => extendSel(ri, 'unit')}
                      onDoubleClick={() => openEditor(ri, 'unit')}
                    >
                      <Box sx={{ px: 0.75, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getCellValue(r, 'unit') || ''}
                      </Box>
                    </TableCell>
                    <TableCell
                      data-cell="1"
                      data-ri={ri}
                      data-col="qty"
                      sx={{ ...cellSx(ri, 'qty'), width: colWidths.qty, minWidth: 120 }}
                      onMouseDown={() => startSel(ri, 'qty')}
                      onMouseOver={() => extendSel(ri, 'qty')}
                      onDoubleClick={() => openEditor(ri, 'qty')}
                    >
                      <Box sx={{ px: 0.75, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getCellValue(r, 'qty') || ''}
                      </Box>
                    </TableCell>
                    <TableCell
                      data-cell="1"
                      data-ri={ri}
                      data-col="supplierPrice"
                      sx={{ ...cellSx(ri, 'supplierPrice'), width: colWidths.supplierPrice, minWidth: 140 }}
                      onMouseDown={() => startSel(ri, 'supplierPrice')}
                      onMouseOver={() => extendSel(ri, 'supplierPrice')}
                      onDoubleClick={() => openEditor(ri, 'supplierPrice')}
                    >
                      <Box sx={{ px: 0.75, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getCellValue(r, 'supplierPrice') || ''}
                      </Box>
                    </TableCell>
                    <TableCell
                      data-cell="1"
                      data-ri={ri}
                      data-col="amountSupplier"
                      sx={{ ...cellSx(ri, 'amountSupplier'), width: colWidths.amountSupplier, minWidth: 140 }}
                      onMouseDown={() => startSel(ri, 'amountSupplier')}
                      onMouseOver={() => extendSel(ri, 'amountSupplier')}
                      onDoubleClick={() => openEditor(ri, 'amountSupplier')}
                    >
                      <Box sx={{ px: 0.75, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getCellValue(r, 'amountSupplier') || ''}
                      </Box>
                    </TableCell>
                    <TableCell
                      data-cell="1"
                      data-ri={ri}
                      data-col="clientPrice"
                      sx={{ ...cellSx(ri, 'clientPrice'), width: colWidths.clientPrice, minWidth: 140 }}
                      onMouseDown={() => startSel(ri, 'clientPrice')}
                      onMouseOver={() => extendSel(ri, 'clientPrice')}
                      onDoubleClick={() => openEditor(ri, 'clientPrice')}
                    >
                      <Box sx={{ px: 0.75, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getCellValue(r, 'clientPrice') || ''}
                      </Box>
                    </TableCell>
                    <TableCell
                      data-cell="1"
                      data-ri={ri}
                      data-col="amountClient"
                      sx={{ ...cellSx(ri, 'amountClient'), width: colWidths.amountClient, minWidth: 140 }}
                      onMouseDown={() => startSel(ri, 'amountClient')}
                      onMouseOver={() => extendSel(ri, 'amountClient')}
                      onDoubleClick={() => openEditor(ri, 'amountClient')}
                    >
                      <Box sx={{ px: 0.75, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {getCellValue(r, 'amountClient') || ''}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setRows((prev) => prev.filter((x) => x.id !== r.id));
                          setSelectedIds((prev) => prev.filter((x) => x !== r.id));
                        }}
                        disabled={!canEdit}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}

                {rows.length > 0 && (
                  <TableRow
                    sx={{
                      height: 34,
                      position: 'sticky',
                      bottom: 0,
                      zIndex: 2,
                      backgroundColor: '#fff',
                    }}
                  >
                    <TableCell
                      padding="checkbox"
                      sx={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 3,
                        backgroundColor: '#fff',
                        borderRight: `1px solid ${SHEET_GOOGLE_HEADER_BORDER}`,
                      }}
                    />
                    <TableCell
                      sx={{ position: 'sticky', left: 44, zIndex: 3, backgroundColor: '#fff', borderTop: `2px solid ${SHEET_GOOGLE_HEADER_BORDER}`, fontWeight: 700 }}
                    >
                      Разом
                    </TableCell>
                    <TableCell sx={{ borderTop: `2px solid ${SHEET_GOOGLE_HEADER_BORDER}` }} />
                    <TableCell sx={{ borderTop: `2px solid ${SHEET_GOOGLE_HEADER_BORDER}` }} />
                    <TableCell sx={{ borderTop: `2px solid ${SHEET_GOOGLE_HEADER_BORDER}` }} />
                    <TableCell sx={{ borderTop: `2px solid ${SHEET_GOOGLE_HEADER_BORDER}`, fontWeight: 700 }} align="right">
                      {totals.supplierF}
                    </TableCell>
                    <TableCell sx={{ borderTop: `2px solid ${SHEET_GOOGLE_HEADER_BORDER}` }} />
                    <TableCell sx={{ borderTop: `2px solid ${SHEET_GOOGLE_HEADER_BORDER}`, fontWeight: 700 }} align="right">
                      {totals.clientF}
                    </TableCell>
                    <TableCell sx={{ borderTop: `2px solid ${SHEET_GOOGLE_HEADER_BORDER}` }} />
                  </TableRow>
                )}

                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Typography variant="body2" color="text.secondary">
                        Поки немає позицій. Додайте рядок.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Stack spacing={1}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="flex-end" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Разом (постачальник): <b>{totals.supplierF}</b>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Разом (клієнт): <b>{totals.clientF}</b>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Прибуток: <b>{totals.profitF}</b>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Маржа: <b>{totals.marginPctF}%</b>
              </Typography>
            </Stack>

            {savedTotals && (
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="flex-end" spacing={2}>
                <Typography variant="caption" color="text.secondary">
                  Збережено в БД (постачальник): <b>{savedTotals.supplierF}</b>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Збережено в БД (клієнт): <b>{savedTotals.clientF}</b>
                </Typography>
                {(Math.abs(savedTotals.supplier - totals.supplier) > 0.009 ||
                  Math.abs(savedTotals.client - totals.client) > 0.009) && (
                  <Typography variant="caption" color="warning.main">
                    Увага: підсумки з БД відрізняються від розрахунку по позиціях (items).
                  </Typography>
                )}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>
    
      {/* Файли та докази */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="h6">Файли та докази</Typography>
              <Typography variant="body2" color="text.secondary">
                Прикріплюй фото/скани накладних, підписані документи, докази відвантаження/приймання — щоб завжди було зрозуміло “чому існує ця сума/операція”.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                disabled={!canWrite || saving || attUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Додати файл
              </Button>
            </Stack>
          </Stack>

          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              // reset input so the same file can be uploaded again if needed
              e.currentTarget.value = '';
              if (!f) return;
              void handleUploadAttachment(f);
            }}
          />

          <Divider sx={{ my: 2 }} />

          {attError ? (
            <Alert severity="error" sx={{ mb: 1 }}>
              {attError}
            </Alert>
          ) : null}

          {attLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2">Завантажую список файлів…</Typography>
            </Stack>
          ) : attachments.length === 0 ? (
            <Alert severity="info">Файлів поки немає.</Alert>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Файл</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Тип</th>
                    <th style={{ textAlign: 'left', padding: '8px 6px' }}>Дата</th>
                    <th style={{ textAlign: 'right', padding: '8px 6px' }}>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {attachments.map((a) => (
                    <tr key={a.id} style={{ borderTop: `1px solid ${SHEET_GRID_COLOR_SOFT}` }}>
                      <td style={{ padding: '8px 6px' }}>
                        <Typography variant="body2">{a.originalName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {Math.round((Number(a.size) || 0) / 1024)} KB
                        </Typography>
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <Chip size="small" label={a.kind || 'file'} />
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <Typography variant="body2">{String(a.createdAt || '').slice(0, 19).replace('T', ' ')}</Typography>
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => void downloadAttachment(a.id, a.originalName || a.fileName)}
                          >
                            Скачати
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            variant="text"
                            disabled={!canWrite || saving}
                            onClick={() => void handleDeleteAttachment(a.id)}
                          >
                            Видалити
                          </Button>
                        </Stack>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}

          {attUploading && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Завантаження файлу…
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Save indicator (shared; fixed; does not shift layout) */}
      <SaveIndicatorChip state={saving ? 'saving' : dirty ? 'dirty' : 'idle'} showDirty />
</Box>
  );
}