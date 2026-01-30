import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { SelectChangeEvent } from '@mui/material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material';

import api from '../../api/api';

import { WarehouseBalancesTable } from './components/WarehouseBalancesTable';
import { WarehouseMovementsTable } from './components/WarehouseMovementsTable';

// ✅ NEW
import MovementCreateDialog from './dialogs/MovementCreateDialog';

import { useAuth } from '../../modules/auth/context/AuthContext';

type Warehouse = {
  id: number;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type WarehouseBalanceRow = {
  id: number;
  materialId: number;
  materialName: string;
  unit: string;
  qty: number;
  minQty?: number | null;
  updatedAt?: string;
};

type MovementType = 'IN' | 'OUT' | 'TRANSFER';

type WarehouseMovementRow = {
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

type BalancesQuery = {
  q: string;
  unit: string;
  onlyBelowMin: boolean;
};

type MovementsQuery = {
  q: string;
  type: '' | MovementType;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
};

function toISODate(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfToday(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getAxiosErrorMessage(e: any, fallback: string): string {
  const data = e?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    const msg = (data as any).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    if (Array.isArray(msg) && msg.length) return String(msg[0]);
  }
  const msg = e?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}

export const WarehouseDetailsPage: React.FC = () => {
  let can: (code: string) => boolean = () => false;
  let authInitError: string | null = null;

  try {
    ({ can } = useAuth());
  } catch (e: any) {
    authInitError =
      e?.message ||
      'AuthContext недоступний. Перевір, чи AuthProvider обгортає AppRoutes.';
  }

  const canRead = useMemo(() => {
    try {
      return can('warehouse:read');
    } catch {
      return false;
    }
  }, [can]);

  const canWrite = useMemo(() => {
    try {
      return can('warehouse:write');
    } catch {
      return false;
    }
  }, [can]);

  const canTransfer = useMemo(() => {
    try {
      return can('warehouse:transfer');
    } catch {
      return false;
    }
  }, [can]);

  const { id } = useParams();
  const warehouseId = Number(id);
  const nav = useNavigate();

  const [tab, setTab] = useState<'balances' | 'movements'>('balances');

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [loadingHeader, setLoadingHeader] = useState(true);
  const [headerError, setHeaderError] = useState<string | null>(null);

  const [balances, setBalances] = useState<WarehouseBalanceRow[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [balancesQuery, setBalancesQuery] = useState<BalancesQuery>({
    q: '',
    unit: '',
    onlyBelowMin: false,
  });

  const [movements, setMovements] = useState<WarehouseMovementRow[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);
  const [movementsQuery, setMovementsQuery] = useState<MovementsQuery>(() => {
    const now = new Date();
    return {
      q: '',
      type: '',
      dateFrom: toISODate(startOfMonth(now)),
      dateTo: toISODate(endOfToday(now)),
    };
  });

  // ✅ NEW: dialog state
  const [createOpen, setCreateOpen] = useState(false);

  const hasValidId = Number.isFinite(warehouseId) && warehouseId > 0;

  const canCreateMovement = canWrite;
  const canCreateTransfer = canWrite && canTransfer;

  if (authInitError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {authInitError}
        </Alert>
        <Button variant="outlined" onClick={() => nav('/warehouses')}>
          Назад до складів
        </Button>
      </Box>
    );
  }

  useEffect(() => {
    if (!hasValidId) {
      setHeaderError('Некоректний ID складу у маршруті.');
      setLoadingHeader(false);
      return;
    }

    if (!canRead) {
      setLoadingHeader(false);
      setWarehouse(null);
      setHeaderError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingHeader(true);
      setHeaderError(null);
      try {
        const res = await api.get<Warehouse>(`/warehouses/${warehouseId}`);
        if (!cancelled) setWarehouse(res.data);
      } catch (e: any) {
        if (!cancelled) {
          setHeaderError(getAxiosErrorMessage(e, 'Помилка завантаження складу.'));
        }
      } finally {
        if (!cancelled) setLoadingHeader(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [warehouseId, canRead, hasValidId]);

  const reloadBalances = async () => {
    if (!hasValidId) return;
    if (!canRead) return;

    setBalancesLoading(true);
    setBalancesError(null);
    try {
      const res = await api.get<WarehouseBalanceRow[]>(
        `/warehouses/${warehouseId}/balances`,
      );
      setBalances(res.data);
    } catch (e: any) {
      setBalancesError(getAxiosErrorMessage(e, 'Помилка завантаження залишків.'));
    } finally {
      setBalancesLoading(false);
    }
  };

  const reloadMovements = async () => {
    if (!hasValidId) return;
    if (!canRead) return;

    setMovementsLoading(true);
    setMovementsError(null);
    try {
      const res = await api.get<WarehouseMovementRow[]>(
        `/warehouses/${warehouseId}/movements`,
        {
          params: {
            dateFrom: movementsQuery.dateFrom || undefined,
            dateTo: movementsQuery.dateTo || undefined,
          },
        },
      );
      setMovements(res.data);
    } catch (e: any) {
      setMovementsError(getAxiosErrorMessage(e, 'Помилка завантаження операцій.'));
    } finally {
      setMovementsLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) return;
    if (!hasValidId) return;
    if (tab !== 'movements') return;
    void reloadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementsQuery.dateFrom, movementsQuery.dateTo]);

  useEffect(() => {
    if (!canRead) return;
    if (!hasValidId) return;

    if (tab === 'balances') void reloadBalances();
    if (tab === 'movements') void reloadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, warehouseId, canRead, hasValidId]);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of balances) set.add(r.unit);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [balances]);

  const balancesFiltered = useMemo(() => {
    const q = balancesQuery.q.trim().toLowerCase();
    const unit = balancesQuery.unit;
    const onlyBelowMin = balancesQuery.onlyBelowMin;

    return balances.filter((r) => {
      if (unit && r.unit !== unit) return false;
      if (onlyBelowMin) {
        const min = r.minQty ?? null;
        if (min == null) return false;
        if (!(r.qty < min)) return false;
      }
      if (!q) return true;
      const hay = `${r.materialName} ${r.unit}`.toLowerCase();
      return hay.includes(q);
    });
  }, [balances, balancesQuery]);

  const movementsFiltered = useMemo(() => {
    const q = movementsQuery.q.trim().toLowerCase();
    const type = movementsQuery.type;

    return movements.filter((m) => {
      if (type && m.type !== type) return false;
      if (!q) return true;
      const hay = `${m.docNo ?? ''} ${m.objectName ?? ''} ${
        m.counterpartyName ?? ''
      } ${m.note ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [movements, movementsQuery]);

  const belowMinCount = useMemo(() => {
    return balances.filter((r) => {
      const min = r.minQty ?? null;
      return min != null && r.qty < min;
    }).length;
  }, [balances]);

  const handleTabChange = (
    _: React.SyntheticEvent,
    value: 'balances' | 'movements',
  ) => {
    setTab(value);
  };

  const onBalancesUnitChange = (e: SelectChangeEvent) => {
    setBalancesQuery((p) => ({ ...p, unit: e.target.value }));
  };

  const onMovementsTypeChange = (e: SelectChangeEvent) => {
    setMovementsQuery((p) => ({ ...p, type: e.target.value as any }));
  };

  if (!canRead) {
    return (
      <Box sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Склад: #{hasValidId ? warehouseId : '—'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Деталі складу, залишки та операції
            </Typography>
          </Box>

          <Button variant="outlined" onClick={() => nav('/warehouses')}>
            Назад до складів
          </Button>
        </Box>

        <Alert severity="error">
          У тебе немає дозволу <b>warehouse:read</b>. Перегляд цього складу
          недоступний.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Склад:{' '}
            {loadingHeader
              ? '...'
              : warehouse?.name ?? `#${hasValidId ? warehouseId : '—'}`}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Деталі складу, залишки та операції
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {tab === 'balances' && (
            <Chip
              label={`Нижче мін.: ${belowMinCount}`}
              variant={belowMinCount ? 'filled' : 'outlined'}
            />
          )}

          {tab === 'movements' && (
            <Tooltip
              title={
                !canCreateMovement
                  ? 'Немає прав (warehouse:write)'
                  : !canCreateTransfer
                    ? 'Для переміщень потрібен дозвіл warehouse:transfer'
                    : 'Створення операцій доступне'
              }
            >
              <span>
                <Button
                  variant="contained"
                  disabled={!canCreateMovement}
                  onClick={() => setCreateOpen(true)}
                >
                  + Нова операція
                </Button>
              </span>
            </Tooltip>
          )}

          <Button variant="outlined" onClick={() => nav('/warehouses')}>
            Назад до складів
          </Button>
        </Box>
      </Box>

      {headerError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {headerError}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2 }}>
            <Tab value="balances" label="Залишки" />
            <Tab value="movements" label="Операції" />
          </Tabs>

          {tab === 'balances' && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  alignItems: 'center',
                }}
              >
                <TextField
                  size="small"
                  label="Пошук матеріалу"
                  value={balancesQuery.q}
                  onChange={(e) =>
                    setBalancesQuery((p) => ({ ...p, q: e.target.value }))
                  }
                  sx={{ minWidth: 260 }}
                />

                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Одиниця</InputLabel>
                  <Select
                    value={balancesQuery.unit}
                    label="Одиниця"
                    onChange={onBalancesUnitChange}
                  >
                    <MenuItem value="">Усі</MenuItem>
                    {unitOptions.map((u) => (
                      <MenuItem key={u} value={u}>
                        {u}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant={balancesQuery.onlyBelowMin ? 'contained' : 'outlined'}
                  onClick={() =>
                    setBalancesQuery((p) => ({
                      ...p,
                      onlyBelowMin: !p.onlyBelowMin,
                    }))
                  }
                >
                  Нижче мінімуму
                </Button>

                <Box sx={{ flex: 1 }} />

                <Button
                  variant="outlined"
                  onClick={reloadBalances}
                  disabled={balancesLoading}
                >
                  Оновити
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              {balancesError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {balancesError}
                </Alert>
              )}

              {balancesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <WarehouseBalancesTable rows={balancesFiltered} />
              )}
            </>
          )}

          {tab === 'movements' && (
            <>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1.5,
                  alignItems: 'center',
                }}
              >
                <TextField
                  size="small"
                  label="Пошук (док/обʼєкт/постачальник/примітка)"
                  value={movementsQuery.q}
                  onChange={(e) =>
                    setMovementsQuery((p) => ({ ...p, q: e.target.value }))
                  }
                  sx={{ minWidth: 320 }}
                />

                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Тип</InputLabel>
                  <Select
                    value={movementsQuery.type}
                    label="Тип"
                    onChange={onMovementsTypeChange}
                  >
                    <MenuItem value="">Усі</MenuItem>
                    <MenuItem value="IN">IN (Прихід)</MenuItem>
                    <MenuItem value="OUT">OUT (Видаток)</MenuItem>
                    <MenuItem value="TRANSFER">TRANSFER (Переміщення)</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  label="З"
                  type="date"
                  value={movementsQuery.dateFrom}
                  onChange={(e) =>
                    setMovementsQuery((p) => ({ ...p, dateFrom: e.target.value }))
                  }
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  size="small"
                  label="По"
                  type="date"
                  value={movementsQuery.dateTo}
                  onChange={(e) =>
                    setMovementsQuery((p) => ({ ...p, dateTo: e.target.value }))
                  }
                  InputLabelProps={{ shrink: true }}
                />

                <Box sx={{ flex: 1 }} />

                <Button
                  variant="outlined"
                  onClick={reloadMovements}
                  disabled={movementsLoading}
                >
                  Оновити
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              {movementsError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {movementsError}
                </Alert>
              )}

              {movementsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <WarehouseMovementsTable
                  rows={movementsFiltered}
                  onRowClick={(row) =>
                    nav(`/warehouses/${warehouseId}/movements/${row.id}`)
                  }
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ✅ NEW: Create movement dialog */}
      <MovementCreateDialog
        open={createOpen}
        warehouseId={warehouseId}
        canWrite={canWrite}
        canTransfer={canTransfer}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          // Після створення — одразу показуємо вкладку "Операції" і оновлюємо список
          setTab('movements');
          void reloadMovements();
        }}
      />
    </Box>
  );
};

export default WarehouseDetailsPage;
