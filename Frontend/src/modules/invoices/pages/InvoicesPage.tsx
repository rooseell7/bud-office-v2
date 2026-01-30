import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

import {
  createInvoice,
  downloadInvoicePdf,
  listInvoices,
  type Invoice,
} from '../api/invoices.api';

import { getObjects, type ObjectDto } from '../../../api/objects';

import api from '../../../api/api';

import { f2, n } from '../../shared/sheet/utils';

type WarehouseLike = { id: number; name: string };

// MVP: список + швидке створення чернетки. Далі розширимо до “табличного” редагування.

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<Invoice[]>([]);

  const [objects, setObjects] = useState<ObjectDto[]>([]);
  const [loadingObjects, setLoadingObjects] = useState(false);

  // прості фільтри
  const [q, setQ] = useState('');
  const [objectId, setObjectId] = useState<number | null>(null);

  // URL -> state (підтримка переходів з вкладки Обʼєкта)
  useEffect(() => {
    const raw = (searchParams.get('objectId') ?? '').trim();
    if (!raw) return;
    const oid = Number(raw);
    if (Number.isFinite(oid) && oid > 0) {
      setObjectId(oid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // авто‑оновлення списку при зміні фільтра Обʼєкт (щоб працювало і для /invoices?objectId=...)
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId]);

  // створення (вибір обʼєкта)
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<'external' | 'internal'>('external');
  const [createObject, setCreateObject] = useState<ObjectDto | null>(null);
  const [createDirection, setCreateDirection] = useState<'IN' | 'OUT'>('IN');
  const [warehouses, setWarehouses] = useState<WarehouseLike[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [createWarehouse, setCreateWarehouse] = useState<WarehouseLike | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listInvoices({
        q: q.trim() || undefined,
        objectId: objectId ?? undefined,
      });
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }

  async function loadObjects() {
    setLoadingObjects(true);
    try {
      const data = await getObjects();
      setObjects(data);
    } catch {
      // не ламаємо UI — список накладних працює і без обʼєктів
    } finally {
      setLoadingObjects(false);
    }
  }

  async function loadWarehouses() {
    setWarehousesLoading(true);
    try {
      const res = await api.get<any>('/warehouses');
      const data = res.data;
      const list: WarehouseLike[] = Array.isArray(data)
        ? (data as WarehouseLike[])
        : Array.isArray(data?.items)
          ? (data.items as WarehouseLike[])
          : Array.isArray(data?.data)
            ? (data.data as WarehouseLike[])
            : [];
      const sorted = [...list].sort((a, b) => String(a?.name ?? '').localeCompare(String(b?.name ?? ''), 'uk'));
      setWarehouses(sorted);
      setCreateWarehouse((prev) => {
        if (prev && sorted.some((w) => w.id === prev.id)) return prev;
        return sorted[0] ?? null;
      });
    } catch {
      setWarehouses([]);
      setCreateWarehouse(null);
    } finally {
      setWarehousesLoading(false);
    }
  }

  useEffect(() => {
    // load() викликається окремо (mount + зміна objectId)
    void Promise.all([loadObjects(), loadWarehouses()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const objectById = useMemo(() => {
    const m = new Map<number, ObjectDto>();
    for (const o of objects) m.set(o.id, o);
    return m;
  }, [objects]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return items;
    return items.filter((x) => {
      const s = `${x.id} ${x.objectId} ${x.supplierName ?? ''} ${x.customerName ?? ''} ${x.status}`.toLowerCase();
      return s.includes(qq);
    });
  }, [items, q]);

  const grouped = useMemo(() => {
    const groups = new Map<number, Invoice[]>();
    for (const inv of filtered) {
      const oid = inv.objectId;
      const arr = groups.get(oid) ?? [];
      arr.push(inv);
      groups.set(oid, arr);
    }
    // sort: objectId asc, invoices by objectSeq desc (fallback id desc)
    const out = Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([oid, arr]) => {
        arr.sort((x, y) => {
          const xn = x.objectSeq && x.objectSeq > 0 ? x.objectSeq : x.id;
          const yn = y.objectSeq && y.objectSeq > 0 ? y.objectSeq : y.id;
          return yn - xn;
        });
        return { objectId: oid, invoices: arr };
      });
    return out;
  }, [filtered]);

  function openCreate() {
    setCreateObject(null);
    setCreateType('external');
    setCreateDirection('IN');
    setCreateWarehouse(warehouses[0] ?? null);
    setCreateOpen(true);
  }

  async function onCreateConfirm() {
    if (createType === 'external' && !createObject?.id) {
      setError('Оберіть обʼєкт для накладної');
      return;
    }
    if (createType === 'internal' && !createWarehouse?.id) {
      setError('Оберіть склад для внутрішньої накладної');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const inv = await createInvoice({
        type: createType,
        internalDirection: createType === 'internal' ? createDirection : undefined,
        warehouseId: createType === 'internal' ? createWarehouse?.id ?? undefined : undefined,
        objectId: createType === 'external' ? createObject!.id : createObject?.id ?? undefined,
        status: 'draft',
        items: [],
      });
      setItems((prev) => [inv, ...prev]);
      setCreateOpen(false);
      navigate(`/invoices/${inv.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message?.join?.('\n') || e?.message || 'Помилка створення');
    } finally {
      setLoading(false);
    }
  }

  async function onPdfClient(id: number) {
    setLoading(true);
    setError(null);
    try {
      const blob = await downloadInvoicePdf(id, 'client');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Не вдалося згенерувати PDF');
    } finally {
      setLoading(false);
    }
  }

  async function onPdfInternal(id: number) {
    setLoading(true);
    setError(null);
    try {
      const blob = await downloadInvoicePdf(id, 'internal');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${id}_internal.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Не вдалося згенерувати PDF');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Накладні
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Чернетки накладних по об’єктах. Далі додамо “табличний” редактор і авто‑підтягування матеріалів.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={load} disabled={loading}>
            Оновити
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            disabled={loading}
          >
            Створити накладну
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} mb={2}>
            <TextField
              fullWidth
              label="Пошук (id/обʼєкт/постачальник/клієнт)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Autocomplete
              options={objects}
              loading={loadingObjects}
              value={objectId ? objectById.get(objectId) ?? null : null}
              onChange={(_, v) => setObjectId(v?.id ?? null)}
              getOptionLabel={(o) => `${o.name}${o.address ? ` (${o.address})` : ''}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Фільтр: обʼєкт"
                  sx={{ width: { xs: '100%', md: 320 } }}
                />
              )}
            />
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {loading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          )}

          {!loading && grouped.length === 0 && (
            <Typography color="text.secondary">Поки немає накладних.</Typography>
          )}

          {!loading && grouped.length > 0 && (
            <Stack spacing={2}>
              {grouped.map((g) => {
                const obj = objectById.get(g.objectId);
                return (
                  <Box key={g.objectId}>
                    <Typography fontWeight={800} mb={1}>
                      {obj
                        ? obj.name
                        : g.objectId > 0
                          ? `Обʼєкт #${g.objectId}`
                          : 'Без обʼєкта (внутрішні/складські)'}
                      {obj?.address ? (
                        <Typography component="span" color="text.secondary" fontWeight={400}>
                          {' '}· {obj.address}
                        </Typography>
                      ) : null}
                    </Typography>

                    <Stack spacing={1}>
                      {g.invoices.map((x) => (
                        <Box
                          key={x.id}
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          sx={{
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: 2,
                            p: 1.5,
                          }}
                        >
                          <Box>
                            <Typography fontWeight={700}>
                              Накладна №{(x.objectSeq && x.objectSeq > 0 ? x.objectSeq : x.id) as any}
                              <Typography component="span" color="text.secondary" fontWeight={400}>
                                {' '}(id: {x.id})
                              </Typography>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              статус: {x.status}
                            </Typography>
                            {String((x as any).type) === 'internal' && (
                              <Typography variant="body2" color="text.secondary">
                                Внутрішня: {(x as any).internalDirection ?? '—'} · склад: {(x as any).warehouseId ?? '—'}
                              </Typography>
                            )}
                            {(x.totalSupplier != null || x.totalCustomer != null) && (
                              <Typography variant="body2" color="text.secondary">
                                Сума пост.: <b>{f2(n(x.totalSupplier))}</b> · Сума клієнт: <b>{f2(n(x.totalCustomer))}</b>
                              </Typography>
                            )}
                          </Box>

                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="outlined"
                              startIcon={<OpenInNewIcon />}
                              onClick={() => navigate(`/invoices/${x.id}`)}
                              disabled={loading}
                            >
                              Відкрити
                            </Button>
                            <Button
                              variant="outlined"
                              startIcon={<PictureAsPdfOutlinedIcon />}
                              onClick={() => void onPdfClient(x.id)}
                              disabled={loading}
                            >
                              PDF клієнт
                            </Button>
                            <Button
                              variant="outlined"
                              startIcon={<PictureAsPdfOutlinedIcon />}
                              onClick={() => void onPdfInternal(x.id)}
                              disabled={loading}
                            >
                              PDF внутр.
                            </Button>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Створити накладну</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <Stack spacing={1.5}>
              <TextField
                select
                label="Тип"
                value={createType}
                onChange={(e) => setCreateType(e.target.value as any)}
              >
                <MenuItem value="external">Зовнішня (постачальник → обʼєкт)</MenuItem>
                <MenuItem value="internal">Внутрішня (на склад / зі складу)</MenuItem>
              </TextField>

              {createType === 'internal' && (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    select
                    label="Напрям"
                    value={createDirection}
                    onChange={(e) => setCreateDirection(e.target.value as any)}
                    sx={{ flex: 1 }}
                  >
                    <MenuItem value="IN">На склад (IN)</MenuItem>
                    <MenuItem value="OUT">Зі складу (OUT)</MenuItem>
                  </TextField>

                  <Autocomplete
                    options={warehouses}
                    loading={warehousesLoading}
                    value={createWarehouse}
                    onChange={(_, v) => setCreateWarehouse(v)}
                    getOptionLabel={(o) => String(o?.name ?? '')}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Склад"
                        placeholder="Оберіть склад"
                        sx={{ minWidth: 220 }}
                      />
                    )}
                    sx={{ flex: 2 }}
                  />
                </Stack>
              )}

            <Autocomplete
              options={objects}
              loading={loadingObjects}
              value={createObject}
              onChange={(_, v) => setCreateObject(v)}
              getOptionLabel={(o) => `${o.name}${o.address ? ` (${o.address})` : ''}`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={createType === 'internal' ? 'Обʼєкт (опціонально)' : 'Обʼєкт'}
                  placeholder="Почни вводити назву обʼєкта"
                />
              )}
            />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={loading}>Скасувати</Button>
          <Button
            variant="contained"
            onClick={() => void onCreateConfirm()}
            disabled={
              loading
              || (createType === 'external' && !createObject)
              || (createType === 'internal' && !createWarehouse)
            }
          >
            Створити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
