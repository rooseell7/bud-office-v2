import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';

import {
  Alert,
  Autocomplete,
  Box,
  Checkbox,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PrintIcon from '@mui/icons-material/Print';

import { getMaterials, type MaterialDto } from '../../api/materials';
import { getObjects, type ObjectDto } from '../../api/objects';
import { createDocument, getDocument, listDocuments, updateDocument, type DocumentDto } from '../../api/documents';


import {
  CALC_KEYS,
  defaultTemplate,
  loadTemplates,
  makeMaterialRow,
  makePercentRow,
  makeStage,
  makeWorkRow,
  materialQtyByMode,
  normalizeTemplate,
  printKp,
  recalcRow,
  saveTemplates,
  stageTotals,
  type MaterialRow,
  type PercentRow,
  type QuoteTemplateItem,
  type Stage,
  type WorkRow,
} from '../shared/sheet/quoteSheet';

import { CommitTextField } from '../shared/sheet/CommitTextField';

import { cleanNumInput, f2, n, uid } from '../shared/sheet/utils';
import { applyTsvPasteToRows } from '../shared/sheet/engine';
import { SHEET_GRID_COLOR, SHEET_OUTLINE_COLOR } from '../shared/sheet/constants';
import {
  Sheet,
  quoteSheetConfig,
  useQuoteAdapter,
  draftKey,
} from '../../sheet';

export default function QuotesPage() {
  const [objects, setObjects] = useState<ObjectDto[]>([]);
  const [projectId, setProjectId] = useState<number | ''>('');
  const [docs, setDocs] = useState<DocumentDto[]>([]);
  const [docId, setDocId] = useState<number | ''>('');

  const [title, setTitle] = useState('Комерційна пропозиція');
  const [err, setErr] = useState<string>('');
  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const matsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const matsByName = useMemo(() => {
    // ✅ PERF: один раз на зміну довідника матеріалів
    const m = new Map<string, MaterialDto>();
    for (const it of materials) {
      const k = (it?.name ?? '').trim().toLowerCase();
      if (k) m.set(k, it);
    }
    return m;
  }, [materials]);

  const [stages, setStages] = useState<Stage[]>(() => defaultTemplate().stages);

  // ✅ PERF: оновлення великих структур робимо через transition,
  // щоб не блокувати UI під час редагування/вставки великих масивів.
  const [isStagesPending, startStagesTransition] = useTransition();
  const setStagesT = useCallback(
    (updater: Stage[] | ((prev: Stage[]) => Stage[])) => {
      startStagesTransition(() => {
        setStages(updater as any);
      });
    },
    [startStagesTransition],
  );

  // Templates (local, multiple)
  const [templates, setTemplates] = useState<QuoteTemplateItem[]>(() => loadTemplates());
  const [templateId, setTemplateId] = useState<string>(() => {
    const items = loadTemplates();
    return items[0]?.id ?? 'tpl_default';
  });

  const sheetDocId = typeof docId === 'number' ? docId : docId ? Number(docId) : null;
  const { adapter: docsAdapter, mode, initialSnapshot } = useQuoteAdapter(sheetDocId);
  const [quoteTotals, setQuoteTotals] = useState<number | null>(null);

  const onSheetSaved = useCallback(() => {
    if (sheetDocId == null) return;
    getDocument(sheetDocId)
      .then((doc) => setQuoteTotals((doc?.meta as any)?.quoteTotals?.total ?? null))
      .catch(() => {});
  }, [sheetDocId]);

  const localAdapter = useMemo(
    () =>
      sheetDocId == null
        ? { getDraftKey: () => draftKey('quote', projectId || 'new') }
        : null,
    [sheetDocId, projectId],
  );
  const adapter = sheetDocId != null ? docsAdapter : localAdapter;

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === templateId) ?? templates[0] ?? null;
  }, [templates, templateId]);
  void selectedTemplate;

  function showLoadError(scope: string, e: unknown) {
    const msg = e instanceof Error ? e.message : String(e ?? '');
    setErr(`${scope}: ${msg || 'помилка завантаження'}`);
  }

  // Об'єкти
  useEffect(() => {
    let mounted = true;
    getObjects()
      .then((rows) => {
        if (!mounted) return;
        setObjects(rows);
        setProjectId((prev) => {
          if (prev !== '') return prev;
          const firstId = rows[0]?.id;
          return typeof firstId === 'number' ? firstId : prev;
        });
      })
      .catch((e) => {
        if (!mounted) return;
        setObjects([]);
        showLoadError("Об'єкти", e);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Документи КП (quote) для вибраного об'єкта
  useEffect(() => {
    let mounted = true;
    if (!projectId) {
      setDocs([]);
      setDocId('');
      return;
    }
    listDocuments({ type: 'quote', projectId: Number(projectId), limit: 50, offset: 0 })
      .then((rows) => {
        if (!mounted) return;
        setDocs(rows);
      })
      .catch(() => {
        if (!mounted) return;
        setDocs([]);
      });
    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    let mounted = true;
    getMaterials()
      .then((rows) => {
        if (!mounted) return;
        setMaterials(rows.filter((m) => m.isActive !== false));
      })
      .catch((e) => {
        if (!mounted) return;
        setMaterials([]);
        showLoadError('Матеріали', e);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // PERF: один прохід stageTotals на рендер, без повторів у header/підсумках/%%
  const stageTotalsList = useMemo(() => stages.map((s) => stageTotals(s)), [stages]);

  const totalKp = useMemo(() => {
    const total = stageTotalsList.reduce((acc, t) => acc + t.total, 0);
    const issues = stages.reduce((acc, s) => {
      const stageIssues = [...s.works, ...s.materials].reduce((a, r) => {
        if ((r.name || '').trim().length === 0) return a;
        if (n(r.qty) <= 0 || n(r.costPrice) < 0) return a + 1;
        return a;
      }, 0);
      return acc + stageIssues;
    }, 0);
    return { total: f2(total), issues };
  }, [stageTotalsList, stages]);
  void totalKp;

  const onPickDoc = useCallback(
    (nextId: number | '') => {
      setDocId(nextId);
      if (!nextId) return;
      const doc = docs.find((d) => d.id === Number(nextId));
      const meta = (doc?.meta ?? {}) as any;
      const nextTitle = String(doc?.title ?? meta?.title ?? 'Комерційна пропозиція');
      const nextStages = Array.isArray(meta?.stages)
        ? meta.stages
        : Array.isArray(meta?.template?.stages)
          ? meta.template.stages
          : null;
      if (nextTitle) setTitle(nextTitle);
      if (nextStages) setStagesT(nextStages);
    },
    [docs],
  );

  const onSaveToDb = useCallback(async () => {
    setErr('');
    const pid = Number(projectId);
    if (!pid) {
      setErr('Вибери об\'єкт перед збереженням КП в базу');
      return;
    }
    try {
      let meta: Record<string, any> = { title, stages };
      if (docId) {
        const current = docs.find((d) => d.id === Number(docId));
        const prevMeta = (current?.meta ?? {}) as Record<string, any>;
        meta = { ...prevMeta, title, stages };
      }

      const dto: Partial<DocumentDto> = {
        type: 'quote',
        status: 'draft',
        projectId: pid,
        title,
        meta,
      };

      let saved: DocumentDto;
      if (docId) {
        saved = await updateDocument(Number(docId), dto);
      } else {
        saved = await createDocument(dto);
      }
      // refresh list
      const rows = await listDocuments({ type: 'quote', projectId: pid, limit: 50, offset: 0 });
      setDocs(rows);
      setDocId(saved.id);
    } catch (e) {
      setErr('Не вдалося зберегти КП в базу');
    }
  }, [docId, projectId, stages, title, docs]);

  useEffect(() => {
    if (sheetDocId == null) {
      setQuoteTotals(null);
      return;
    }
    let mounted = true;
    getDocument(sheetDocId)
      .then((doc) => {
        if (mounted) setQuoteTotals((doc?.meta as any)?.quoteTotals?.total ?? null);
      })
      .catch(() => {
        if (mounted) setQuoteTotals(null);
      });
    return () => { mounted = false; };
  }, [sheetDocId]);

  function applyRecalcForStage(stageIdx: number) {
    setStagesT((prev) => {
      const next = [...prev];
      const s = { ...next[stageIdx] };
      s.materials = s.materials.map((r) => {
        const qty = materialQtyByMode(r, s, matsById);
        const rr = recalcRow({ ...(r as any), qty, markupPct: (r as any).marginPct ?? (r as any).markupPct } as any);
        return rr;
      });
      s.works = s.works.map((r) => recalcRow({ ...(r as any), markupPct: (r as any).marginPct ?? (r as any).markupPct } as any));
      next[stageIdx] = s;
      return next;
    });
  }
  void applyRecalcForStage;

  function setStageField(stageIdx: number, key: keyof Pick<Stage, 'name' | 'areaM2' | 'lengthLm'>, value: string) {
    setStagesT((prev) => {
      const next = [...prev];
      next[stageIdx] = { ...next[stageIdx], [key]: value } as Stage;
      return next;
    });
  }
  void setStageField;

  function addStage(afterIdx?: number) {
    setStagesT((prev) => {
      const next = [...prev];
      const s = makeStage('Новий етап');
      if (typeof afterIdx === 'number' && afterIdx >= 0) next.splice(afterIdx + 1, 0, s);
      else next.push(s);
      return next;
    });
  }

  function deleteStage(idx: number) {
    setStagesT((prev) => prev.filter((_, i) => i !== idx));
  }

  function addRow(stageIdx: number, kind: 'work' | 'material') {
    setStagesT((prev) => {
      const next = [...prev];
      const s = { ...next[stageIdx] };
      if (kind === 'work') s.works = [...s.works, makeWorkRow()];
      else s.materials = [...s.materials, makeMaterialRow()];
      next[stageIdx] = s;
      return next;
    });
  }
  void addRow;

  function deleteRow(stageIdx: number, kind: 'work' | 'material', rowId: string) {
    setStagesT((prev) => {
      const next = [...prev];
      const s = { ...next[stageIdx] };
      if (kind === 'work') s.works = s.works.filter((r) => r.id !== rowId);
      else s.materials = s.materials.filter((r) => r.id !== rowId);
      next[stageIdx] = s;
      return next;
    });
  }

  function copyRow(stageIdx: number, kind: 'work' | 'material', row: WorkRow | MaterialRow) {
    setStagesT((prev) => {
      const next = [...prev];
      const s = { ...next[stageIdx] };
      const copy: any = { ...row, id: uid(kind === 'work' ? 'w' : 'm') };
      if (kind === 'work') s.works = [...s.works, copy];
      else s.materials = [...s.materials, copy];
      next[stageIdx] = s;
      return next;
    });
  }

  function setRowCell(
    stageIdx: number,
    kind: 'work' | 'material',
    rowIdx: number,
    key: keyof WorkRow | keyof MaterialRow,
    value: string,
  ) {
    setStagesT((prev) => {
      const next = [...prev];
      const s = { ...next[stageIdx] };

      // ✅ PERF: для полів, які не впливають на розрахунки, не запускаємо recalcRow
      const shouldRecalc = CALC_KEYS.has(key as any);

      if (kind === 'work') {
        const rows = [...s.works];
        const base: any = { ...rows[rowIdx], [key]: value } as any;
        if ((key as any) === 'marginPct') base.markupPct = value;
        rows[rowIdx] = shouldRecalc ? recalcRow(base) : base;
        s.works = rows;
      } else {
        const rows = [...s.materials];
        const rr0: any = { ...rows[rowIdx], [key]: value } as any;
        if ((key as any) === 'marginPct') rr0.markupPct = value;
        // if calc mode changed OR stage dimensions changed later, qty will be recalculated by applyRecalcForStage
        rows[rowIdx] = shouldRecalc ? recalcRow(rr0) : rr0;
        s.materials = rows;
      }
      next[stageIdx] = s;
      return next;
    });
  }

  /**
   * Bulk replace rows for a stage table (paste / multi-cell operations).
   * Always re-calculates derived fields to avoid UI divergence.
   */
  function setStageRows(
    stageIdx: number,
    kind: 'work' | 'material',
    nextRows: Array<WorkRow | MaterialRow>,
  ) {
    setStagesT((prev) =>
      prev.map((st, idx) => {
        if (idx !== stageIdx) return st;
        const rows = nextRows.map((r) => {
          const rr: any = { ...(r as any) };
          if ('marginPct' in rr) rr.markupPct = (rr as any).marginPct;
          return recalcRow(rr as any) as any;
        });
        return kind === 'work'
          ? ({ ...st, works: rows as WorkRow[] } as Stage)
          : ({ ...st, materials: rows as MaterialRow[] } as Stage);
      }),
    );
  }

  function setMaterialPick(stageIdx: number, rowIdx: number, mat: MaterialDto | null) {
    setStagesT((prev) => {
      const next = [...prev];
      const s = { ...next[stageIdx] };
      const rows = [...s.materials];
      const base = rows[rowIdx];
      const cost = mat?.basePrice ?? '';
      const unit = (mat?.unit ?? '') || '';
      const r: MaterialRow = {
        ...base,
        materialId: mat?.id,
        name: mat?.name ?? base.name,
        unit,
        costPrice: cost === null || typeof cost === 'undefined' ? base.costPrice : String(cost),
      };
      // apply auto qty if needed
      const qty = materialQtyByMode(r, s, matsById);
      rows[rowIdx] = recalcRow({ ...r, qty, markupPct: r.markupPct ?? '0' });
      s.materials = rows;
      next[stageIdx] = s;
      return next;
    });
  }

  function addPercent(stageIdx: number) {
    setStagesT((prev) => {
      const next = [...prev];
      const s = { ...next[stageIdx] };
      s.percents = [...s.percents, makePercentRow()];
      next[stageIdx] = s;
      return next;
    });
  }
  void addPercent;

  function deletePercent(stageIdx: number, id: string) {
    setStagesT((prev) => {
      const next = [...prev];
      const s = { ...next[stageIdx] };
      s.percents = s.percents.filter((p) => p.id !== id);
      next[stageIdx] = s;
      return next;
    });
  }
  void deletePercent;

  function setPercentCell(stageIdx: number, idx: number, key: keyof PercentRow, value: string) {
    setStagesT((prev) => {
      const next = [...prev];
      const s = { ...next[stageIdx] };
      const ps = [...s.percents];
      ps[idx] = { ...ps[idx], [key]: value };
      s.percents = ps;
      next[stageIdx] = s;
      return next;
    });
  }
  void setPercentCell;

  function createFromTemplate() {
    setErr('');
    const tpl = templates.find((t) => t.id === templateId) ?? templates[0];
    const base = tpl ? { title: tpl.title, stages: tpl.stages } : defaultTemplate();
    const normalized = normalizeTemplate(base);

    setTitle(normalized.title || 'Комерційна пропозиція');
    setStagesT(normalized.stages);
    setDocId('');
  }

  function saveAsTemplate() {
    const name = window.prompt('Назва шаблону', title || 'Шаблон КП');
    if (!name) return;

    const id = `tpl_${Date.now()}`;
    const next = [
      {
        id,
        name: String(name).trim() || 'Шаблон КП',
        title: title || 'Комерційна пропозиція',
        stages,
        updatedAt: new Date().toISOString(),
      },
      ...templates,
    ];

    saveTemplates(next);
    setTemplates(next);
    setTemplateId(id);
  }

  function updateSelectedTemplate() {
    if (!templateId) return;
    const idx = templates.findIndex((t) => t.id === templateId);
    if (idx < 0) return;

    const next = templates.map((t) =>
      t.id === templateId
        ? {
            ...t,
            title: title || 'Комерційна пропозиція',
            stages,
            updatedAt: new Date().toISOString(),
          }
        : t,
    );
    saveTemplates(next);
    setTemplates(next);
  }

  function deleteSelectedTemplate() {
    if (!templateId) return;
    const cur = templates.find((t) => t.id === templateId);
    const ok = window.confirm(`Видалити шаблон "${cur?.name ?? ''}"?`);
    if (!ok) return;

    const next = templates.filter((t) => t.id !== templateId);
    const ensured = next.length ? next : loadTemplates(); // ensures at least default
    saveTemplates(ensured);
    setTemplates(ensured);
    setTemplateId(ensured[0]?.id ?? '');
  }

function onPrint() {
    printKp(title, stages);
  }

  function stageHeader(stage: Stage, idx: number, total: number) {
    return (
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{`Етап ${idx + 1}:`}</Typography>
          <Typography sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {stage.name || 'Без назви'}
          </Typography>
          <Chip size="small" label={`Разом: ${f2(total)}`} />
        </Stack>
        <Stack direction="row" gap={1} alignItems="center">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); addStage(idx); }} title="Додати етап після">
            <AddIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); deleteStage(idx); }} title="Видалити етап">
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>
    );
  }
  void stageHeader;

  function RowTable({
    stageIdx,
    kind,
    rows,
  }: {
    stageIdx: number;
    kind: 'work' | 'material';
    rows: (WorkRow | MaterialRow)[];
  }) {
    const isMaterial = kind === 'material';

    // --- UX: локальні фільтри для таблиці (не впливають на підсумки) ---
    const [filterText, setFilterText] = useState('');
    const [onlyFilled, setOnlyFilled] = useState(false);

    // Розширені фільтри (Од. / К-сть / Сума)
    const [unitFilter, setUnitFilter] = useState<string>('');
    const [qtyMin, setQtyMin] = useState<string>('');
    const [qtyMax, setQtyMax] = useState<string>('');
    const [sumMin, setSumMin] = useState<string>('');
    const [sumMax, setSumMax] = useState<string>('');

    // Google Sheets-like active cell
    // IMPORTANT: use stable row keys (row index), not random row.id,
    // so that highlights/fills persist across page reloads even for unsaved drafts.
    type ActiveCell = { rowKey: string; col: string } | null;
    const [activeCell, setActiveCell] = useState<ActiveCell>(null);

    // Context menu + заливка кольором (persist у localStorage)
    type StylesState = {
      cells: Record<string, string>;
      rows: Record<string, string>;
      cols: Record<string, string>;
    };
    // NOTE: styles must persist across reloads even when docId is not yet selected/restored.
    // We key styles by project + stage + table kind to avoid losing fills on refresh.
    const styleKey = useMemo(() => {
      const pid = projectId ? String(projectId) : 'none';
      return `kp_styles_${pid}_stage${stageIdx}_${kind}`;
    }, [projectId, stageIdx, kind]);

    const [styles, setStyles] = useState<StylesState>(() => ({ cells: {}, rows: {}, cols: {} }));

    useEffect(() => {
      try {
        const raw = localStorage.getItem(styleKey);
        if (!raw) {
          setStyles({ cells: {}, rows: {}, cols: {} });
          return;
        }
        const parsed = JSON.parse(raw);
        setStyles({
          cells: parsed?.cells ?? {},
          rows: parsed?.rows ?? {},
          cols: parsed?.cols ?? {},
        });
      } catch {
        setStyles({ cells: {}, rows: {}, cols: {} });
      }
    }, [styleKey]);

    useEffect(() => {
      try {
        localStorage.setItem(styleKey, JSON.stringify(styles));
      } catch {
        // ignore
      }
    }, [styleKey, styles]);

    const [ctxMenu, setCtxMenu] = useState<
      | {
          mouseX: number;
          mouseY: number;
          rowKey: string;
          col: string;
        }
      | null
    >(null);

    const COLORS = useMemo(
      () => [
        { label: 'Без', value: '' },
        { label: 'Жовт', value: '#fff3bf' },
        { label: 'Зел', value: '#d3f9d8' },
        { label: 'Блак', value: '#d0ebff' },
        { label: 'Фіол', value: '#e5dbff' },
        { label: 'Рож', value: '#ffd6e7' },
        { label: 'Сір', value: '#f1f3f5' },
      ],
      [],
    );

    const cellKey = useCallback((rowKey: string, col: string) => `${rowKey}__${col}`,
      [],
    );

    const getBg = useCallback(
      (rowKey: string, col: string) => {
        const ck = cellKey(rowKey, col);
        return styles.cells[ck] || styles.rows[rowKey] || styles.cols[col] || '';
      },
      [cellKey, styles],
    );

    const applyFill = useCallback(
      (target: 'cell' | 'row' | 'col', color: string) => {
        if (!ctxMenu) return;
        const { rowKey, col } = ctxMenu;
        setStyles((prev) => {
          const next: StylesState = {
            cells: { ...prev.cells },
            rows: { ...prev.rows },
            cols: { ...prev.cols },
          };
          if (target === 'cell') {
            const k = cellKey(rowKey, col);
            if (!color) delete next.cells[k];
            else next.cells[k] = color;
          }
          if (target === 'row') {
            if (!color) delete next.rows[rowKey];
            else next.rows[rowKey] = color;
          }
          if (target === 'col') {
            if (!color) delete next.cols[col];
            else next.cols[col] = color;
          }
          return next;
        });
        setCtxMenu(null);
      },
      [cellKey, ctxMenu],
    );

    const clearFill = useCallback(
      (target: 'cell' | 'row' | 'col') => {
        applyFill(target, '');
      },
      [applyFill],
    );

    const allUnits = useMemo(() => {
      const s = new Set<string>();
      for (const r of rows as any[]) {
        const u = String(r?.unit ?? '').trim();
        if (u) s.add(u);
      }
      return Array.from(s).sort((a, b) => a.localeCompare(b));
    }, [rows]);

    const filteredRows = useMemo(() => {
      const q = filterText.trim().toLowerCase();
      const uf = unitFilter.trim();
      const qMin = qtyMin.trim() ? n(qtyMin) : null;
      const qMax = qtyMax.trim() ? n(qtyMax) : null;
      const sMin = sumMin.trim() ? n(sumMin) : null;
      const sMax = sumMax.trim() ? n(sumMax) : null;

      return rows
        .map((r: any, idx: number) => ({ r, idx }))
        .filter(({ r }) => {
          if (onlyFilled) {
            const nameOk = String(r?.name ?? '').trim().length > 0;
            const qtyOk = n(r?.qty) !== 0;
            const costOk = n(r?.costPrice) !== 0;
            if (!nameOk && !qtyOk && !costOk) return false;
          }

          if (q && !String(r?.name ?? '').toLowerCase().includes(q)) return false;

          if (uf && String(r?.unit ?? '').trim() !== uf) return false;

          const qty = n(r?.qty);
          if (qMin !== null && qty < qMin) return false;
          if (qMax !== null && qty > qMax) return false;

          const amount = n(r?.amount);
          if (sMin !== null && amount < sMin) return false;
          if (sMax !== null && amount > sMax) return false;

          return true;
        });
    }, [rows, filterText, onlyFilled, unitFilter, qtyMin, qtyMax, sumMin, sumMax]);

    const totalsAll = useMemo(() => {
      let costSum = 0;
      let amountSum = 0;
      for (const r of rows as any[]) {
        costSum += n(r?.qty) * n(r?.costPrice);
        amountSum += n(r?.amount);
      }
      return { costSum, amountSum };
    }, [rows]);

    const totalsVisible = useMemo(() => {
      let costSum = 0;
      let amountSum = 0;
      for (const it of filteredRows as any[]) {
        const r = it.r;
        costSum += n(r?.qty) * n(r?.costPrice);
        amountSum += n(r?.amount);
      }
      return { costSum, amountSum };
    }, [filteredRows]);

    // ✅ Тонка "сітка" як у таблиці (Google Sheets vibe)
    const GRID = SHEET_GRID_COLOR;
    const OUTLINE = SHEET_OUTLINE_COLOR;

    // Bulk update helper used by paste / multi-cell operations.
    const onChangeRows = (next: (WorkRow | MaterialRow)[]) => {
      setStageRows(stageIdx, kind, next);
    };

    // --- Shared sheet engine: block paste (TSV) ---
    type ColKey = 'name' | 'unit' | 'qty' | 'costPrice' | 'marginPct' | 'discountPct';
    const COLS = useMemo<ColKey[]>(() => ['name', 'unit', 'qty', 'costPrice', 'marginPct', 'discountPct'], []);

    const cleanText = useCallback((v: string) => String(v ?? '').replace(/ /g, ' ').trim().replace(/\s+/g, ' '), []);

    const setCell = useCallback(
      (row: any, col: ColKey, raw: string) => {
        const isNum = col === 'qty' || col === 'costPrice' || col === 'marginPct' || col === 'discountPct';
        const v = isNum ? cleanNumInput(raw) : cleanText(raw);
        const next: any = { ...row };

        if (col === 'name') {
          if (isMaterial) {
            const hit = matsByName.get(String(v).toLowerCase());
            if (hit) {
              next.name = hit.name ?? String(v);
              next.materialId = hit.id;
              if (!next.unit) next.unit = hit.unit ?? '';
              if (!next.costPrice || String(next.costPrice) === '0') next.costPrice = String(hit.basePrice ?? '');
              return next;
            }
          }
          next.name = String(v);
          return next;
        }

        if (col === 'unit') {
          next.unit = String(v);
          return next;
        }

        if (col === 'marginPct') {
          next.marginPct = String(v);
          // legacy alias used by recalcRow
          next.markupPct = String(v);
          return next;
        }

        next[col] = String(v);
        return next;
      },
      [cleanText, isMaterial, matsByName],
    );

    const handlePaste = useCallback(
      (rowIndex: number, colIndex: number) =>
        (e: React.ClipboardEvent<HTMLInputElement>) => {
          const text = e.clipboardData?.getData('text/plain') ?? e.clipboardData?.getData('text') ?? '';
          if (!text) return;
          const multi = text.includes('\t') || text.includes('\n') || text.includes('\r');
          if (!multi) return;

          e.preventDefault();

          const next = applyTsvPasteToRows(rows as any[], {
            startR: rowIndex,
            startC: colIndex,
            tsv: text,
            cols: COLS as any,
            ensureRowAt: (rowsArg, targetIndex) => {
              let nextRows = rowsArg as any[];
              if (targetIndex >= nextRows.length) {
                const nn = [...nextRows];
                while (nn.length <= targetIndex) nn.push(isMaterial ? (makeMaterialRow() as any) : (makeWorkRow() as any));
                nextRows = nn;
              }
              return { rows: nextRows, index: targetIndex };
            },
            normalizeValue: (colMeta, raw) => {
              const col = colMeta as any as ColKey;
              const isNum = col === 'qty' || col === 'costPrice' || col === 'marginPct' || col === 'discountPct';
              return isNum ? cleanNumInput(raw) : cleanText(raw);
            },
            setCell: (row, colMeta, value) => setCell(row as any, colMeta as any, value),
          });

          onChangeRows(next as any);
        },
      [COLS, cleanText, onChangeRows, rows, setCell],
    );

    const headerCols = useMemo(
      () => [
        { key: 'name', label: 'Найменування' },
        { key: 'unit', label: 'Од.' },
        { key: 'qty', label: 'К-сть' },
        { key: 'costPrice', label: 'Собівартість' },
        { key: 'marginPct', label: 'Маржа %' },
        { key: 'discountPct', label: 'Знижка %' },
        { key: 'clientPrice', label: 'Ціна клієнта' },
        { key: 'amount', label: 'Сума' },
      ],
      [],
    );

    const gridTemplateColumns = [
      '48px',
      'minmax(360px, 1fr)',
      'minmax(90px, 110px)',
      'minmax(90px, 120px)',
      'minmax(120px, 150px)',
      'minmax(130px, 170px)',
      'minmax(150px, 190px)',
      'minmax(160px, 210px)',
      'minmax(90px, 120px)',
      'minmax(74px, 90px)', // Дії
    ].join(' ');
    const stickyLettersH = 26; // px
    const stickyHeaderH = 32; // px (approx)

    const hasAnyFilter = Boolean(
      filterText.trim() ||
        onlyFilled ||
        unitFilter.trim() ||
        qtyMin.trim() ||
        qtyMax.trim() ||
        sumMin.trim() ||
        sumMax.trim(),
    );

    const resetFilters = () => {
      setFilterText('');
      setOnlyFilled(false);
      setUnitFilter('');
      setQtyMin('');
      setQtyMax('');
      setSumMin('');
      setSumMax('');
    };

    const activateCell = (rowKey: string, col: string) => {
      setActiveCell({ rowKey, col });
    };

    const openCtx = (e: React.MouseEvent, rowKey: string, col: string) => {
      e.preventDefault();
      setCtxMenu(
        ctxMenu === null
          ? { mouseX: e.clientX + 2, mouseY: e.clientY - 6, rowKey, col }
          : { mouseX: e.clientX + 2, mouseY: e.clientY - 6, rowKey, col },
      );
    };

    const handleCtxCapture = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const cell = (target?.closest?.('[data-kp-cell="1"]') as HTMLElement | null) ?? null;
      if (!cell) return;
      const rk = cell.dataset.rowkey;
      const col = cell.dataset.col;
      if (!rk || !col) return;
      openCtx(e, rk, col);
    };


    return (
      // IMPORTANT: sticky headers require that the scroll container is the same element
      // that actually scrolls vertically. We make this wrapper scrollable in both axes.
      <Box sx={{ overflow: 'auto', maxHeight: '72vh', width: '100%' }} onContextMenuCapture={handleCtxCapture}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mb: 1, alignItems: { sm: 'center' } }}
        >
          <TextField
            size="small"
            placeholder="Фільтр по найменуванню…"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            sx={{ minWidth: { sm: 320 } }}
          />
          <FormControlLabel
            control={<Checkbox checked={onlyFilled} onChange={(e) => setOnlyFilled(e.target.checked)} />}
            label="Лише заповнені"
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Од.</InputLabel>
            <Select
              label="Од."
              value={unitFilter}
              onChange={(e) => setUnitFilter(String(e.target.value ?? ''))}
            >
              <MenuItem value="">
                <em>Всі</em>
              </MenuItem>
              {allUnits.map((u) => (
                <MenuItem key={u} value={u}>
                  {u}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              label="К-сть від"
              value={qtyMin}
              onChange={(e) => setQtyMin(e.target.value)}
              sx={{ width: 110 }}
              inputProps={{ inputMode: 'decimal' }}
            />
            <TextField
              size="small"
              label="до"
              value={qtyMax}
              onChange={(e) => setQtyMax(e.target.value)}
              sx={{ width: 90 }}
              inputProps={{ inputMode: 'decimal' }}
            />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              label="Сума від"
              value={sumMin}
              onChange={(e) => setSumMin(e.target.value)}
              sx={{ width: 120 }}
              inputProps={{ inputMode: 'decimal' }}
            />
            <TextField
              size="small"
              label="до"
              value={sumMax}
              onChange={(e) => setSumMax(e.target.value)}
              sx={{ width: 90 }}
              inputProps={{ inputMode: 'decimal' }}
            />
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Показано {filteredRows.length} з {rows.length}
          </Typography>
          {hasAnyFilter && (
            <Button
              size="small"
              variant="text"
              onClick={resetFilters}
            >
              Скинути
            </Button>
          )}
        </Stack>
        <Box
          sx={{
            width: '100%',
            minWidth: 1150,
            border: `1px solid ${OUTLINE}`,
            borderRadius: 1,
            // IMPORTANT: sticky headers/footers stop working in many browsers when any ancestor
            // has overflow: hidden. We keep the border radius but allow sticky positioning.
            overflow: 'visible',
          }}
        >
          <Box
            sx={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns,
              background: '#ffffff',
              borderBottom: `1px solid ${OUTLINE}`,
              '& > *:not(:last-child)': { borderRight: `1px solid ${GRID}` },
              position: 'sticky',
              top: 0,
              zIndex: 5,
              height: `${stickyLettersH}px`,
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                p: 0.35,
                textAlign: 'center',
                fontWeight: 800,
                fontSize: 12,
                color: '#0b2923',
              }}
            >
              G
            </Box>
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((l) => (
              <Box
                key={l}
                sx={{
                  p: 0.5,
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: 11,
                  color: 'text.secondary',
                }}
              >
                {l}
              </Box>
            ))}
            <Box sx={{ p: 0.5 }} />
          </Box>
          <Box
            sx={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns,
              background: '#f6f7f8',
              borderBottom: `1px solid ${OUTLINE}`,
              '& > *:not(:last-child)': { borderRight: `1px solid ${GRID}` },
              position: 'sticky',
              top: `${stickyLettersH}px`,
              zIndex: 4,
              height: `${stickyHeaderH}px`,
              alignItems: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <Box sx={{ p: 0.75, fontWeight: 700, fontSize: 12 }}>#</Box>
            {headerCols.map((c) => {
              const bg = styles.cols[c.key] || '';
              const isActiveCol = activeCell?.col === c.key;
              return (
                <Box
                  key={c.key}
                  onClick={() => setActiveCell({ rowKey: '__header__', col: c.key })}
                  data-kp-cell="1" data-rowkey="__header__" data-col={c.key} onContextMenuCapture={(e) => openCtx(e, '__header__', c.key)}
                  sx={{
                    p: 0.6,
                    fontWeight: 700,
                    fontSize: 12,
                    backgroundColor: bg || undefined,
                    cursor: 'default',
                    ...(isActiveCol
                      ? {
                          boxShadow: 'inset 0 0 0 2px rgba(25,118,210,0.35)',
                        }
                      : null),
                  }}
                >
                  {c.label}
                </Box>
              );
            })}
            <Box sx={{ p: 0.75, fontWeight: 700, fontSize: 12, textAlign: 'center' }}>Дії</Box>
          </Box>

          {filteredRows.map(({ r, idx: rowIdx }) => {
            const rr: any = r;
            // Stable key for styling/highlighting persistence across reloads
            const rowKey = String(rowIdx);
            const materialRow = rr as MaterialRow;
            const selectedMat = materialRow.materialId ? matsById.get(materialRow.materialId) ?? null : null;

            return (
              <Box
                key={rr.id}
                sx={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns,
                  borderBottom: `1px solid ${GRID}`,
                  alignItems: 'center',
                  '& > *:not(:last-child)': { borderRight: `1px solid ${GRID}` },
                }}
              >
                <Box
                  onClick={() => activateCell(rowKey, '#')}
                  data-kp-cell="1" data-rowkey={rowKey} data-col="#"
                  onContextMenuCapture={(e) => openCtx(e, rowKey, '#')}
                  sx={{
                    p: 0.5,
                    fontSize: 12,
                    color: 'text.secondary',
                    backgroundColor: getBg(rowKey, '#') || undefined,
                    cursor: 'default',
                    ...(activeCell?.rowKey === rowKey
                      ? { boxShadow: 'inset 0 0 0 2px rgba(25,118,210,0.35)' }
                      : null),
                  }}
                >
                  {rowIdx + 1}
                </Box>

                <Box
                  onMouseDown={() => activateCell(rowKey, 'name')}
                  data-kp-cell="1" data-rowkey={rowKey} data-col="name"
                  onContextMenuCapture={(e) => openCtx(e, rowKey, 'name')}
                  sx={{
                    p: 0.35,
                    backgroundColor: getBg(rowKey, 'name') || undefined,
                    ...(activeCell?.rowKey === rowKey && activeCell?.col === 'name'
                      ? { boxShadow: 'inset 0 0 0 2px rgba(25,118,210,0.45)' }
                      : null),
                  }}
                >
                  {isMaterial ? (
                    <Autocomplete
                      options={materials}
                      value={selectedMat}
                      getOptionLabel={(o) => o?.name ?? ''}
                      isOptionEqualToValue={(a, b) => (a?.id ?? -1) === (b?.id ?? -2)}
                      disablePortal
                      filterOptions={(opts, state) => {
                        // ✅ PERF: простий contains + ліміт (менше лагів, ніж дефолтний fuzzy)
                        const q = (state.inputValue ?? '').trim().toLowerCase();
                        if (!q) return opts.slice(0, 60);
                        const out: MaterialDto[] = [];
                        for (const o of opts) {
                          const n = (o?.name ?? '').toLowerCase();
                          if (n.includes(q)) out.push(o);
                          if (out.length >= 60) break;
                        }
                        return out;
                      }}
                      onChange={(_, v) => setMaterialPick(stageIdx, rowIdx, v)}
                      renderInput={(params) => (
                        <CommitTextField
                          value={rr.name}
                          onCommit={(v) => setRowCell(stageIdx, 'material', rowIdx, 'name', v)}
                          textFieldProps={{
                            ...(params as any),
                            size: 'small',
                            placeholder: 'Матеріал',
                            onPaste: handlePaste(rowIdx, 0),
                            onFocus: (e: any) => {
                              (params as any).onFocus?.(e);
                              activateCell(rowKey, 'name');
                            },
                            onContextMenu: (e: any) => openCtx(e, rowKey, 'name'),
                          }}
                        />
                      )}
                    />
                  ) : (
                    <CommitTextField
                      value={rr.name}
                      onCommit={(v) => setRowCell(stageIdx, 'work', rowIdx, 'name', v)}
                      textFieldProps={{
                        size: 'small',
                        fullWidth: true,
                        placeholder: 'Робота',
                        onPaste: handlePaste(rowIdx, 0),
                        onFocus: () => activateCell(rowKey, 'name'),
                        onContextMenu: (e: any) => openCtx(e, rowKey, 'name'),
                      }}
                    />
                  )}
                </Box>

                <Box
                  onMouseDown={() => activateCell(rowKey, 'unit')}
                  data-kp-cell="1" data-rowkey={rowKey} data-col="unit"
                  onContextMenuCapture={(e) => openCtx(e, rowKey, 'unit')}
                  sx={{
                    p: 0.35,
                    backgroundColor: getBg(rowKey, 'unit') || undefined,
                    ...(activeCell?.rowKey === rowKey && activeCell?.col === 'unit'
                      ? { boxShadow: 'inset 0 0 0 2px rgba(25,118,210,0.45)' }
                      : null),
                  }}
                >
                  <CommitTextField
                    value={rr.unit}
                    onCommit={(v) => setRowCell(stageIdx, kind, rowIdx, 'unit', v)}
                    textFieldProps={{
                      size: 'small',
                      fullWidth: true,
                      onPaste: handlePaste(rowIdx, 1),
                      onFocus: () => activateCell(rowKey, 'unit'),
                      onContextMenu: (e: any) => openCtx(e, rowKey, 'unit'),
                    }}
                  />
                </Box>

                <Box
                  onMouseDown={() => activateCell(rowKey, 'qty')}
                  data-kp-cell="1" data-rowkey={rowKey} data-col="qty"
                  onContextMenuCapture={(e) => openCtx(e, rowKey, 'qty')}
                  sx={{
                    p: 0.35,
                    backgroundColor: getBg(rowKey, 'qty') || undefined,
                    ...(activeCell?.rowKey === rowKey && activeCell?.col === 'qty'
                      ? { boxShadow: 'inset 0 0 0 2px rgba(25,118,210,0.45)' }
                      : null),
                  }}
                >
                  <CommitTextField
                    value={rr.qty}
                    onCommit={(v) => setRowCell(stageIdx, kind, rowIdx, 'qty', v)}
                    textFieldProps={{
                      size: 'small',
                      fullWidth: true,
                      onPaste: handlePaste(rowIdx, 2),
                      onFocus: () => activateCell(rowKey, 'qty'),
                      onContextMenu: (e: any) => openCtx(e, rowKey, 'qty'),
                      inputProps: { style: { textAlign: 'right' } },
                    }}
                  />
                </Box>

                <Box
                  onMouseDown={() => activateCell(rowKey, 'costPrice')}
                  data-kp-cell="1" data-rowkey={rowKey} data-col="costPrice"
                  onContextMenuCapture={(e) => openCtx(e, rowKey, 'costPrice')}
                  sx={{
                    p: 0.35,
                    backgroundColor: getBg(rowKey, 'costPrice') || undefined,
                    ...(activeCell?.rowKey === rowKey && activeCell?.col === 'costPrice'
                      ? { boxShadow: 'inset 0 0 0 2px rgba(25,118,210,0.45)' }
                      : null),
                  }}
                >
                  <CommitTextField
                    value={rr.costPrice}
                    onCommit={(v) => setRowCell(stageIdx, kind, rowIdx, 'costPrice', v)}
                    textFieldProps={{
                      size: 'small',
                      fullWidth: true,
                      onPaste: handlePaste(rowIdx, 3),
                      onFocus: () => activateCell(rowKey, 'costPrice'),
                      onContextMenu: (e: any) => openCtx(e, rowKey, 'costPrice'),
                      inputProps: { style: { textAlign: 'right' } },
                    }}
                  />
                </Box>

                <Box
                  onMouseDown={() => activateCell(rowKey, 'marginPct')}
                  data-kp-cell="1" data-rowkey={rowKey} data-col="marginPct"
                  onContextMenuCapture={(e) => openCtx(e, rowKey, 'marginPct')}
                  sx={{
                    p: 0.35,
                    backgroundColor: getBg(rowKey, 'marginPct') || undefined,
                    ...(activeCell?.rowKey === rowKey && activeCell?.col === 'marginPct'
                      ? { boxShadow: 'inset 0 0 0 2px rgba(25,118,210,0.45)' }
                      : null),
                  }}
                >
                  <CommitTextField
                    value={rr.marginPct}
                    onCommit={(v) => setRowCell(stageIdx, kind, rowIdx, 'marginPct', v)}
                    textFieldProps={{
                      size: 'small',
                      fullWidth: true,
                      onPaste: handlePaste(rowIdx, 4),
                      onFocus: () => activateCell(rowKey, 'marginPct'),
                      onContextMenu: (e: any) => openCtx(e, rowKey, 'marginPct'),
                      inputProps: { style: { textAlign: 'right' } },
                    }}
                  />
                </Box>

                <Box
                  onMouseDown={() => activateCell(rowKey, 'discountPct')}
                  data-kp-cell="1" data-rowkey={rowKey} data-col="discountPct"
                  onContextMenuCapture={(e) => openCtx(e, rowKey, 'discountPct')}
                  sx={{
                    p: 0.35,
                    backgroundColor: getBg(rowKey, 'discountPct') || undefined,
                    ...(activeCell?.rowKey === rowKey && activeCell?.col === 'discountPct'
                      ? { boxShadow: 'inset 0 0 0 2px rgba(25,118,210,0.45)' }
                      : null),
                  }}
                >
                  <CommitTextField
                    value={rr.discountPct}
                    onCommit={(v) => setRowCell(stageIdx, kind, rowIdx, 'discountPct', v)}
                    textFieldProps={{
                      size: 'small',
                      fullWidth: true,
                      onPaste: handlePaste(rowIdx, 5),
                      onFocus: () => activateCell(rowKey, 'discountPct'),
                      onContextMenu: (e: any) => openCtx(e, rowKey, 'discountPct'),
                      inputProps: { style: { textAlign: 'right' } },
                    }}
                  />
                </Box>

                <Box
                  onMouseDown={() => activateCell(rowKey, 'clientPrice')}
                  data-kp-cell="1" data-rowkey={rowKey} data-col="clientPrice"
                  onContextMenuCapture={(e) => openCtx(e, rowKey, 'clientPrice')}
                  sx={{
                    p: 0.5,
                    fontSize: 12,
                    textAlign: 'right',
                    backgroundColor: getBg(rowKey, 'clientPrice') || undefined,
                    ...(activeCell?.rowKey === rowKey && activeCell?.col === 'clientPrice'
                      ? { boxShadow: 'inset 0 0 0 2px rgba(25,118,210,0.45)' }
                      : null),
                  }}
                >
                  {rr.clientPrice}
                </Box>
                <Box
                  onMouseDown={() => activateCell(rowKey, 'amount')}
                  data-kp-cell="1" data-rowkey={rowKey} data-col="amount"
                  onContextMenuCapture={(e) => openCtx(e, rowKey, 'amount')}
                  sx={{
                    p: 0.5,
                    fontSize: 12,
                    textAlign: 'right',
                    fontWeight: 700,
                    backgroundColor: getBg(rowKey, 'amount') || undefined,
                    ...(activeCell?.rowKey === rowKey && activeCell?.col === 'amount'
                      ? { boxShadow: 'inset 0 0 0 2px rgba(25,118,210,0.45)' }
                      : null),
                  }}
                >
                  {rr.amount}
                </Box>

                <Stack direction="row" gap={0.5} justifyContent="center">
                  <IconButton size="small" onClick={() => copyRow(stageIdx, kind, rr)} title="Дублювати">
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => deleteRow(stageIdx, kind, rr.id)} title="Видалити">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Box>
            );
          })}

          {/* Підсумковий рядок (видимі / всі) */}
          <Box
            sx={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns,
              minWidth: 1150,
              background: '#f8fafc',
              fontWeight: 600,
              borderTop: `1px solid ${GRID}`,
              position: 'sticky',
              bottom: 0,
              zIndex: 3,
              boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {/* # */}
            <Box sx={{ p: 0.5, textAlign: 'center', borderRight: `1px solid ${GRID}` }} />

            {/* Найменування */}
            <Box sx={{ p: 0.5, borderRight: `1px solid ${GRID}` }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.1 }}>
                Разом (видимі)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.1, mt: 0.2 }}>
                Разом (всі)
              </Typography>
            </Box>

            {/* Од. */}
            <Box sx={{ p: 0.5, borderRight: `1px solid ${GRID}` }} />

            {/* К-сть */}
            <Box sx={{ p: 0.5, borderRight: `1px solid ${GRID}` }} />

            {/* Собівартість */}
            <Box sx={{ p: 0.5, textAlign: 'right', borderRight: `1px solid ${GRID}` }}>
              <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.1 }}>
                {f2(totalsVisible.costSum)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.1, mt: 0.2 }}>
                {f2(totalsAll.costSum)}
              </Typography>
            </Box>

            {/* Маржа % */}
            <Box sx={{ p: 0.5, borderRight: `1px solid ${GRID}` }} />

            {/* Знижка % */}
            <Box sx={{ p: 0.5, borderRight: `1px solid ${GRID}` }} />

            {/* Ціна клієнта */}
            <Box sx={{ p: 0.5, borderRight: `1px solid ${GRID}` }} />

            {/* Сума */}
            <Box sx={{ p: 0.5, textAlign: 'right', borderRight: `1px solid ${GRID}` }}>
              <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.1, fontWeight: 700 }}>
                {f2(totalsVisible.amountSum)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.1, mt: 0.2, fontWeight: 700 }}>
                {f2(totalsAll.amountSum)}
              </Typography>
            </Box>

            {/* Дії */}
            <Box sx={{ p: 0.5 }} />
          </Box>

          <Menu
            open={Boolean(ctxMenu)}
            onClose={() => setCtxMenu(null)}
            anchorReference="anchorPosition"
            anchorPosition={ctxMenu ? { top: ctxMenu.mouseY, left: ctxMenu.mouseX } : undefined}
          >
            <Box sx={{ px: 1, py: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Заливка клітинки / рядка / стовпця
              </Typography>
            </Box>

            <Divider />

            {(['cell', 'row', 'col'] as const).map((t) => (
              <Box key={t} sx={{ px: 1, py: 0.75 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {t === 'cell' ? 'Клітинка' : t === 'row' ? 'Рядок' : 'Стовпець'}
                </Typography>
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                  {COLORS.map((c) => (
                    <Box
                      key={`${t}-${c.label}`}
                      onClick={() => applyFill(t, c.value)}
                      title={c.label}
                      sx={{
                        width: 18,
                        height: 18,
                        borderRadius: 0.75,
                        border: '1px solid rgba(0,0,0,0.18)',
                        backgroundColor: c.value ? c.value : 'transparent',
                        cursor: 'pointer',
                        display: 'inline-block',
                      }}
                    />
                  ))}
                  <Button size="small" variant="text" onClick={() => clearFill(t)}>
                    Очистити
                  </Button>
                </Stack>
              </Box>
            ))}
          </Menu>
        </Box>
      </Box>
    );
  }
  void RowTable;

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} gap={2} mb={2}>
        <Box>
          <Typography variant="h6">Продажі • КП</Typography>
          <Typography variant="body2" color="text.secondary">
            КП побудована як Акт: етапи робіт → роботи/матеріали → підсумок етапу + %.
          </Typography>
        </Box>

        <Stack direction="row" gap={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Об'єкт</InputLabel>
            <Select
              label="Об'єкт"
              value={projectId}
              onChange={(e) => {
                setProjectId((e.target.value as any) ?? '');
                setDocId('');
              }}
            >
              <MenuItem value="">
                <em>Не вибрано</em>
              </MenuItem>
              {objects.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 220 }} disabled={!projectId}>
            <InputLabel>КП (з бази)</InputLabel>
            <Select
              label="КП (з бази)"
              value={docId}
              onChange={(e) => onPickDoc((e.target.value as any) ?? '')}
            >
              <MenuItem value="">
                <em>Поточне (не з бази)</em>
              </MenuItem>
              {docs.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  #{d.id} {d.title || 'КП'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="outlined" onClick={onSaveToDb} disabled={!projectId || isStagesPending}>
            Зберегти в базу
          </Button>

          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => addStage()}>
            Додати етап
          </Button>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Шаблон КП</InputLabel>
            <Select
              label="Шаблон КП"
              value={templateId}
              onChange={(e) => setTemplateId(String(e.target.value))}
            >
              {templates.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="outlined" onClick={createFromTemplate}>
            Застосувати
          </Button>
          <Button variant="outlined" onClick={saveAsTemplate}>
            Зберегти як новий
          </Button>
          <Button variant="outlined" onClick={updateSelectedTemplate} disabled={!templateId}>
            Оновити
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={deleteSelectedTemplate}
            disabled={!templateId || templates.length <= 1}
          >
            Видалити
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={onPrint}>
            Друк / PDF
          </Button>
        </Stack>
      </Stack>

      {err ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      ) : null}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={2} mb={2} alignItems="center">
            <TextField fullWidth label="Назва КП" value={title} onChange={(e) => setTitle(e.target.value)} size="small" />
            {sheetDocId != null && (
              <Typography variant="subtitle1" sx={{ fontWeight: 700, minWidth: 140 }}>
                Разом: {quoteTotals != null ? quoteTotals.toFixed(2) : '—'}
              </Typography>
            )}
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {(sheetDocId != null ? mode !== 'loading' : true) && (
            <Box sx={{ mb: 2, width: '100%' }}>
              <Sheet
                config={quoteSheetConfig}
                adapter={adapter ?? undefined}
                documentId={sheetDocId}
                initialSnapshot={sheetDocId != null ? initialSnapshot : null}
                readonly={sheetDocId != null && mode === 'readonly'}
                onSaved={onSheetSaved}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}