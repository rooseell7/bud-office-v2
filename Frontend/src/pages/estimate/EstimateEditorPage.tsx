import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import { Sheet, formatUaMoney, formatPercent, type SheetTotals } from '../../sheet';
import { worksSheetConfig } from '../../sheet/configs/worksSheetConfig';
import { materialsSheetConfig } from '../../sheet/configs/materialsSheetConfig';
import { W_COL } from '../../sheet/configs/worksSheetConfig';
import { M_COL } from '../../sheet/configs/materialsSheetConfig';
import { useStageSheetAdapter } from '../../sheet/hooks/useStageSheetAdapter';
import { useAuth } from '../../modules/auth/AuthContext';
import {
  getDocumentWithStages,
  createStage,
  updateStage,
  deleteStage,
  duplicateStage,
  exportEstimateXlsx,
  buildDocKey,
  type EstimateStage,
} from '../../api/estimates';
import { acquireEditSession, releaseEditSession, getSheetHistory } from '../../api/documents';
import { lsGetJson, lsSetJson } from '../../shared/localStorageJson';
import { DEBUG_NAV } from '../../shared/config/env';
import { enableClickDebug } from '../../shared/debug/navDebug';

const HEARTBEAT_INTERVAL_MS = 25000;
const ESTIMATE_LOCK_COLUMNS = true;
/** Дозволити додавати колонки зліва/справа через ПКМ (без видалення/перейменування) */
const ESTIMATE_ALLOW_COLUMN_INSERT = true;
const LS_FOCUS_MODE = (estimateId: number) => `estimate:${estimateId}:focusMode`;
const LS_EXPANDED_STAGES = (estimateId: number) => `estimate:${estimateId}:expandedStages`;
const LS_HIDE_COST = (estimateId: number) => `estimate:${estimateId}:hideCost`;

