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

import type { MovementItemDto } from '../../../api/warehouse.movements';

type Props = {
  items: MovementItemDto[];
};

function safeNumber(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const MovementItemsTable: React.FC<Props> = ({ items }) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const paged = useMemo(() => {
    const start = page * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  }, [items, page, pageSize]);

  const totalQty = useMemo(() => {
    return items.reduce((acc, it) => acc + safeNumber(it.qty), 0);
  }, [items]);

  return (
    <Box>
      <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
        Позицій: {items.length} • Разом к-сть: {totalQty.toLocaleString('uk-UA')}
      </Typography>

      <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Матеріал</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 120 }}>Од.</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140 }} align="right">
                К-сть
              </TableCell>
              <TableCell sx={{ fontWeight: 700, width: 140 }} align="right">
                Ціна
              </TableCell>
              <TableCell sx={{ fontWeight: 700, width: 160 }} align="right">
                Сума
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paged.map((it) => (
              <TableRow key={it.id} hover>
                <TableCell>{it.materialName ?? `#${it.materialId ?? '—'}`}</TableCell>
                <TableCell>{it.unit ?? '—'}</TableCell>
                <TableCell align="right">{safeNumber(it.qty).toLocaleString('uk-UA')}</TableCell>
                <TableCell align="right">
                  {it.price == null ? '—' : safeNumber(it.price).toLocaleString('uk-UA')}
                </TableCell>
                <TableCell align="right">
                  {it.amount == null ? '—' : safeNumber(it.amount).toLocaleString('uk-UA')}
                </TableCell>
              </TableRow>
            ))}

            {!paged.length && (
              <TableRow>
                <TableCell colSpan={5} sx={{ py: 3, textAlign: 'center', opacity: 0.7 }}>
                  Немає позицій
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={items.length}
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