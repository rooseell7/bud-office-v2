/**
 * Read-only view of Act — PDF-like layout, all sections, Works only, print.
 * NO Sheet/Grid imports — static tables only.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import { getAct } from '../../api/acts';
import { formatUaMoney, formatPercent } from '../../sheet/utils/computeTotals';
import { worksSheetColumnHeaders } from '../../sheet/configs/worksSheetConfig';

function n(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function extractSectionsAndWorks(items: any[]): { sectionKey: string; title: string; works: any[] }[] {
  const out: { sectionKey: string; title: string; works: any[] }[] = [];
  let current: { sectionKey: string; title: string; works: any[] } | null = null;
  for (const r of items) {
    const t = r?.rowType ?? r?.type;
    if (t === 'section') {
      current = {
        sectionKey: r?.sectionKey ?? 'sec_1',
        title: String(r?.title ?? 'Роботи'),
        works: [],
      };
      out.push(current);
    } else if (t === 'work' && current) {
      current.works.push(r);
    }
  }
  if (out.length === 0) {
    const works = (items ?? []).filter((r) => (r?.rowType ?? r?.type) === 'work');
    out.push({ sectionKey: 'sec_1', title: 'Роботи', works });
  }
  return out;
}

/** Convert work row to display row [num, name, unit, qty, price, total, costUnit, costTotal, note] */
function workToRow(w: any, idx: number): string[] {
  const qty = n(w?.qty);
  const price = n(w?.price);
  const costUnit = n(w?.costPrice ?? w?.cost);
  const total = qty * price;
  const costTotal = qty * costUnit;
  const fmt = (x: number) => x.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return [
    String(idx + 1),
    String(w?.name ?? w?.title ?? ''),
    String(w?.unit ?? ''),
    String(qty),
    fmt(price),
    fmt(total),
    fmt(costUnit),
    fmt(costTotal),
    String(w?.note ?? ''),
  ];
}

export const ActReadPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const loc = useLocation();
  const actId = id ? parseInt(id, 10) : NaN;
  const validId = Number.isFinite(actId) && actId > 0 ? actId : null;

  const [act, setAct] = useState<Awaited<ReturnType<typeof getAct>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const goBack = useCallback(() => {
    const target = (loc.state as { from?: string })?.from || '/estimate/acts';
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
    getAct(validId)
      .then(setAct)
      .catch((e: any) => {
        setError(e?.message || 'Помилка завантаження');
      })
      .finally(() => setLoading(false));
  }, [validId]);

  if (!validId) {
    return (
      <Box className="act-read noprint">
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
      <Box className="act-read noprint">
        <Typography>Завантаження…</Typography>
      </Box>
    );
  }

  if (error && !act) {
    return (
      <Box className="act-read noprint">
        <Button startIcon={<ArrowBackIcon />} onClick={goBack}>
          Назад
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      </Box>
    );
  }

  const sections = extractSectionsAndWorks(act?.items ?? []);
  const hideCost = false;

  const agg = sections.reduce(
    (a, sec) => {
      for (const w of sec.works) {
        const qty = n(w?.qty);
        const price = n(w?.price);
        const costUnit = n(w?.costPrice ?? w?.cost);
        a.sum += qty * price;
        a.cost += qty * costUnit;
      }
      return a;
    },
    { sum: 0, cost: 0 },
  );
  const totalSum = agg.sum;
  const totalCost = agg.cost;
  const totalProfit = totalSum - totalCost;
  const marginPct = totalSum > 0 ? (totalProfit / totalSum) * 100 : 0;

  const headersW = worksSheetColumnHeaders;
  const visibleColsW = hideCost ? [0, 1, 2, 3, 4, 5, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const headersVisible = headersW.filter((_, i) => visibleColsW.includes(i));

  return (
    <Box className="act-read" sx={{ width: '100%', maxWidth: '100%' }}>
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
          Акт №{act?.id} — режим читання
        </Typography>
        <Button size="small" startIcon={<PrintIcon />} variant="contained" onClick={handlePrint}>
          Друк
        </Button>
      </Box>

      {sections.length > 0 && (
        <Box
          className="act-read-totals"
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
            Загалом по акту
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'baseline' }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Роботи:</Typography>
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

      {sections.length === 0 ? (
        <Typography color="text.secondary">Немає секцій</Typography>
      ) : (
        sections.map((sec, idx) => {
          const rows = sec.works.map((w, ri) => workToRow(w, ri));
          const secSum = sec.works.reduce((a, w) => a + n(w?.qty) * n(w?.price), 0);
          const secCost = sec.works.reduce((a, w) => a + n(w?.qty) * n(w?.costPrice ?? w?.cost), 0);
          const secProfit = secSum - secCost;
          const secMargin = secSum > 0 ? (secProfit / secSum) * 100 : 0;

          return (
            <Box
              key={sec.sectionKey}
              className="act-read-stage"
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
                Секція {idx + 1}: {sec.title}
              </Typography>

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
                      {headersVisible.map((h, i) => {
                        const colIdx = visibleColsW[i];
                        return (
                          <th key={i} className={colIdx != null && [4, 5, 6, 7].includes(colIdx) ? 'num' : ''}>
                            {h}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={headersVisible.length}>—</td>
                      </tr>
                    ) : (
                      rows.map((row, ri) => (
                        <tr key={ri}>
                          {visibleColsW.map((c, hi) => (
                            <td key={hi} className={[4, 5, 6, 7].includes(c) ? 'num' : ''}>
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
                    <span>Разом робіт: {formatUaMoney(secSum)}</span>
                  ) : (
                    <span>
                      Разом: {formatUaMoney(secSum)} · Собівартість: {formatUaMoney(secCost)} · Прибуток:{' '}
                      {formatUaMoney(secProfit)} · Маржа {formatPercent(secMargin)}
                    </span>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .act-read, .act-read * { visibility: visible; }
          .act-read { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .noprint { display: none !important; }
          .act-read-stage { break-inside: avoid; page-break-inside: avoid; }
          .boHeader, .boSidebar, [class*="AppBar"], [class*="Drawer"] { display: none !important; }
        }
      `}</style>
    </Box>
  );
};
