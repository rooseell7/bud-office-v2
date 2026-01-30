import React, { useMemo, useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';

type Row = {
  id: number;
  materialId: number;
  materialName: string;
  unit: string;
  qty: number;
  minQty?: number | null;
  updatedAt?: string;
};

type Props = {
  rows: Row[];
};

type SortKey = 'materialName' | 'qty' | 'unit' | 'minQty';
type SortDir = 'asc' | 'desc';

function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const WarehouseBalancesTable: React.FC<Props> = ({ rows }) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>('materialName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let aa: any = a[sortKey];
      let bb: any = b[sortKey];

      if (sortKey === 'qty' || sortKey === 'minQty') {
        aa = safeNumber(aa);
        bb = safeNumber(bb);
        return sortDir === 'asc' ? aa - bb : bb - aa;
      }

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
      setSortDir('asc');
      setPage(0);
      return;
    }
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    setPage(0);
  };

  const belowMin = (r: Row): boolean => {
    const min = r.minQty ?? null;
    if (min == null) return false;
    return safeNumber(r.qty) < safeNumber(min);
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
              <TableCell onClick={() => toggleSort('materialName')} sx={{ cursor: 'pointer', fontWeight: 700 }}>
                Матеріал
              </TableCell>
              <TableCell onClick={() => toggleSort('unit')} sx={{ cursor: 'pointer', fontWeight: 700, width: 120 }}>
                Од.
              </TableCell>
              <TableCell onClick={() => toggleSort('qty')} sx={{ cursor: 'pointer', fontWeight: 700, width: 140 }} align="right">
                К-сть
              </TableCell>
              <TableCell onClick={() => toggleSort('minQty')} sx={{ cursor: 'pointer', fontWeight: 700, width: 140 }} align="right">
                Мін.
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paged.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell sx={{ fontWeight: belowMin(r) ? 800 : 500 }}>
                  {r.materialName}
                </TableCell>
                <TableCell>{r.unit}</TableCell>
                <TableCell align="right" sx={{ fontWeight: belowMin(r) ? 800 : 500 }}>
                  {safeNumber(r.qty).toLocaleString('uk-UA')}
                </TableCell>
                <TableCell align="right">
                  {r.minQty == null ? '—' : safeNumber(r.minQty).toLocaleString('uk-UA')}
                </TableCell>
              </TableRow>
            ))}

            {!paged.length && (
              <TableRow>
                <TableCell colSpan={4} sx={{ py: 3, textAlign: 'center', opacity: 0.7 }}>
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