import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  TablePagination,
} from '@mui/material';

import WarehouseMovementsFilters from '../components/WarehouseMovementsFilters';
import WarehouseMovementsTable from '../components/WarehouseMovementsTable';

import { getWarehouseMovements } from '../api/warehouseMovements.api';
import type {
  Id,
  WarehouseMovement,
  WarehouseMovementsQuery,
} from '../types/warehouse-movement.types';

type Props = {
  warehouseId: Id;
  canRead?: boolean;
};

export default function WarehouseMovementsTab({ warehouseId, canRead = true }: Props) {
  const [queryDraft, setQueryDraft] = useState<WarehouseMovementsQuery>({
    type: undefined,
    offset: 0,
    limit: 25,
  });

  const [queryApplied, setQueryApplied] = useState<WarehouseMovementsQuery>(queryDraft);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<WarehouseMovement[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getWarehouseMovements(warehouseId, queryApplied);
      setItems(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Не вдалося завантажити операції');
    } finally {
      setLoading(false);
    }
  }, [canRead, warehouseId, queryApplied]);

  useEffect(() => {
    void load();
  }, [load]);

  const page = useMemo(() => {
    const limit = queryApplied.limit ?? 25;
    const offset = queryApplied.offset ?? 0;
    return Math.floor(offset / limit);
  }, [queryApplied.limit, queryApplied.offset]);

  const rowsPerPage = queryApplied.limit ?? 25;

  if (!canRead) {
    return <Alert severity="warning">Недостатньо прав для перегляду операцій складу.</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Операції
      </Typography>

      <Paper sx={{ p: 1.5 }}>
        <WarehouseMovementsFilters
          value={queryDraft}
          onChange={(next) => setQueryDraft({ ...next, offset: 0 })}
          onApply={() => setQueryApplied({ ...queryDraft, offset: 0 })}
          onReset={() => {
            const base: WarehouseMovementsQuery = { type: undefined, offset: 0, limit: 25 };
            setQueryDraft(base);
            setQueryApplied(base);
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <WarehouseMovementsTable items={items} />
        )}

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => {
            const limit = queryApplied.limit ?? 25;
            setQueryApplied({ ...queryApplied, offset: p * limit });
          }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            const next = Number(e.target.value) || 25;
            setQueryApplied({ ...queryApplied, limit: next, offset: 0 });
            setQueryDraft({ ...queryDraft, limit: next, offset: 0 });
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
    </Box>
  );
}