export const EstimateEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!DEBUG_NAV) return;
    console.log('[EDIT] mount');
    return () => console.log('[EDIT] unmount');
  }, []);
  useEffect(() => {
    if (!DEBUG_NAV) return;
    console.log('[EDIT] location:', loc.pathname, 'key:', (loc as any).key);
  }, [loc.pathname, (loc as any).key]);
  useEffect(() => {
    if (!DEBUG_NAV) return;
    const off = enableClickDebug();
    return () => off();
  }, []);
  const goBack = () => {
    const target = (loc.state as { from?: string })?.from || '/estimate';
    window.location.href = target;
  };
  const { can } = useAuth();
  const estimateId = id ? parseInt(id, 10) : NaN;
  const validId = Number.isFinite(estimateId) && estimateId > 0 ? estimateId : null;

  const [doc, setDoc] = useState<Awaited<ReturnType<typeof getDocumentWithStages>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusMode, setFocusModeState] = useState<boolean>(true);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(() => new Set());
  const [viewMode, setViewMode] = useState(false);
  const [hideCost, setHideCostState] = useState(false);

  useEffect(() => {
    if (!validId) return;
    setFocusModeState(lsGetJson(LS_FOCUS_MODE(validId), true));
    setHideCostState(lsGetJson(LS_HIDE_COST(validId), false));
  }, [validId]);

  const setFocusMode = useCallback(
    (v: boolean) => {
      setFocusModeState(v);
      if (validId) lsSetJson(LS_FOCUS_MODE(validId), v);
    },
    [validId],
  );
  const setHideCost = useCallback(
    (v: boolean) => {
      setHideCostState(v);
      if (validId) lsSetJson(LS_HIDE_COST(validId), v);
    },
    [validId],
  );
  const [activeTabByStage, setActiveTabByStage] = useState<Record<string, number>>({});
  const [renameStageId, setRenameStageId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmStage, setDeleteConfirmStage] = useState<EstimateStage | null>(null);
  const [addingStage, setAddingStage] = useState(false);
  const [duplicatingStageId, setDuplicatingStageId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getSheetHistory>>>([]);
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [totalsByStage, setTotalsByStage] = useState<Record<string, { works: SheetTotals; materials: SheetTotals }>>({});

  const canWrite = can('estimates:write') || can('documents:write') || can('sheet:write');
  const canDeleteStage = canWrite;

  const loadDoc = useCallback(async () => {
    if (!validId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDocumentWithStages(validId);
      setDoc(data);
      const stageIds = new Set(data.stages.map((s) => s.id));
      setExpandedStages((prev) => {
        const saved = lsGetJson<string[]>(LS_EXPANDED_STAGES(validId), []);
        const valid = saved.filter((id) => stageIds.has(id));
        let next: Set<string>;
        if (valid.length > 0) next = new Set(valid);
        else if (prev.size > 0) {
          const filtered = [...prev].filter((id) => stageIds.has(id));
          next = filtered.length > 0 ? new Set(filtered) : new Set(data.stages.length > 0 ? [data.stages[0].id] : []);
        } else next = data.stages.length > 0 ? new Set([data.stages[0].id]) : new Set();
        if (validId && next.size > 0) lsSetJson(LS_EXPANDED_STAGES(validId), [...next]);
        return next;
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [validId]);

  useEffect(() => {
    if (!validId) {
      setLoading(false);
      return;
    }
    loadDoc();
  }, [validId, loadDoc]);

  useEffect(() => {
    if (!validId || !canWrite) return;
    let token: string | null = null;
    acquireEditSession(validId)
      .then((s) => {
        token = s.token;
      })
      .catch(() => {});
    const beat = () => {
      if (token) {
        import('../../api/documents').then(({ heartbeatEditSession }) =>
          heartbeatEditSession(validId!, token!).catch(() => {}),
        );
      }
    };
    const id_ = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => {
      clearInterval(id_);
      if (token) releaseEditSession(validId!, token).catch(() => {});
    };
  }, [validId, canWrite]);

  const handleAddStage = async () => {
    if (!validId) return;
    setAddingStage(true);
    try {
      const stage = await createStage(validId, {
        name: `Етап ${(doc?.stages?.length ?? 0) + 1}`,
      });
      await loadDoc();
      setExpandedStages((prev) => {
        const next = focusMode ? new Set([stage.id]) : new Set([...prev, stage.id]);
        if (validId) lsSetJson(LS_EXPANDED_STAGES(validId), [...next]);
        return next;
      });
      setActiveTabByStage((prev) => ({ ...prev, [stage.id]: 0 }));
    } finally {
      setAddingStage(false);
    }
  };

  const handleStageExpand = useCallback(
    (stageId: string) => {
      setExpandedStages((prev) => {
        const next = focusMode ? new Set([stageId]) : new Set([...prev, stageId]);
        if (validId) lsSetJson(LS_EXPANDED_STAGES(validId), [...next]);
        return next;
      });
    },
    [focusMode, validId],
  );

  const handleStageCollapse = useCallback(
    (stageId: string) => {
      setExpandedStages((prev) => {
        const next = new Set(prev);
        next.delete(stageId);
        if (validId) lsSetJson(LS_EXPANDED_STAGES(validId), [...next]);
        return next;
      });
    },
    [validId],
  );

  const handleRenameStage = async () => {
    if (!validId || !renameStageId || !renameValue.trim()) {
      setRenameStageId(null);
      return;
    }
    try {
      await updateStage(validId, renameStageId, { name: renameValue.trim() });
      await loadDoc();
    } finally {
      setRenameStageId(null);
    }
  };

  const handleDuplicateStage = async (stageId: string) => {
    if (!validId) return;
    setDuplicatingStageId(stageId);
    try {
      const stage = await duplicateStage(validId, stageId);
      await loadDoc();
      setExpandedStages((prev) => {
        const next = new Set(prev);
        next.add(stage.id);
        if (validId) lsSetJson(LS_EXPANDED_STAGES(validId), [...next]);
        return next;
      });
      setActiveTabByStage((prev) => ({ ...prev, [stage.id]: 0 }));
    } catch {
      // error handled by loadDoc
    } finally {
      setDuplicatingStageId(null);
    }
  };

  const loadHistory = useCallback(async () => {
    if (!validId) return;
    try {
      const h = await getSheetHistory(validId, 20);
      setHistory(h);
    } catch {
      setHistory([]);
    }
  }, [validId]);

  useEffect(() => {
    if (historyOpen && validId) loadHistory();
  }, [historyOpen, validId, loadHistory]);

  const handleExport = useCallback(async () => {
    if (!validId) return;
    setExporting(true);
    try {
      const blob = await exportEstimateXlsx(validId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `КП-${validId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [validId]);

  const handleDeleteStage = async () => {
    if (!validId || !deleteConfirmStage) return;
    try {
      await deleteStage(validId, deleteConfirmStage.id);
      await loadDoc();
      setDeleteConfirmStage(null);
    } finally {
      setDeleteConfirmStage(null);
    }
  };

  if (!validId) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/estimate')}>
          Назад
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          Невірний ідентифікатор
        </Typography>
      </Box>
    );
  }

  if (loading && !doc) {
    return (
      <Box>
        <Typography>Завантаження…</Typography>
      </Box>
    );
  }

  if (error && !doc) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={goBack}>
          Назад
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="estimate-editor-full" sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={goBack}
        >
          Назад
        </Button>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {doc?.title ?? `КП #${validId}`}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          {canWrite && (
            <Tooltip title="Режим тільки перегляд — без редагування">
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={viewMode}
                    onChange={(_, v) => setViewMode(v)}
                    color="primary"
                  />
                }
                label={<Typography sx={{ fontSize: 12 }}>Тільки перегляд</Typography>}
              />
            </Tooltip>
          )}
          <Tooltip title="Приховати колонки собівартості">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={hideCost}
                  onChange={(_, v) => setHideCost(v)}
                  color="primary"
                />
              }
              label={<Typography sx={{ fontSize: 12 }}>Приховати собівартість</Typography>}
            />
          </Tooltip>
          {doc?.stages && doc.stages.length > 0 && (
            <Tooltip title="При відкритті етапу інші згортаються">
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={focusMode}
                    onChange={(_, v) => setFocusMode(v)}
                    color="primary"
                  />
                }
                label={
                  <Typography sx={{ fontSize: 12 }}>Фокус етапу</Typography>
                }
              />
            </Tooltip>
          )}
        </Box>
        <Button
          size="small"
          startIcon={<DownloadIcon />}
          onClick={handleExport}
          disabled={exporting || !doc?.stages?.length}
        >
          {exporting ? '…' : 'Експорт XLSX'}
        </Button>
        <Tooltip title={historyOpen ? 'Згорнути історію' : 'Історія змін'}>
          <IconButton size="small" onClick={() => setHistoryOpen((v) => !v)} color={historyOpen ? 'primary' : 'default'}>
            <HistoryIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Collapse in={historyOpen}>
        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Останні зміни
          </Typography>
          {history.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Історія змін поки відсутня
            </Typography>
          ) : (
            <Box component="ul" sx={{ m: 0, pl: 2.5, fontSize: 13 }}>
              {history.map((item) => (
                <li key={`${item.kind}-${item.id}`}>
                  {item.kind === 'version' ? 'Версія' : 'Оновлення'} #{item.id} ·{' '}
                  {item.createdAt ? new Date(item.createdAt).toLocaleString('uk-UA') : ''}
                  {item.note ? ` · ${item.note}` : ''}
                </li>
              ))}
            </Box>
          )}
        </Box>
      </Collapse>

      {doc?.stages && doc.stages.length > 0 && (() => {
        const agg = doc.stages.reduce(
          (a, s) => {
            const t = totalsByStage[s.id];
            if (t) {
              a.worksSum += t.works.sum;
              a.worksCost += t.works.cost;
              a.materialsSum += t.materials.sum;
              a.materialsCost += t.materials.cost;
            }
            return a;
          },
          { worksSum: 0, worksCost: 0, materialsSum: 0, materialsCost: 0 },
        );
        const totalSum = agg.worksSum + agg.materialsSum;
        const totalCost = agg.worksCost + agg.materialsCost;
        const totalProfit = totalSum - totalCost;
        const marginPct = totalSum > 0 ? (totalProfit / totalSum) * 100 : 0;
        const SumRow = ({ label, value }: { label: string; value: string }) => (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{label}:</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{value}</Typography>
          </Box>
        );
        return (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 2,
              p: 0.75,
              mb: 1,
              borderRadius: 1,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              alignItems: 'center',
            }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mr: 0.5 }}>
              Загалом КП
            </Typography>
            {hideCost ? (
              <>
                <SumRow label="Сума в роботах" value={formatUaMoney(agg.worksSum)} />
                <SumRow label="Сума в матеріалах" value={formatUaMoney(agg.materialsSum)} />
                <SumRow label="Всього" value={formatUaMoney(totalSum)} />
              </>
            ) : (
              <>
                <SumRow label="Роботи: сума" value={formatUaMoney(agg.worksSum)} />
                <SumRow label="Роботи: собівартість" value={formatUaMoney(agg.worksCost)} />
                <SumRow label="Роботи: прибуток" value={formatUaMoney(agg.worksSum - agg.worksCost)} />
                <SumRow label="Матеріали: сума" value={formatUaMoney(agg.materialsSum)} />
                <SumRow label="Матеріали: собівартість" value={formatUaMoney(agg.materialsCost)} />
                <SumRow label="Матеріали: прибуток" value={formatUaMoney(agg.materialsSum - agg.materialsCost)} />
                <SumRow label="Всього: сума" value={formatUaMoney(totalSum)} />
                <SumRow label="Всього: собівартість" value={formatUaMoney(totalCost)} />
                <SumRow label="Маржа" value={formatPercent(marginPct)} />
                <SumRow label="Прибуток" value={formatUaMoney(totalProfit)} />
              </>
            )}
          </Box>
        );
      })()}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 1 }}>
          Етапи
        </Typography>
        {canWrite && !viewMode && (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddStage}
            disabled={addingStage}
          >
            Додати етап
          </Button>
        )}
      </Box>

      {doc?.stages?.length === 0 ? (
        <Box sx={{ py: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Немає етапів. Додайте перший етап.
          </Typography>
          {canWrite && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddStage}
              disabled={addingStage}
            >
              Додати етап
            </Button>
          )}
        </Box>
      ) : (
        doc?.stages?.map((stage) => (
          <Box
            key={stage.id}
            ref={(el) => {
              if (el) stageRefs.current[stage.id] = el;
              else delete stageRefs.current[stage.id];
            }}
          >
            <StageAccordion
              stage={stage}
              estimateId={validId!}
              expanded={expandedStages.has(stage.id)}
              onExpand={() => handleStageExpand(stage.id)}
              onCollapse={() => handleStageCollapse(stage.id)}
              activeTab={activeTabByStage[stage.id] ?? 0}
              onTabChange={(v) =>
                setActiveTabByStage((prev) => ({ ...prev, [stage.id]: v }))
              }
              canEdit={!viewMode && canWrite}
              canDelete={canDeleteStage && !viewMode}
              hideCost={hideCost}
              onRenameClick={() => {
                setRenameStageId(stage.id);
                setRenameValue(stage.name);
              }}
              onDuplicateClick={() => handleDuplicateStage(stage.id)}
              isDuplicating={duplicatingStageId === stage.id}
              onDeleteClick={() => setDeleteConfirmStage(stage)}
              onTotalsChange={(works, materials) =>
                setTotalsByStage((prev) => ({ ...prev, [stage.id]: { works, materials } }))
              }
            />
          </Box>
        ))
      )}

      <Dialog open={!!renameStageId} onClose={() => setRenameStageId(null)}>
        <DialogTitle>Перейменувати етап</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameStage();
              if (e.key === 'Escape') setRenameStageId(null);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameStageId(null)}>Скасувати</Button>
          <Button variant="contained" onClick={handleRenameStage} disabled={!renameValue.trim()}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirmStage} onClose={() => setDeleteConfirmStage(null)}>
        <DialogTitle>Видалити етап</DialogTitle>
        <DialogContent>
          <Typography>
            Видалити етап &quot;{deleteConfirmStage?.name}&quot;? Дані робіт і матеріалів
            будуть втрачені.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmStage(null)}>Скасувати</Button>
          <Button color="error" variant="contained" onClick={handleDeleteStage}>
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

