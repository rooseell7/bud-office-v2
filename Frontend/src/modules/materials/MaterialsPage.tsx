import { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import EditIcon from '@mui/icons-material/Edit';

import { getAxiosErrorMessage } from '../../shared/httpError';
import { createMaterial, getMaterials, updateMaterial } from '../../api/materials';
import { lsGetJson, lsSetJson } from '../../shared/localStorageJson';

const LS_MATERIAL_META_KEY = 'buduy.materials.meta.v1';

type MaterialMetaMap = Record<number, { supplierName?: string }>;

function loadMaterialMeta(): MaterialMetaMap {
  return lsGetJson<MaterialMetaMap>(LS_MATERIAL_META_KEY, {});
}

function saveMaterialMeta(meta: MaterialMetaMap) {
  lsSetJson(LS_MATERIAL_META_KEY, meta);
}

type Row = {
  id: number;
  name: string;
  unit?: string;
  supplierName?: string;
  basePrice: string;
  weightKg: string;
  consumptionPerM2: string;
  consumptionPerLm: string;
  isActive: boolean;
};

type CreateForm = {
  name: string;
  unit: string;
  supplierName: string;
  basePrice: string;
  weightKg: string;
  consumptionPerM2: string;
  consumptionPerLm: string;
};

type ImportRow = {
  name: string;
  unit: string;
};

function splitTsv(text: string): string[][] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0)
    .map((line) => line.split('\t'));
}

