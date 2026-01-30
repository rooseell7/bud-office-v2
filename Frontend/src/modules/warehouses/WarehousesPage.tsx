import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Warehouse } from './types';
import { getWarehouses } from './api';
import { mockWarehouses } from './mock';

import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
  Button,
  Tooltip,
  Chip,
} from '@mui/material';

import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';

import { useAuth } from '../auth/context/AuthContext';

const WarehousesPage: React.FC = () => {
  const nav = useNavigate();

  // ✅ SAFE useAuth (щоб не було білого екрану, якщо AuthProvider не підключено)
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

  const [items, setItems] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    // ✅ Якщо auth не ініціалізувався — не робимо запити
    if (authInitError) {
      setLoading(false);
      setItems([]);
      setError(null);
      return;
    }

    // ✅ Без права warehouse:read — не вантажимо дані взагалі
    if (!canRead) {
      setLoading(false);
      setItems([]);
      setError(null);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getWarehouses();
        if (mounted) setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        // На етапі «візуал без API» — фолбек на мок-дані, але помилку покажемо.
        if (mounted) {
          setError(
            e?.message ||
              'Не вдалося завантажити склади з API. Показую мок-дані.',
          );
          setItems(mockWarehouses);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [canRead, authInitError]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (w) =>
        (w.name || '').toLowerCase().includes(s) ||
        (w.address || '').toLowerCase().includes(s),
    );
  }, [items, q]);

  // ✅ Якщо впав auth — покажемо повідомлення (замість білого екрану)
  if (authInitError) {
    return (
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            📦 Склади
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Неможливо ініціалізувати авторизацію.
          </Typography>
        </Box>

        <Alert severity="error">{authInitError}</Alert>

        <Alert severity="info">
          Відкрий DevTools → Console, там буде точний stacktrace. Найчастіше
          потрібно обгорнути застосунок у <b>{'<AuthProvider>'}</b>.
        </Alert>
      </Stack>
    );
  }

  // ✅ Якщо немає доступу — акуратний екран
  if (!canRead) {
    return (
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            📦 Склади
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Доступ обмежено.
          </Typography>
        </Box>

        <Alert severity="error">
          У тебе немає дозволу <b>warehouse:read</b>. Перегляд складів
          недоступний.
        </Alert>
      </Stack>
    );
  }

  const openWarehouse = (id: unknown) => {
    const wid = Number(id);
    if (!Number.isFinite(wid) || wid <= 0) return;
    // Працює з вашим редіректом /warehouses/:id -> /supply/warehouses/:id (якщо він є),
    // або напряму, якщо сторінка деталей на /warehouses/:id.
    nav(`/warehouses/${wid}`);
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          alignItems={{ md: 'baseline' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              📦 Склади
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Список складів. Далі додамо перехід у «Залишки» та «Операції (IN/OUT)»
              по складу.
            </Typography>
          </Box>

          {/* ✅ Видимий індикатор доступів (щоб одразу було видно, що ми додали/перевірили) */}
          <Stack direction="row" spacing={1} sx={{ pt: { xs: 0.5, md: 0 } }}>
            <Tooltip title="Дозвіл на перегляд сторінок складу (warehouse:read)">
              <Chip
                size="small"
                label="READ"
                color={canRead ? 'success' : 'default'}
                variant={canRead ? 'filled' : 'outlined'}
              />
            </Tooltip>

            <Tooltip title="Дозвіл на створення/списання (IN/OUT) (warehouse:write)">
              <Chip
                size="small"
                label="WRITE"
                color={canWrite ? 'success' : 'default'}
                variant={canWrite ? 'filled' : 'outlined'}
              />
            </Tooltip>

            <Tooltip title="Окремий дозвіл на переміщення між складами (warehouse:transfer)">
              <Chip
                size="small"
                label="TRANSFER"
                color={canTransfer ? 'success' : 'default'}
                variant={canTransfer ? 'filled' : 'outlined'}
              />
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ md: 'center' }}
      >
        <TextField
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук складу за назвою/адресою…"
          size="small"
          fullWidth
        />

        <Tooltip
          title={
            !canWrite
              ? 'Немає прав (warehouse:write)'
              : 'Функція буде додана пізніше'
          }
          placement="top"
        >
          <span>
            <Button variant="contained" disabled={!canWrite || true}>
              + Додати склад (скоро)
            </Button>
          </span>
        </Tooltip>
      </Stack>

      {error && <Alert severity="warning">{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((w) => (
            <Grid item xs={12} md={6} lg={4} key={w.id}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                  },
                }}
                onClick={() => openWarehouse(w.id)}
              >
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <WarehouseOutlinedIcon color="primary" />
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {w.name}
                      </Typography>
                    </Stack>

                    {w.address && (
                      <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary' }}
                      >
                        {w.address}
                      </Typography>
                    )}

                    {w.notes && (
                      <Typography variant="body2">{w.notes}</Typography>
                    )}

                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      gap={1}
                      sx={{ pt: 0.5 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary' }}
                      >
                        ID: {w.id}
                      </Typography>

                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openWarehouse(w.id);
                        }}
                      >
                        Відкрити
                      </Button>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}

          {filtered.length === 0 && (
            <Grid item xs={12}>
              <Alert severity="info">Нічого не знайдено.</Alert>
            </Grid>
          )}
        </Grid>
      )}
    </Stack>
  );
};

export default WarehousesPage;