function StageTotalsBlock({
  worksTotals,
  materialsTotals,
  hideCost = false,
}: {
  worksTotals: SheetTotals;
  materialsTotals: SheetTotals;
  hideCost?: boolean;
}) {
  const stageSum = worksTotals.sum + materialsTotals.sum;
  const stageCost = worksTotals.cost + materialsTotals.cost;
  const stageProfit = stageSum - stageCost;
  const marginPct = stageSum > 0 ? (stageProfit / stageSum) * 100 : 0;
  const SumItem = ({ label, value }: { label: string; value: string }) => (
    <Box sx={{ display: 'flex', gap: 0.5, fontSize: 12 }}>
      <span style={{ color: 'var(--mui-palette-text-secondary)' }}>{label}:</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </Box>
  );
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 0.25,
        px: 1.5,
        py: 0.75,
        fontSize: 12,
        bgcolor: 'action.hover',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {hideCost ? (
        <>
          <SumItem label="Роботи" value={formatUaMoney(worksTotals.sum)} />
          <SumItem label="Матеріали" value={formatUaMoney(materialsTotals.sum)} />
          <SumItem label="Етап" value={formatUaMoney(stageSum)} />
        </>
      ) : (
        <>
          <SumItem label="Роботи" value={`${formatUaMoney(worksTotals.sum)} / соб. ${formatUaMoney(worksTotals.cost)}`} />
          <SumItem label="Матеріали" value={`${formatUaMoney(materialsTotals.sum)} / соб. ${formatUaMoney(materialsTotals.cost)}`} />
          <SumItem label="Етап" value={`${formatUaMoney(stageSum)} · маржа ${formatPercent(marginPct)}`} />
        </>
      )}
    </Box>
  );
}