export default function MaterialsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>('');

  const [items, setItems] = useState<Row[]>([]);
  const [q, setQ] = useState('');

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    name: '',
    unit: '',
    supplierName: '',
    basePrice: '0',
    weightKg: '',
    consumptionPerM2: '0',
    consumptionPerLm: '0',
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [edit, setEdit] = useState<Row | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);

  async function load() {
    setLoading(true);
    setErr('');
    try {
      const meta = loadMaterialMeta();
      const rows = await getMaterials();
      setItems(
        rows.map((m) => ({
          id: Number(m.id),
          name: String(m.name ?? ''),
          unit: String(m.unit ?? ''),
          supplierName: meta[Number(m.id)]?.supplierName ?? '',
          basePrice: String((m as any).basePrice ?? 0),
          consumptionPerM2: String((m as any).consumptionPerM2 ?? 0),
          consumptionPerLm: String((m as any).consumptionPerLm ?? 0),
          isActive: Boolean(m.isActive),
        })),
      );
    } catch (e) {
      setErr(getAxiosErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((m) => {
      const s = `${m.name ?? ''} ${m.unit ?? ''} ${m.supplierName ?? ''}`.toLowerCase();
      return s.includes(needle) || String(m.id).includes(needle);
    });
  }, [items, q]);

  // unit зараз опційна — головне, щоб була назва.
  const canSave = form.name.trim().length > 0;

  async function onCreate() {
    if (!canSave || saving) return;
    setSaving(true);
    setErr('');
    try {
      const supplierName = form.supplierName.trim();
      const unit = form.unit.trim();
      const basePrice = Number(form.basePrice);
      const weightKg = Number(form.weightKg);
      const consumptionPerM2 = Number(form.consumptionPerM2);
      const consumptionPerLm = Number(form.consumptionPerLm);
      const created = await createMaterial({
        name: form.name.trim(),
        ...(unit ? { unit } : {}),
        basePrice: Number.isFinite(basePrice) ? basePrice : 0,
        ...(form.weightKg.trim() ? { weightKg: Number.isFinite(weightKg) ? weightKg : undefined } : {}),
        consumptionPerM2: Number.isFinite(consumptionPerM2) ? consumptionPerM2 : 0,
        consumptionPerLm: Number.isFinite(consumptionPerLm) ? consumptionPerLm : 0,
      });

      if (supplierName) {
        const meta = loadMaterialMeta();
        meta[Number(created.id)] = { ...(meta[Number(created.id)] ?? {}), supplierName };
        saveMaterialMeta(meta);
      }
      setItems((prev) => [
        {
          id: Number(created.id),
          name: String(created.name ?? ''),
          unit: String(created.unit ?? ''),
          supplierName,
          basePrice: String((created as any).basePrice ?? 0),
          consumptionPerM2: String((created as any).consumptionPerM2 ?? 0),
          consumptionPerLm: String((created as any).consumptionPerLm ?? 0),
          isActive: Boolean(created.isActive),
        },
        ...prev,
      ]);
      setOpen(false);
      setForm({
        name: '',
        unit: '',
        supplierName: '',
        basePrice: '0',
        weightKg: '',
        consumptionPerM2: '0',
        consumptionPerLm: '0',
      });
    } catch (e) {
      setErr(getAxiosErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit() {
    if (!edit || editSaving) return;
    if (!edit.name.trim()) return;

    setEditSaving(true);
    setErr('');
    try {
      const supplierName = (edit.supplierName ?? '').trim();
      const unit = (edit.unit ?? '').trim();
      const basePrice = Number(edit.basePrice);
      const weightKg = Number((edit as any).weightKg);
      const c2 = Number(edit.consumptionPerM2);
      const clm = Number(edit.consumptionPerLm);

      const updated = await updateMaterial(edit.id, {
        name: edit.name.trim(),
        ...(unit ? { unit } : { unit: null }),
        basePrice: Number.isFinite(basePrice) ? basePrice : 0,
        ...((String((edit as any).weightKg ?? '').trim()) ? { weightKg: Number.isFinite(weightKg) ? weightKg : undefined } : { weightKg: null }),
        consumptionPerM2: Number.isFinite(c2) ? c2 : 0,
        consumptionPerLm: Number.isFinite(clm) ? clm : 0,
        isActive: !!edit.isActive,
      });

      // supplierName зберігаємо локально (LS)
      const meta = loadMaterialMeta();
      if (supplierName) {
        meta[edit.id] = { ...(meta[edit.id] ?? {}), supplierName };
      } else {
        // якщо очистили поле — прибираємо значення
        if (meta[edit.id]) meta[edit.id] = { ...meta[edit.id], supplierName: '' };
      }
      saveMaterialMeta(meta);

      setItems((prev) =>
        prev.map((it) =>
          it.id === edit.id
            ? {
                id: Number(updated.id),
                name: String(updated.name ?? ''),
                unit: String(updated.unit ?? ''),
                supplierName,
                basePrice: String((updated as any).basePrice ?? 0),
                consumptionPerM2: String((updated as any).consumptionPerM2 ?? 0),
                consumptionPerLm: String((updated as any).consumptionPerLm ?? 0),
                isActive: Boolean((updated as any).isActive),
              }
            : it,
        ),
      );
      setEditOpen(false);
      setEdit(null);
    } catch (e) {
      setErr(getAxiosErrorMessage(e));
    } finally {
      setEditSaving(false);
    }
  }

  async function onPasteImport() {
    setErr('');
    try {
      const text = await navigator.clipboard.readText();
      const data = splitTsv(text);
      const rows: ImportRow[] = data
        .map((cols) => ({
          name: String(cols[0] ?? '').trim(),
          unit: String(cols[1] ?? '').trim(),
        }))
        .filter((r) => r.name.length > 0);
      setImportRows(rows);
    } catch (e) {
      setErr(getAxiosErrorMessage(e));
    }
  }

  async function onRunImport() {
    if (importing) return;
    const rows = importRows.filter((r) => r.name.trim().length > 0);
    if (!rows.length) return;
    setImporting(true);
    setErr('');
    try {
      const created: Row[] = [];
      // імпорт робимо послідовно, щоб не навантажувати бек і мати стабільні помилки
      for (const r of rows) {
        const unit = r.unit.trim();
        const m = await createMaterial({ name: r.name.trim(), ...(unit ? { unit } : {}) });
        created.push({
          id: Number(m.id),
          name: String(m.name ?? ''),
          unit: String(m.unit ?? ''),
          basePrice: String((m as any).basePrice ?? 0),
          consumptionPerM2: String((m as any).consumptionPerM2 ?? 0),
          consumptionPerLm: String((m as any).consumptionPerLm ?? 0),
          isActive: Boolean(m.isActive),
        });
      }
      setItems((prev) => [...created.reverse(), ...prev]);
      setImportRows([]);
      setImportOpen(false);
    } catch (e) {
      setErr(getAxiosErrorMessage(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <Box p={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} mb={2}>
        <Box>
          <Typography variant="h6">Матеріали</Typography>
          <Typography variant="body2" color="text.secondary">
            Довідник матеріалів (CRUD)
          </Typography>
        </Box>

        <Stack direction="row" gap={1}>
          <Button onClick={load} disabled={loading} variant="outlined">
            Оновити
          </Button>
          <Button onClick={() => { setImportOpen(true); setImportRows([]); }} variant="outlined">
            Імпорт з Excel
          </Button>
          <Button onClick={() => setOpen(true)} variant="contained">
            Створити матеріал
          </Button>
        </Stack>
      </Stack>

      {err ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      ) : null}

      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} gap={1} mb={2}>
            <TextField
              size="small"
              fullWidth
              label="Пошук"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </Stack>

          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Назва</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Од.</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Постачальник</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Актуальна ціна</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Вага, кг</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Витрата/м²</th>
                    <th style={{ textAlign: 'right', padding: 8 }}>Витрата/м.п.</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Активний</th>
                    <th style={{ textAlign: 'right', padding: 8, width: 64 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id}>
                      <td style={{ padding: 8 }}>{m.id}</td>
                      <td style={{ padding: 8 }}>{m.name}</td>
                      <td style={{ padding: 8 }}>{m.unit}</td>
                      <td style={{ padding: 8 }}>{m.supplierName}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>{m.basePrice}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>{m.weightKg || '—'}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>{m.consumptionPerM2}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>{m.consumptionPerLm}</td>
                      <td style={{ padding: 8 }}>{m.isActive ? 'так' : 'ні'}</td>
                      <td style={{ padding: 8, textAlign: 'right' }}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEdit({ ...m });
                            setEditOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: 8, color: '#666' }}>
                        Нічого не знайдено
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => (saving ? null : setOpen(false))} fullWidth maxWidth="sm">
        <DialogTitle>Створити матеріал</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Назва"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              autoFocus
            />
            <TextField
              label="Одиниця"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              helperText="Напр.: м2, м3, шт, кг, мп"
            />
            <TextField
              label="Постачальник"
              value={form.supplierName}
              onChange={(e) => setForm((p) => ({ ...p, supplierName: e.target.value }))}
              helperText="Локально (зберігається в цьому браузері)"
            />
            <TextField
              label="Актуальна ціна"
              value={form.basePrice}
              onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))}
              type="number"
              inputProps={{ step: '0.01' }}
            />
            <TextField
              label="Вага, кг (опц.)"
              value={form.weightKg}
              onChange={(e) => setForm((p) => ({ ...p, weightKg: e.target.value }))}
              type="number"
              inputProps={{ step: '0.001' }}
              helperText="Необов’язково. Напр.: 25"
            />
            <Stack direction={{ xs: 'column', md: 'row' }} gap={1}>
              <TextField
                fullWidth
                label="Витрата на 1 м²"
                value={form.consumptionPerM2}
                onChange={(e) => setForm((p) => ({ ...p, consumptionPerM2: e.target.value }))}
                type="number"
                inputProps={{ step: '0.0001' }}
              />
              <TextField
                fullWidth
                label="Витрата на 1 м.п."
                value={form.consumptionPerLm}
                onChange={(e) => setForm((p) => ({ ...p, consumptionPerLm: e.target.value }))}
                type="number"
                inputProps={{ step: '0.0001' }}
              />
            </Stack>
          </Box>
          {saving ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={20} />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>
            Скасувати
          </Button>
          <Button onClick={onCreate} disabled={!canSave || saving} variant="contained">
            Створити
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => (editSaving ? null : (setEditOpen(false), setEdit(null)))}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Редагувати матеріал</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Назва"
              value={edit?.name ?? ''}
              onChange={(e) => setEdit((p) => (p ? { ...p, name: e.target.value } : p))}
              autoFocus
            />
            <TextField
              label="Одиниця"
              value={edit?.unit ?? ''}
              onChange={(e) => setEdit((p) => (p ? { ...p, unit: e.target.value } : p))}
              helperText="Напр.: м2, м3, шт, кг, мп"
            />
            <TextField
              label="Постачальник"
              value={edit?.supplierName ?? ''}
              onChange={(e) => setEdit((p) => (p ? { ...p, supplierName: e.target.value } : p))}
              helperText="Локально (зберігається в цьому браузері)"
            />
            <TextField
              label="Актуальна ціна"
              value={edit?.basePrice ?? '0'}
              onChange={(e) => setEdit((p) => (p ? { ...p, basePrice: e.target.value } : p))}
              type="number"
              inputProps={{ step: '0.01' }}
            />
            <TextField
              label="Вага, кг (опц.)"
              value={(edit as any)?.weightKg ?? ''}
              onChange={(e) => setEdit((p) => (p ? ({ ...(p as any), weightKg: e.target.value } as any) : p))}
              type="number"
              inputProps={{ step: '0.001' }}
              helperText="Необов’язково"
            />
            <Stack direction={{ xs: 'column', md: 'row' }} gap={1}>
              <TextField
                fullWidth
                label="Витрата на 1 м²"
                value={edit?.consumptionPerM2 ?? '0'}
                onChange={(e) => setEdit((p) => (p ? { ...p, consumptionPerM2: e.target.value } : p))}
                type="number"
                inputProps={{ step: '0.0001' }}
              />
              <TextField
                fullWidth
                label="Витрата на 1 м.п."
                value={edit?.consumptionPerLm ?? '0'}
                onChange={(e) => setEdit((p) => (p ? { ...p, consumptionPerLm: e.target.value } : p))}
                type="number"
                inputProps={{ step: '0.0001' }}
              />
            </Stack>
            <FormControlLabel
              control={
                <Checkbox
                  checked={Boolean(edit?.isActive)}
                  onChange={(e) => setEdit((p) => (p ? { ...p, isActive: e.target.checked } : p))}
                />
              }
              label="Активний"
            />
          </Box>
          {editSaving ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={20} />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setEditOpen(false);
              setEdit(null);
            }}
            disabled={editSaving}
          >
            Скасувати
          </Button>
          <Button
            onClick={onSaveEdit}
            disabled={editSaving || !(edit?.name?.trim()?.length)}
            variant="contained"
          >
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importOpen} onClose={() => (importing ? null : setImportOpen(false))} fullWidth maxWidth="md">
        <DialogTitle>Імпорт матеріалів з Excel</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Скопіюй з Excel/Sheets 2 колонки: <b>Назва</b> та <b>Од.</b>, потім натисни “Вставити”.
          </Typography>
          <Stack direction="row" gap={1} mb={2}>
            <Button variant="outlined" onClick={onPasteImport} disabled={importing}>
              Вставити
            </Button>
            <Button variant="contained" onClick={onRunImport} disabled={importing || importRows.length === 0}>
              Імпортувати ({importRows.length})
            </Button>
          </Stack>

          <Box sx={{ maxHeight: 320, overflow: 'auto', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Назва</th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid rgba(0,0,0,0.08)', width: 120 }}>Од.</th>
                </tr>
              </thead>
              <tbody>
                {importRows.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: 8, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{r.name}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{r.unit}</td>
                  </tr>
                ))}
                {importRows.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ padding: 12, color: '#666' }}>
                      Немає даних. Натисни “Вставити”.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </Box>

          {importing ? (
            <Box display="flex" justifyContent="center" py={2}>
              <CircularProgress size={20} />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportOpen(false)} disabled={importing}>
            Закрити
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
