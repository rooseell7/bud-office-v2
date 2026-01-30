import React, { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';

type MovementType = 'IN' | 'OUT' | 'TRANSFER';

export type WarehouseMovementRow = {
  id: number;
  type: MovementType;
  docNo?: string | null;
  objectName?: string | null;
  counterpartyName?: string | null;
  note?: string | null;
  createdAt?: string;
  itemsCount?: number;
  totalQty?: number;
};

type Props = {
  rows: WarehouseMovementRow[];
  onRowClick?: (row: WarehouseMovementRow) => void;
};

type SortKey = 'createdAt' | 'type' | 'docNo' | 'objectName' | 'counterpartyName' | 'itemsCount' | 'totalQty';
type SortDir = 'asc' | 'desc';

function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('uk-UA');
}

function typeLabel(t: MovementType): string {
  if (t === 'IN') return 'IN';
  if (t === 'OUT') return 'OUT';
  return 'TRANSFER';
}

export const WarehouseMovementsTable: React.FC<Props> = ({ rows, onRowClick }) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const aa: any = (a as any)[sortKey];
      const bb: any = (b as any)[sortKey];

      // dates + numbers
      if (sortKey === 'createdAt') {
        const da = aa ? new Date(aa).getTime() : 0;
        const db = bb ? new Date(bb).getTime() : 0;
        return sortDir === 'asc' ? da - db : db - da;
      }
      if (sortKey === 'itemsCount' || sortKey === 'totalQty') {
        const na = safeNumber(aa);
        const nb = safeNumber(bb);
        return sortDir === 'asc' ? na - nb : nb - na;
      }

      // strings
      const sa = String(aa ?? '').toLowerCase();
      const sb = String(bb ?? '').toLowerCase();
      const cmp = sa.localeCompare(sb, 'uk');
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const paged = useMemo(() => {
    const start = page * pageSize;
    const end = start + pageSize;
    return sorted.slice(start, end);
  }, [sorted, page, pageSize]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir(key === 'createdAt' ? 'desc' : 'asc');
      setPage(0);
      return;
    }
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    setPage(0);
  };

  const chipVariant = (t: MovementType) => {
    if (t === 'IN') return { color: 'success' as const, variant: 'outlined' as const };
    if (t === 'OUT') return { color: 'warning' as const, variant: 'outlined' as const };
    return { color: 'info' as const, variant: 'outlined' as const };
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
        Рядків: {rows.length}
      </Typography>

      <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell onClick={() => toggleSort('createdAt')} sx={{ cursor: 'pointer', fontWeight: 700, width: 190 }}>
                Дата/час
              </TableCell>
              <TableCell onClick={() => toggleSort('type')} sx={{ cursor: 'pointer', fontWeight: 700, width: 120 }}>
                Тип
              </TableCell>
              <TableCell onClick={() => toggleSort('docNo')} sx={{ cursor: 'pointer', fontWeight: 700, width: 180 }}>
                Документ
              </TableCell>
              <TableCell onClick={() => toggleSort('objectName')} sx={{ cursor: 'pointer', fontWeight: 700 }}>
                Обʼєкт
              </TableCell>
              <TableCell onClick={() => toggleSort('counterpartyName')} sx={{ cursor: 'pointer', fontWeight: 700 }}>
                Контрагент
              </TableCell>
              <TableCell onClick={() => toggleSort('itemsCount')} sx={{ cursor: 'pointer', fontWeight: 700, width: 110 }} align="right">
                Позиції
              </TableCell>
              <TableCell onClick={() => toggleSort('totalQty')} sx={{ cursor: 'pointer', fontWeight: 700, width: 140 }} align="right">
                Разом к-сть
              </TableCell>
              <TableCell sx={{ fontWeight: 700, width: 260 }}>
                Примітка
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paged.map((m) => (
              <TableRow
                key={m.id}
                hover
                onClick={onRowClick ? () => onRowClick(m) : undefined}
                sx={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                <TableCell>{fmtDateTime(m.createdAt)}</TableCell>
                <TableCell>
                  <Chip label={typeLabel(m.type)} {...chipVariant(m.type)} size="small" />
                </TableCell>
                <TableCell>{m.docNo ?? '—'}</TableCell>
                <TableCell>{m.objectName ?? '—'}</TableCell>
                <TableCell>{m.counterpartyName ?? '—'}</TableCell>
                <TableCell align="right">{safeNumber(m.itemsCount).toLocaleString('uk-UA')}</TableCell>
                <TableCell align="right">{safeNumber(m.totalQty).toLocaleString('uk-UA')}</TableCell>
                <TableCell sx={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.note ?? '—'}
                </TableCell>
              </TableRow>
            ))}

            {!paged.length && (
              <TableRow>
                <TableCell colSpan={8} sx={{ py: 3, textAlign: 'center', opacity: 0.7 }}>
                  Немає даних
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={pageSize}
        onRowsPerPageChange={(e) => {
          setPageSize(Number(e.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 20, 50, 100]}
        labelRowsPerPage="Рядків на сторінці:"
      />
    </Box>
  );
};