type StageAccordionProps = {
  stage: EstimateStage;
  estimateId: number;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  activeTab: number;
  onTabChange: (v: number) => void;
  canEdit: boolean;
  canDelete: boolean;
  hideCost: boolean;
  onRenameClick: () => void;
  onDuplicateClick: () => void;
  isDuplicating?: boolean;
  onDeleteClick: () => void;
  onTotalsChange?: (works: SheetTotals, materials: SheetTotals) => void;
};

function StageAccordion({
  stage,
  estimateId,
  expanded,
  onExpand,
  onCollapse,
  activeTab,
  onTabChange,
  canEdit,
  canDelete,
  hideCost,
  onRenameClick,
  onDuplicateClick,
  isDuplicating = false,
  onDeleteClick,
  onTotalsChange,
}: StageAccordionProps) {
  const sheetType = activeTab === 0 ? 'works' : 'materials';
  const docKey = buildDocKey(estimateId, stage.id, sheetType);
  const baseConfig = activeTab === 0 ? worksSheetConfig : materialsSheetConfig;
  const config = ESTIMATE_LOCK_COLUMNS
    ? {
        ...baseConfig,
        allowColumnInsert: ESTIMATE_ALLOW_COLUMN_INSERT,
        allowColumnDelete: false,
        allowColumnRename: false,
      }
    : baseConfig;
  const configWithAutocomplete = {
    ...config,
    autocompleteForColumn: { colIndex: 1, type: sheetType },
    hiddenColumns: hideCost ? [6, 7] : undefined,
    allowCellComments: true,
    allowFreeze: true,
  };
  const { adapter, initialSnapshot } = useStageSheetAdapter(estimateId, docKey);
  const [worksTotals, setWorksTotals] = React.useState<SheetTotals>({ sum: 0, cost: 0, profit: 0 });
  const [materialsTotals, setMaterialsTotals] = React.useState<SheetTotals>({ sum: 0, cost: 0, profit: 0 });

  React.useEffect(() => {
    onTotalsChange?.(worksTotals, materialsTotals);
  }, [worksTotals, materialsTotals, onTotalsChange]);

  const handleTotalsChange = React.useCallback((t: SheetTotals) => {
    if (sheetType === 'works') setWorksTotals(t);
    else setMaterialsTotals(t);
  }, [sheetType]);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExp) => (isExp ? onExpand() : onCollapse())}
      sx={{
        '&:before': { display: 'none' },
        boxShadow: 0,
        border: '1px solid',
        borderColor: 'divider',
        mb: 0.5,
      }}
    >
      <AccordionSummary
        expandIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.5 } }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Typography variant="body2" fontWeight={600}>
            {stage.name}
          </Typography>
          {canEdit && (
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRenameClick(); }} aria-label="Перейменувати">
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {canEdit && (
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onDuplicateClick(); }}
              aria-label="Дублювати"
              disabled={isDuplicating}
            >
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          )}
          {canDelete && (
            <IconButton
              size="small"
              color="error"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick();
              }}
              aria-label="Видалити"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: 0 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => onTabChange(v)}
          sx={{ minHeight: 36, borderBottom: 1, borderColor: 'divider', px: 1 }}
        >
          <Tab label="Роботи" sx={{ minHeight: 36, py: 0.5 }} />
          <Tab label="Матеріали" sx={{ minHeight: 36, py: 0.5 }} />
        </Tabs>
        <Box sx={{ pt: 0.5, position: 'relative' }}>
          <Sheet
            config={configWithAutocomplete}
            adapter={adapter ?? undefined}
            documentId={null}
            initialSnapshot={initialSnapshot}
            readonly={!canEdit}
            totalsConfig={sheetType === 'works' ? { sumCol: W_COL.TOTAL, costCol: W_COL.COST_TOTAL } : { sumCol: M_COL.TOTAL, costCol: M_COL.COST_TOTAL }}
            onTotalsChange={handleTotalsChange}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
            <StageTotalsBlock
              worksTotals={worksTotals}
              materialsTotals={materialsTotals}
              hideCost={hideCost}
            />
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
