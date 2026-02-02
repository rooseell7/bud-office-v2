/**
 * Read-only view of KP — PDF-like layout, all stages, print.
 * NO Sheet/Grid imports — static tables only.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import {
  getDocumentWithStages,
  getSheetByDocKey,
  buildDocKey,
  type EstimateStage,
} from '../../api/estimates';
import { worksSheetColumnHeaders } from '../../sheet/configs/worksSheetConfig';
import { materialsSheetColumnHeaders } from '../../sheet/configs/materialsSheetConfig';
import { W_COL } from '../../sheet/configs/worksSheetConfig';
import { M_COL } from '../../sheet/configs/materialsSheetConfig';
import { computeSheetTotals, formatUaMoney, formatPercent } from '../../sheet/utils/computeTotals';
import { uaLocale } from '../../sheet/configs/types';

type SheetSnapshot = { values?: string[][]; rawValues?: string[][]; rowCount?: number; colCount?: number };

function getValues(snap: SheetSnapshot | null): string[][] {
  if (!snap) return [];
  const src = snap.values ?? snap.rawValues ?? [];
  return src.map((row) => [...(row ?? [])]);
}

export const EstimateReadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loc = useLocation();
  const estimateId = id ? parseInt(id, 10) : NaN;
  const validId = Number.isFinite(estimateId) && estimateId > 0 ? estimateId : null;

  const [doc, setDoc] = useState<Awaited<ReturnType<typeof getDocumentWithStages>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stageData, setStageData] = useState<
    Record<string, { works: string[][]; materials: string[][] }>
  >({});

  const goBack = useCallback(() => {
    const target = (loc.state as { from?: string })?.from || '/estimate';
    window.location.href = target;
  }, [loc.state]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  useEffect(() => {
    if (!validId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getDocumentWithStages(validId)
      .then(async (data) => {
        setDoc(data);
        const stages = data.stages ?? [];
        const next: Record<string, { works: string[][]; materials: string[][] }> = {};
        await Promise.all(
          stages.map(async (s: EstimateStage) => {
            try {
              const [wr, mr] = await Promise.all([
                getSheetByDocKey(validId, buildDocKey(validId, s.id, 'works')),
                getSheetByDocKey(validId, buildDocKey(validId, s.id, 'materials')),
              ]);
              next[s.id] = {
                works: getValues(wr?.snapshot as SheetSnapshot),
                materials: getValues(mr?.snapshot as SheetSnapshot),
              };
            } catch {
              next[s.id] = { works: [], materials: [] };
            }
          }),
        );
        setStageData(next);
      })
      .catch((e: any) => {
        setError(e?.response?.data?.message || 'Помилка завантаження');
      })
      .finally(() => setLoading(false));
  }, [validId]);

  if (!validId) {
    return (
      <Box className="estimate-read noprint">
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
      <Box className="estimate-read noprint">
        <Typography>Завантаження…</Typography>
      </Box>
    );
  }

  if (error && !doc) {
    return (
      <Box className="estimate-read noprint">
        <Button startIcon={<ArrowBackIcon />} onClick={goBack}>
          Назад
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      </Box>
    );
  }

  const stages = doc?.stages ?? [];
  const hideCost = false;

  const agg = stages.reduce(
    (a, s) => {
      const data = stageData[s.id];
      if (!data) return a;
      const rowCountW = Math.max(data.works.length, 1);
      const rowCountM = Math.max(data.materials.length, 1);
      const wt = computeSheetTotals(data.works, rowCountW, W_COL.TOTAL, W_COL.COST_TOTAL, uaLocale);
      const mt = computeSheetTotals(data.materials, rowCountM, M_COL.TOTAL, M_COL.COST_TOTAL, uaLocale);
      a.worksSum += wt.sum;
      a.worksCost += wt.cost;
      a.materialsSum += mt.sum;
      a.materialsCost += mt.cost;
      return a;
    },
    { worksSum: 0, worksCost: 0, materialsSum: 0, materialsCost: 0 },
  );
  const totalSum = agg.worksSum + agg.materialsSum;
  const totalCost = agg.worksCost + agg.materialsCost;
  const totalProfit = totalSum - totalCost;
  const marginPct = totalSum > 0 ? (totalProfit / totalSum) * 100 : 0;

  return (
    <Box className="estimate-read" sx={{ width: '100%', maxWidth: '100%' }}>
      <Box
        className="noprint"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          mb: 2,
          flexWrap: 'wrap',
        }}
      >
        <Button size="small" startIcon={<ArrowBackIcon />} onClick={goBack}>
          Назад
        </Button>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {doc?.title ?? `КП #${validId}`} — режим читання
        </Typography>
        <Button size="small" startIcon={<PrintIcon />} variant="contained" onClick={handlePrint}>
          Друк
        </Button>
      </Box>

      {stages.length > 0 && (
        <Box
          className="estimate-read-totals"
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            p: 1,
            mb: 2,
            borderRadius: 1,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mr: 1 }}>
            Загалом КП
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Роботи:</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatUaMoney(agg.worksSum)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Матеріали:</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatUaMoney(agg.materialsSum)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Всього:</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatUaMoney(totalSum)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Собівартість:</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatUaMoney(totalCost)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Маржа:</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatPercent(marginPct)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Прибуток:</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{formatUaMoney(totalProfit)}</Typography>
          </Box>
        </Box>
      )}

      {stages.length === 0 ? (
        <Typography color="text.secondary">Немає етапів</Typography>
      ) : (
        stages.map((stage, idx) => {
          const data = stageData[stage.id] ?? { works: [], materials: [] };
          const worksValues = data.works;
          const materialsValues = data.materials;
          const rowCountW = Math.max(worksValues.length, 1);
          const rowCountM = Math.max(materialsValues.length, 1);
          const worksTotals = computeSheetTotals(
            worksValues,
            rowCountW,
            W_COL.TOTAL,
            W_COL.COST_TOTAL,
            uaLocale,
          );
          const materialsTotals = computeSheetTotals(
            materialsValues,
            rowCountM,
            M_COL.TOTAL,
            M_COL.COST_TOTAL,
            uaLocale,
          );
          const stageSum = worksTotals.sum + materialsTotals.sum;
          const stageCost = worksTotals.cost + materialsTotals.cost;
          const stageProfit = stageSum - stageCost;
          const marginPct = stageSum > 0 ? (stageProfit / stageSum) * 100 : 0;

          const visibleColsW = hideCost ? [0, 1, 2, 3, 4, 5, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
          const visibleColsM = hideCost ? [0, 1, 2, 3, 4, 5, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
          const headersW = worksSheetColumnHeaders.filter((_, i) => visibleColsW.includes(i));
          const headersM = materialsSheetColumnHeaders.filter((_, i) => visibleColsM.includes(i));

          return (
            <Box
              key={stage.id}
              className="estimate-read-stage"
              sx={{
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
                mb: 3,
                pb: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  mb: 1.5,
                  pb: 0.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  fontWeight: 600,
                }}
              >
                Етап {idx + 1}: {stage.name}
              </Typography>

              {/* (1) Works table */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                  Роботи
                </Typography>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                    '& th, & td': {
                      border: '1px solid',
                      borderColor: 'divider',
                      px: 1,
                      py: 0.5,
                    },
                    '& th': { bgcolor: 'action.hover', fontWeight: 600, textAlign: 'left' },
                    '& td': { verticalAlign: 'top' },
                    '& .num': { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
                  }}
                >
                  <thead>
                    <tr>
                      {headersW.map((h, i) => (
                        <th key={i} className={[4, 5, 6, 7].includes(visibleColsW[i]) ? 'num' : ''}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {worksValues.length === 0 ? (
                      <tr>
                        <td colSpan={headersW.length}>—</td>
                      </tr>
                    ) : (
                      worksValues.map((row, ri) => (
                        <tr key={ri}>
                          {visibleColsW.map((c, hi) => (
                            <td
                              key={hi}
                              className={[4, 5, 6, 7].includes(c) ? 'num' : ''}
                            >
                              {row[c] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mt: 0.5,
                    py: 0.75,
                    px: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 0.5,
                    fontSize: 12,
                  }}
                >
                  {hideCost ? (
                    <span>Разом робіт: {formatUaMoney(worksTotals.sum)}</span>
                  ) : (
                    <span>
                      Разом: {formatUaMoney(worksTotals.sum)} · Собівартість:{' '}
                      {formatUaMoney(worksTotals.cost)} · Прибуток: {formatUaMoney(worksTotals.profit)}
                    </span>
                  )}
                </Box>
              </Box>

              {/* (2) Materials table */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                  Матеріали
                </Typography>
                <Box
                  component="table"
                  sx={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13,
                    '& th, & td': {
                      border: '1px solid',
                      borderColor: 'divider',
                      px: 1,
                      py: 0.5,
                    },
                    '& th': { bgcolor: 'action.hover', fontWeight: 600, textAlign: 'left' },
                    '& td': { verticalAlign: 'top' },
                    '& .num': { textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
                  }}
                >
                  <thead>
                    <tr>
                      {headersM.map((h, i) => (
                        <th key={i} className={[4, 5, 6, 7].includes(visibleColsM[i]) ? 'num' : ''}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {materialsValues.length === 0 ? (
                      <tr>
                        <td colSpan={headersM.length}>—</td>
                      </tr>
                    ) : (
                      materialsValues.map((row, ri) => (
                        <tr key={ri}>
                          {visibleColsM.map((c, hi) => (
                            <td
                              key={hi}
                              className={[4, 5, 6, 7].includes(c) ? 'num' : ''}
                            >
                              {row[c] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mt: 0.5,
                    py: 0.75,
                    px: 1,
                    bgcolor: 'action.hover',
                    borderRadius: 0.5,
                    fontSize: 12,
                  }}
                >
                  {hideCost ? (
                    <span>Разом матеріалів: {formatUaMoney(materialsTotals.sum)}</span>
                  ) : (
                    <span>
                      Разом: {formatUaMoney(materialsTotals.sum)} · Собівартість:{' '}
                      {formatUaMoney(materialsTotals.cost)} · Прибуток:{' '}
                      {formatUaMoney(materialsTotals.profit)}
                    </span>
                  )}
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  mt: 1,
                  py: 0.5,
                  fontSize: 12,
                  color: 'text.secondary',
                }}
              >
                {hideCost ? (
                  <span>Етап: {formatUaMoney(stageSum)}</span>
                ) : (
                  <span>
                    Етап: {formatUaMoney(stageSum)} · Маржа {formatPercent(marginPct)} · Прибуток{' '}
                    {formatUaMoney(stageProfit)}
                  </span>
                )}
              </Box>
            </Box>
          );
        })
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .estimate-read, .estimate-read * { visibility: visible; }
          .estimate-read { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .noprint { display: none !important; }
          .estimate-read-stage { break-inside: avoid; page-break-inside: avoid; }
          .boHeader, .boSidebar, [class*="AppBar"], [class*="Drawer"] { display: none !important; }
        }
      `}</style>
    </Box>
  );
};
