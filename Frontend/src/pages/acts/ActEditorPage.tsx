/**
 * Act editor — Sheet engine 1:1 with KP, Works only.
 * Sections = stages, each section has one Sheet (works).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Switch,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Sheet, formatUaMoney, formatPercent, type SheetTotals } from '../../sheet';
import { worksSheetConfig } from '../../sheet/configs/worksSheetConfig';
import { W_COL } from '../../sheet/configs/worksSheetConfig';
import { useActSheetAdapter } from '../../sheet/hooks/useActSheetAdapter';
import { useAuth } from '../../modules/auth/context/AuthContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { subscribeInvalidate } from '../../realtime/invalidateBus';
import { getAct, type ActDto } from '../../api/acts';
import { lsGetJson, lsSetJson } from '../../shared/localStorageJson';

const ACT_LOCK_COLUMNS = true;
const ACT_ALLOW_COLUMN_INSERT = true;
const LS_HIDE_COST = (actId: number) => `act:${actId}:hideCost`;
const LS_EXPANDED_SECTIONS = (actId: number) => `act:${actId}:expandedSections`;

function ensureBaseStructure(items: any[] | undefined): any[] {
  const src = Array.isArray(items) ? items : [];
  const out = [...src];
  const hasMeta = out.some((r: any) => r?.rowType === 'meta' || r?.type === 'meta');
  if (!hasMeta) out.unshift({ rowType: 'meta', type: 'meta', header: {} });
  const hasSection = out.some((r: any) => r?.rowType === 'section' || r?.type === 'section');
  const hasWork = out.some((r: any) => r?.rowType === 'work' || r?.type === 'work');
  if (!hasSection) out.push({ rowType: 'section', type: 'section', sectionKey: 'sec_1', title: 'Роботи' });
  if (!hasWork) out.push({ rowType: 'work', type: 'work', sectionKey: 'sec_1', name: '', unit: '', qty: 0, price: 0, costPrice: 0 });
  return out;
}

function extractSections(items: any[]): { sectionKey: string; title: string }[] {
  const seen = new Set<string>();
  const out: { sectionKey: string; title: string }[] = [];
  for (const r of items) {
    const t = r?.rowType ?? r?.type;
    if (t === 'section' && r?.sectionKey && !seen.has(r.sectionKey)) {
      seen.add(r.sectionKey);
      out.push({
        sectionKey: r.sectionKey,
        title: String(r?.title ?? 'Роботи'),
      });
    }
  }
  if (out.length === 0) out.push({ sectionKey: 'sec_1', title: 'Роботи' });
  return out;
}

export const ActEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loc = useLocation();
  const goBack = useCallback(() => {
    const target = (loc.state as { from?: string })?.from || '/estimate/acts';
    window.location.href = target;
  }, [loc.state]);

  const { can } = useAuth();
  const realtime = useRealtime();
  const actId = id ? parseInt(id, 10) : NaN;
  const validId = Number.isFinite(actId) && actId > 0 ? actId : null;

  const [act, setAct] = useState<ActDto | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hideCost, setHideCostState] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());
  const [viewMode, setViewMode] = useState(false);
  const [totalsBySection, setTotalsBySection] = useState<Record<string, SheetTotals>>({});

  const canWrite = can('delivery:write') || can('estimates:write');

  useEffect(() => {
    if (validId != null && act != null)
      console.info('[ActEditor] actId=', validId, 'projectId=', act.projectId, 'docId=act sections (per section)');
  }, [validId, act]);

  useEffect(() => {
    if (!validId) return;
    setHideCostState(lsGetJson(LS_HIDE_COST(validId), false));
  }, [validId]);

  const setHideCost = useCallback(
    (v: boolean) => {
      setHideCostState(v);
      if (validId) lsSetJson(LS_HIDE_COST(validId), v);
    },
    [validId],
  );

  const loadAct = useCallback(async () => {
    if (!validId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAct(validId);
      setAct(data);
      const normalized = ensureBaseStructure(data.items);
      setItems(normalized);
      const sections = extractSections(normalized);
      setExpandedSections((prev) => {
        const saved = lsGetJson<string[]>(LS_EXPANDED_SECTIONS(validId), []);
        const valid = saved.filter((s) => sections.some((sec) => sec.sectionKey === s));
        if (valid.length > 0) return new Set(valid);
        if (prev.size > 0) {
          const filtered = [...prev].filter((s) => sections.some((sec) => sec.sectionKey === s));
          return filtered.length > 0 ? new Set(filtered) : new Set(sections.map((s) => s.sectionKey));
        }
        return new Set(sections.slice(0, 1).map((s) => s.sectionKey));
      });
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || 'Помилка завантаження';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [validId]);

  useEffect(() => {
    if (!validId) {
      setLoading(false);
      return;
    }
    loadAct();
  }, [validId, loadAct]);

  // Live: join project room to receive bo:invalidate when act is updated by others
  useEffect(() => {
    if (!realtime || !act?.projectId) return;
    const pid = Number(act.projectId);
    if (!Number.isFinite(pid) || pid <= 0) return;
    realtime.joinProject(pid);
    return () => {
      realtime.leaveProject(pid);
    };
  }, [realtime, act?.projectId]);

  // Presence: tell server we're viewing/editing this act
  useEffect(() => {
    if (!realtime?.sendPresenceHello || !act) return;
    realtime.sendPresenceHello({
      projectId: act.projectId ?? null,
      entityType: 'act',
      entityId: String(act.id),
      route: `/delivery/acts/${act.id}`,
      mode: canWrite && !viewMode ? 'edit' : 'view',
    });
  }, [realtime, act?.id, act?.projectId, canWrite, viewMode]);

  // Live: refetch act when bo:invalidate for this act is received
  useEffect(() => {
    if (!validId || !realtime) return;
    const unsub = subscribeInvalidate((payload) => {
      if (payload?.entityType === 'act' && String(payload?.entityId) === String(validId)) {
        loadAct();
      }
    });
    return unsub;
  }, [validId, realtime, loadAct]);

  const handleSectionExpand = useCallback(
    (sectionKey: string) => {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        next.add(sectionKey);
        if (validId) lsSetJson(LS_EXPANDED_SECTIONS(validId), [...next]);
        return next;
      });
    },
    [validId],
  );

  const handleSectionCollapse = useCallback(
    (sectionKey: string) => {
      setExpandedSections((prev) => {
        const next = new Set(prev);
        next.delete(sectionKey);
        if (validId) lsSetJson(LS_EXPANDED_SECTIONS(validId), [...next]);
        return next;
      });
    },
    [validId],
  );

  const sections = useMemo(() => extractSections(items), [items]);

  const agg = useMemo(() => {
    let worksSum = 0;
    let worksCost = 0;
    for (const t of Object.values(totalsBySection)) {
      worksSum += t.sum;
      worksCost += t.cost;
    }
    return { worksSum, worksCost };
  }, [totalsBySection]);

  if (!validId) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/estimate/acts')}>
          Назад
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          Невірний ідентифікатор
        </Typography>
      </Box>
    );
  }

  if (loading && !act) {
    return (
      <Box>
        <Typography>Завантаження…</Typography>
      </Box>
    );
  }

  if (error && !act) {
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

  if (!act) {
    return null;
  }

  const totalSum = agg.worksSum;
  const totalCost = agg.worksCost;
  const totalProfit = totalSum - totalCost;
  const marginPct = totalSum > 0 ? (totalProfit / totalSum) * 100 : 0;

  return (
    <Box className="act-editor-full" sx={{ width: '100%', maxWidth: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={goBack}>
          Назад
        </Button>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Акт №{act.id}
        </Typography>
        <Chip size="small" label={`Дата: ${act.actDate}`} />
        <Chip size="small" label={act.status} />
        {canWrite && (
          <Tooltip title="Режим тільки перегляд">
            <FormControlLabel
              control={<Switch size="small" checked={viewMode} onChange={(_, v) => setViewMode(v)} color="primary" />}
              label={<Typography sx={{ fontSize: 12 }}>Тільки перегляд</Typography>}
            />
          </Tooltip>
        )}
        <Tooltip title="Приховати колонки собівартості">
          <FormControlLabel
            control={<Switch size="small" checked={hideCost} onChange={(_, v) => setHideCost(v)} color="primary" />}
            label={<Typography sx={{ fontSize: 12 }}>Приховати собівартість</Typography>}
          />
        </Tooltip>
      </Box>

      <Box
        sx={{
          display: 'flex',
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
          Загалом по акту
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Роботи:</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatUaMoney(agg.worksSum)}</Typography>
        </Box>
        {!hideCost && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Собівартість:</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatUaMoney(totalCost)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Маржа:</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatPercent(marginPct)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Прибуток:</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatUaMoney(totalProfit)}</Typography>
            </Box>
          </>
        )}
      </Box>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Секції (роботи)
      </Typography>

      {sections.length === 0 ? (
        <Typography color="text.secondary">Немає секцій</Typography>
      ) : (
        sections.map((sec) => (
          <ActSectionAccordion
            key={sec.sectionKey}
            section={sec}
            actId={validId}
            items={items}
            onItemsRefresh={() => loadAct()}
            expanded={expandedSections.has(sec.sectionKey)}
            onExpand={() => handleSectionExpand(sec.sectionKey)}
            onCollapse={() => handleSectionCollapse(sec.sectionKey)}
            canEdit={!viewMode && canWrite}
            hideCost={hideCost}
            onTotalsChange={(t) => setTotalsBySection((prev) => ({ ...prev, [sec.sectionKey]: t }))}
          />
        ))
      )}
    </Box>
  );
};

type ActSectionAccordionProps = {
  section: { sectionKey: string; title: string };
  actId: number;
  items: any[];
  onItemsRefresh: () => void;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  canEdit: boolean;
  hideCost: boolean;
  onTotalsChange: (t: SheetTotals) => void;
};

function ActSectionAccordion({
  section,
  actId,
  items,
  onItemsRefresh,
  expanded,
  onExpand,
  onCollapse,
  canEdit,
  hideCost,
  onTotalsChange,
}: ActSectionAccordionProps) {
  const config = ACT_LOCK_COLUMNS
    ? {
        ...worksSheetConfig,
        allowColumnInsert: ACT_ALLOW_COLUMN_INSERT,
        allowColumnDelete: false,
        allowColumnRename: false,
      }
    : worksSheetConfig;
  const configWithAutocomplete = {
    ...config,
    autocompleteForColumn: { colIndex: 1, type: 'works' as const },
    hiddenColumns: hideCost ? [6, 7] : undefined,
    allowCellComments: true,
    allowFreeze: true,
  };

  const { adapter, initialSnapshot } = useActSheetAdapter(actId, section.sectionKey, items, onItemsRefresh ?? undefined);
  const [sectionTotals, setSectionTotals] = React.useState<SheetTotals>({ sum: 0, cost: 0, profit: 0 });
  const actDocId = actId != null && section.sectionKey ? `act:${actId}:${section.sectionKey}` : null;

  React.useEffect(() => {
    onTotalsChange(sectionTotals);
  }, [sectionTotals, onTotalsChange]);

  const handleTotalsChange = React.useCallback((t: SheetTotals) => {
    setSectionTotals(t);
  }, []);

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
      <AccordionSummary expandIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />} sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: 0.5 } }}>
        <Typography variant="body2" fontWeight={600}>
          {section.title}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: 0 }}>
        <Box sx={{ pt: 0.5, position: 'relative' }}>
          <Sheet
            config={configWithAutocomplete}
            adapter={adapter ?? undefined}
            documentId={actDocId}
            initialSnapshot={initialSnapshot}
            readonly={!canEdit}
            totalsConfig={{ sumCol: W_COL.TOTAL, costCol: W_COL.COST_TOTAL }}
            onTotalsChange={handleTotalsChange}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
            <SectionTotalsBlock totals={sectionTotals} hideCost={hideCost} />
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

function SectionTotalsBlock({ totals, hideCost }: { totals: SheetTotals; hideCost: boolean }) {
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
        <span>
          <span style={{ color: 'var(--mui-palette-text-secondary)' }}>Роботи:</span> <strong>{formatUaMoney(totals.sum)}</strong>
        </span>
      ) : (
        <>
          <span>
            <span style={{ color: 'var(--mui-palette-text-secondary)' }}>Роботи:</span>{' '}
            <strong>{formatUaMoney(totals.sum)} / соб. {formatUaMoney(totals.cost)}</strong>
          </span>
        </>
      )}
    </Box>
  );
}
