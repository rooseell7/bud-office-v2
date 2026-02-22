import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { DataGrid, type GridColDef } from '@mui/x-data-grid';

import { useAuth } from '../../auth/context/AuthContext';
import { getObjects, type ObjectDto } from '../../../api/objects';
import { getMaterials, type MaterialDto } from '../../../api/materials';
import {
  createInvoice,
  deleteInvoice,
  downloadInvoicePdf,
  getInvoices,
  type Invoice,
  type InvoiceItem,
  updateInvoice,
} from '../../../api/invoices';

import { buildDraftKey } from '../../../shared/drafts/draftsApi';
import { useDraft } from '../../../shared/drafts/useDraft';
import { formatFixed, n } from '../../shared/sheet/utils';

function money(v: unknown): string {
  return formatFixed(v, 2);
}

export function InvoicesPage() {
  const auth = useAuth();
  const { can } = auth;

  const canRead = can('supply:read');
  const canWrite = can('supply:write');

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Invoice[]>([]);
  const [q, setQ] = useState('');

  const [objects, setObjects] = useState<ObjectDto[]>([]);
  const [materials, setMaterials] = useState<MaterialDto[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    objectId: '' as string,
    supplierName: '',
    customerName: '',
    status: 'draft',
  });
  const [items, setItems] = useState<InvoiceItem[]>([{ qty: 1 }]);
  const [err, setErr] = useState<string | null>(null);

  const projectIdForDraft = useMemo(() => {
    if (editId != null) {
      const row = rows.find((r) => r.id === editId);
      const oid = row?.objectId ?? row?.projectId;
      return oid != null && Number.isFinite(Number(oid)) ? Number(oid) : 0;
    }
    const oid = form.objectId ? Number(form.objectId) : null;
    return oid != null && Number.isFinite(oid) && oid > 0 ? oid : 0;
  }, [form.objectId, editId, rows]);

  const draftKey = useMemo(() => {
    if (!editOpen) return '';
    const pid = projectIdForDraft > 0 ? projectIdForDraft : 0;
    return buildDraftKey({
      entityType: 'invoice',
      mode: editId == null ? 'create' : 'edit',
      projectId: pid,
      entityId: editId != null ? String(editId) : null,
    });
  }, [editOpen, projectIdForDraft, editId]);

  const {
    hasDraft,
    loading: draftLoading,
    saveDraftData,
    clearDraftData,
    restoreFromDraft,
  } = useDraft<{ form: typeof form; items: InvoiceItem[] }>({
    key: draftKey,
    enabled: editOpen && !!draftKey,
    projectId: projectIdForDraft > 0 ? projectIdForDraft : undefined,
    entityType: 'invoice',
    entityId: editId != null ? String(editId) : undefined,
    scopeType: 'project',
  });

  const objectOptions = useMemo(
    () => objects.map((o) => ({ id: o.id, label: `${o.name} (${o.address})` })),
    [objects],
  );

  const materialById = useMemo(() => {
    const m = new Map<number, MaterialDto>();
    for (const it of materials) m.set(it.id, it);
    return m;
  }, [materials]);

  const totalClient = useMemo(() => {
    return items.reduce((sum, it) => sum + n(it.qty) * n(it.clientPrice), 0);
  }, [items]);

  async function load() {
    if (!canRead) return;
    setLoading(true);
    try {
      const [inv, objs, mats] = await Promise.all([
        getInvoices(q ? { q } : undefined),
        getObjects(),
        getMaterials(),
      ]);
      setRows(inv);
      setObjects(objs);
      setMaterials(mats);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  useEffect(() => {
    if (!editOpen || !draftKey) return;
    saveDraftData({ form, items });
  }, [editOpen, draftKey, form, items, saveDraftData]);

  const cols = useMemo<GridColDef<Invoice>[]>(
    () => [
      { field: 'id', headerName: 'ID', width: 90 },
      {
        field: 'objectId',
        headerName: 'Обʼєкт',
        width: 220,
        valueGetter: (_value, row) => {
          const oid = row.objectId ?? row.projectId;
          const found = objects.find((o) => o.id === oid);
          return found ? found.name : oid ?? '';
        },
      },
      { field: 'supplierName', headerName: 'Постачальник', width: 180 },
      { field: 'customerName', headerName: 'Клієнт', width: 180 },
      { field: 'status', headerName: 'Статус', width: 120 },
      {
        field: 'total',
        headerName: 'Сума',
        width: 120,
        align: 'right',
        headerAlign: 'right',
        valueGetter: (_value, row) => money(row.total),
      },
    ],
    [objects],
  );

  const openNew = useCallback(() => {
    setEditId(null);
    setForm({ objectId: '', supplierName: '', customerName: '', status: 'draft' });
    setItems([{ qty: 1 }]);
    setErr(null);
    setEditOpen(true);
  }, []);

  const openEdit = useCallback((row: Invoice) => {
    setEditId(row.id);
    setForm({
      objectId: String(row.objectId ?? row.projectId ?? ''),
      supplierName: row.supplierName ?? '',
      customerName: row.customerName ?? '',
      status: row.status ?? 'draft',
    });
    setItems(Array.isArray(row.items) && row.items.length ? row.items : [{ qty: 1 }]);
    setErr(null);
    setEditOpen(true);
  }, []);

  function setItem(i: number, patch: Partial<InvoiceItem>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  const onSave = useCallback(async () => {
    setErr(null);
    try {
      const oid = form.objectId ? Number(form.objectId) : undefined;
      const dto: Partial<Invoice> = {
        objectId: oid,
        supplierName: form.supplierName,
        customerName: form.customerName,
        status: form.status as Invoice['status'],
        items: items
          .filter((it) => it.materialId || it.materialName)
          .map((it) => ({
            materialId: it.materialId,
            materialName: it.materialName,
            unit: it.unit,
            qty: n(it.qty),
            supplierPrice: n(it.supplierPrice),
            clientPrice: n(it.clientPrice),
          })),
      };

      if (editId == null) {
        await createInvoice({
          ...dto,
          supplyManagerId: auth.user?.id ?? 1,
          projectId: oid,
        } as any);
      } else {
        await updateInvoice(editId, {
          objectId: dto.objectId ?? undefined,
          type: dto.type ?? undefined,
          internalDirection: dto.internalDirection ?? undefined,
          warehouseId: dto.warehouseId ?? undefined,
          supplierName: dto.supplierName ?? undefined,
          customerName: dto.customerName ?? undefined,
          status: dto.status,
          items: dto.items,
          notes: dto.notes ?? undefined,
        });
      }

      await clearDraftData();
      setEditOpen(false);
      await load();
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { message?: string | string[] } }; message?: string };
      const m = ex?.response?.data?.message;
      const msg = Array.isArray(m) ? m.join(', ') : typeof m === 'string' ? m : ex?.message ?? String(e);
      setErr(msg);
    }
  }, [form, items, editId, auth.user?.id, clearDraftData]);

  async function onDelete(id: number) {
    if (!canWrite) return;
     
    const ok = window.confirm('Видалити накладну?');
    if (!ok) return;
    await deleteInvoice(id);
    await load();
  }

  async function onPdf(id: number) {
    const blob = await downloadInvoicePdf(id);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${id}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  if (!canRead) {
    return (
      <Box p={2}>
        <Typography>Немає доступу (supply:read).</Typography>
      </Box>
    );
  }

  return (
    <Box p={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h5">Накладні</Typography>
          <Typography variant="body2" color="text.secondary">
            Формування накладних по обʼєктах з позиціями матеріалів (ціна постачальника та ціна клієнта).
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <TextField
            size="small"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Пошук (постачальник/клієнт/id)"
          />
          <Button variant="outlined" onClick={load} disabled={loading}>
            Оновити
          </Button>
          <Button variant="contained" onClick={openNew} disabled={!canWrite}>
            Створити
          </Button>
        </Stack>
      </Stack>

      <Box mt={2}>
        <Card>
          <CardContent>
            <Box height={520}>
              <DataGrid
                rows={rows}
                columns={cols}
                loading={loading}
                disableRowSelectionOnClick
                onRowDoubleClick={(p) => openEdit(p.row)}
                getRowId={(r) => r.id}
                initialState={{ pagination: { paginationModel: { pageSize: 20, page: 0 } } }}
                pageSizeOptions={[20, 50, 100]}
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Порада: подвійний клік по рядку відкриває редагування. Для швидкої роботи як у Google Таблицях —
              тримай структуру позицій максимально плоскою (матеріал/од/к-сть/ціни).
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{editId == null ? 'Нова накладна' : `Редагувати накладну #${editId}`}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {hasDraft && !draftLoading ? (
              <Alert severity="info">
                Є збережена чернетка.{' '}
                <Button size="small" onClick={() => restoreFromDraft((p: { form: typeof form; items: InvoiceItem[] }) => { setForm(p.form); setItems(p.items); })}>
                  Відновити
                </Button>
                {' / '}
                <Button size="small" onClick={() => clearDraftData()}>
                  Скинути
                </Button>
              </Alert>
            ) : null}
            {err ? (
              <Typography color="error" variant="body2">
                {err}
              </Typography>
            ) : null}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Обʼєкт</InputLabel>
                <Select
                  label="Обʼєкт"
                  value={form.objectId}
                  onChange={(e) => setForm((p) => ({ ...p, objectId: String(e.target.value) }))}
                >
                  <MenuItem value="">
                    <em>— виберіть —</em>
                  </MenuItem>
                  {objectOptions.map((o) => (
                    <MenuItem key={o.id} value={o.id}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Постачальник"
                value={form.supplierName}
                onChange={(e) => setForm((p) => ({ ...p, supplierName: e.target.value }))}
              />

              <TextField
                fullWidth
                label="Клієнт"
                value={form.customerName}
                onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
              />

              <FormControl fullWidth>
                <InputLabel>Статус</InputLabel>
                <Select
                  label="Статус"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: String(e.target.value) }))}
                >
                  <MenuItem value="draft">draft</MenuItem>
                  <MenuItem value="sent">sent</MenuItem>
                  <MenuItem value="paid">paid</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Divider />

            <Typography variant="h6">Позиції</Typography>
            <Typography variant="body2" color="text.secondary">
              Мінімум 1 позиція. Ціна постачальника та ціна для клієнта зберігаються окремо.
            </Typography>

            {items.map((it, idx) => {
              const mat = it.materialId ? materialById.get(it.materialId) : undefined;
              const matName = it.materialName ?? mat?.name ?? '';
              void matName;
              return (
                <Stack
                  key={idx}
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  alignItems={{ xs: 'stretch', md: 'center' }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Матеріал</InputLabel>
                    <Select
                      label="Матеріал"
                      value={it.materialId ? String(it.materialId) : ''}
                      onChange={(e) => {
                        const mid = e.target.value ? Number(e.target.value) : undefined;
                        const m = mid ? materialById.get(mid) : undefined;
                        setItem(idx, {
                          materialId: mid,
                          materialName: m?.name,
                          unit: m?.unit ?? it.unit,
                        });
                      }}
                    >
                      <MenuItem value="">
                        <em>—</em>
                      </MenuItem>
                      {materials.map((m) => (
                        <MenuItem key={m.id} value={m.id}>
                          {m.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Од."
                    value={it.unit ?? ''}
                    onChange={(e) => setItem(idx, { unit: e.target.value })}
                    sx={{ width: { md: 120 } }}
                  />
                  <TextField
                    label="К-сть"
                    type="number"
                    value={it.qty ?? ''}
                    onChange={(e) => setItem(idx, { qty: e.target.value })}
                    sx={{ width: { md: 140 } }}
                  />
                  <TextField
                    label="Ціна пост."
                    type="number"
                    value={it.supplierPrice ?? ''}
                    onChange={(e) => setItem(idx, { supplierPrice: e.target.value })}
                    sx={{ width: { md: 160 } }}
                  />
                  <TextField
                    label="Ціна клієнт"
                    type="number"
                    value={it.clientPrice ?? ''}
                    onChange={(e) => setItem(idx, { clientPrice: e.target.value })}
                    sx={{ width: { md: 160 } }}
                  />
                  <TextField
                    label="Сума"
                    value={money(n(it.qty) * n(it.clientPrice))}
                    InputProps={{ readOnly: true }}
                    sx={{ width: { md: 160 } }}
                  />

                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                  >
                    Видалити
                  </Button>
                </Stack>
              );
            })}

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Button variant="outlined" onClick={() => setItems((p) => [...p, { qty: 1 }])}>
                Додати позицію
              </Button>
              <Typography variant="h6">Разом: {money(totalClient)}</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          {editId != null ? (
            <Button onClick={() => onPdf(editId)} variant="outlined">
              PDF
            </Button>
          ) : null}
          {editId != null ? (
            <Button onClick={() => onDelete(editId)} color="error" disabled={!canWrite}>
              Видалити
            </Button>
          ) : null}
          <Button onClick={() => setEditOpen(false)}>Скасувати</Button>
          <Button onClick={onSave} variant="contained" disabled={!canWrite}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InvoicesPage;
