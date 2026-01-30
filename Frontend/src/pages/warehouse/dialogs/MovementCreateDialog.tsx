import { useEffect, useMemo, useRef, useState } from 'react';

import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import type {
  CreateWarehouseMovementDto,
  CreateWarehouseMovementItemDto,
  MovementType,
  MovementDetailsDto,
} from '../../../api/warehouse.movements';
import { createWarehouseMovement } from '../../../api/warehouse.movements';

import api from '../../../api/api';

import type { MaterialDto } from '../../../api/materials';
import { getMaterials } from '../../../api/materials';

import { n } from '../../../modules/shared/sheet/utils';

type WarehouseLike = {
  id: number;
  name: string;
};

type Props = {
  open: boolean;
  warehouseId: number;

  // If you want to lock the type (e.g. user clicked "+ IN"), pass defaultType.
  defaultType?: MovementType;

  // Permissions from parent
  canWrite: boolean;
  canTransfer: boolean;

  onClose: () => void;
  onCreated: (created: MovementDetailsDto) => void;
};

function isValidId(v: unknown): boolean {
  const x = n(v);
  return Number.isFinite(x) && x > 0;
}

function normalizeWarehouses(input: unknown): WarehouseLike[] {
  if (!Array.isArray(input)) return [];
  const out: WarehouseLike[] = [];
  for (const it of input) {
    const id = n((it as any)?.id);
    const name = String((it as any)?.name ?? '').trim();
    if (id > 0 && name) out.push({ id, name });
  }
  return out;
}

export default function MovementCreateDialog({
  open,
  warehouseId,
  defaultType,
  canWrite,
  canTransfer,
  onClose,
  onCreated,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // server draft
  const [draftId, setDraftId] = useState<number | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);

  const [type, setType] = useState<MovementType>(defaultType ?? 'IN');

  const [docNo, setDocNo] = useState('');
  const [objectName, setObjectName] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [note, setNote] = useState('');

  // TRANSFER
  const [toWarehouseId, setToWarehouseId] = useState<number | null>(null);

  const [items, setItems] = useState<CreateWarehouseMovementItemDto[]>([
    { materialId: 0, qty: 0, price: null, unit: '' },
  ]);

  const [materials, setMaterials] = useState<MaterialDto[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLike[]>([]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      // materials
      try {
        const mats = await getMaterials();
        if (!cancelled) setMaterials(Array.isArray(mats) ? mats : []);
      } catch {
        if (!cancelled) setMaterials([]);
      }

      // warehouses (via axios instance, no extra module import)
      try {
        const res = await api.get<unknown>('/warehouses');
        if (!cancelled) setWarehouses(normalizeWarehouses((res as any)?.data));
      } catch {
        if (!cancelled) setWarehouses([]);
      }

      // draft (server)
      try {
        const dres = await api.get(`/warehouse/movements/draft/${warehouseId}`);
        const d = (dres as any)?.data ?? dres;
        if (!cancelled) {
          if (d && typeof d === 'object' && (d as any).payload) {
            setDraftId(Number((d as any).id) || null);
            const p = (d as any).payload || {};
            // відновлюємо тільки якщо payload схожий на форму
            if (p && typeof p === 'object') {
              setType((p.type as MovementType) || (defaultType ?? 'IN'));
              setDocNo(String(p.docNo ?? ''));
              setObjectName(String(p.objectName ?? ''));
              setCounterpartyName(String(p.counterpartyName ?? ''));
              setNote(String(p.note ?? ''));
              setToWarehouseId(p.toWarehouseId == null ? null : Number(p.toWarehouseId));
              if (Array.isArray(p.items) && p.items.length) {
                setItems(
                  p.items.map((it: any) => ({
                    materialId: it?.materialId ?? null,
                    qty: it?.qty ?? 0,
                    price: it?.price ?? null,
                    unit: it?.unit ?? null,
                  })),
                );
              }
            }
          } else {
            setDraftId(null);
          }
          setDraftLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setDraftId(null);
          setDraftLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const typeLocked = useMemo(() => Boolean(defaultType), [defaultType]);

  const canSubmit = useMemo(() => {
    if (!canWrite) return false;
    if (type === 'TRANSFER' && !canTransfer) return false;

    if (!isValidId(warehouseId)) return false;

    if (type === 'TRANSFER') {
      if (!isValidId(toWarehouseId)) return false;
      if (n(toWarehouseId) === n(warehouseId)) return false;
    }

    if (!items.length) return false;

    const hasAny = items.some((it) => isValidId(it.materialId) && n(it.qty) > 0);
    if (!hasAny) return false;

    return true;
  }, [canWrite, canTransfer, type, warehouseId, toWarehouseId, items]);

  const reset = () => {
    setErr(null);
    setType(defaultType ?? 'IN');
    setDocNo('');
    setObjectName('');
    setCounterpartyName('');
    setNote('');
    setToWarehouseId(null);
    setItems([{ materialId: 0, qty: 0, price: null, unit: '' }]);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const addRow = () => {
    setItems((p) => [...p, { materialId: 0, qty: 0, price: null, unit: '' }]);
  };

  const removeRow = (idx: number) => {
    setItems((p) => p.filter((_, i) => i !== idx));
  };


  // autosave draft to server (debounced)
  useEffect(() => {
    if (!open) return;
    if (!draftLoaded) return;
    if (!canWrite) return;
    if (!isValidId(warehouseId)) return;

    // не зберігаємо, якщо форма порожня повністю
    const hasAny =
      docNo.trim() ||
      objectName.trim() ||
      counterpartyName.trim() ||
      note.trim() ||
      (Array.isArray(items) && items.some((it) => isValidId((it as any).materialId) || n((it as any).qty) > 0)) ||
      (type === 'TRANSFER' && isValidId(toWarehouseId));

    if (!hasAny) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);

    saveTimer.current = window.setTimeout(async () => {
      try {
        const payload = buildDraftPayload();
        const res = await api.post('/warehouse/movements/draft', {
          warehouseId,
          payload,
        });
        const data = (res as any)?.data ?? res;
        const id = Number((data as any)?.id);
        if (Number.isFinite(id) && id > 0) setDraftId(id);
      } catch {
        // draft save is best-effort; do not block UI
      }
    }, 800);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [
    open,
    draftLoaded,
    canWrite,
    warehouseId,
    type,
    docNo,
    objectName,
    counterpartyName,
    note,
    toWarehouseId,
    items,
  ]);

  const clearDraft = async () => {
    try {
      await api.post(`/warehouse/movements/draft/${warehouseId}/delete`);
    } catch {
      // ignore
    } finally {
      setDraftId(null);
    }
  };

  const updateRow = (idx: number, patch: Partial<CreateWarehouseMovementItemDto>) => {
    setItems((p) => p.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const buildDraftPayload = () => ({
    type,
    docNo,
    objectName,
    counterpartyName,
    note,
    toWarehouseId: type === 'TRANSFER' ? toWarehouseId : null,
    items,
  });

  const submit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setErr(null);

    try {
      const payload: CreateWarehouseMovementDto = {
        type,
        docNo: docNo.trim() || null,
        objectName: objectName.trim() || null,
        counterpartyName: counterpartyName.trim() || null,
        note: note.trim() || null,
        toWarehouseId: type === 'TRANSFER' ? toWarehouseId : null,
        items: items
          .filter((it) => isValidId(it.materialId) && n(it.qty) > 0)
          .map((it) => ({
            materialId: n(it.materialId),
            qty: n(it.qty),
            price: it.price == null ? null : n(it.price),
            unit: (it.unit ?? '').trim() || null,
          })),
      };

      const created = await createWarehouseMovement(warehouseId, payload);
      // після створення — прибираємо чернетку
      await clearDraft();
      onCreated(created);
      reset();
      onClose();
    } catch (e: any) {
      const data = e?.response?.data;
      const msg =
        (typeof data === 'string' && data.trim() && data) ||
        (data && typeof data === 'object' && ((data as any).message || (data as any).error)) ||
        e?.message ||
        'Не вдалося створити операцію.';
      setErr(Array.isArray(msg) ? String(msg[0]) : String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 800 }}>Нова операція складу</DialogTitle>

      
      <DialogContent>
        {draftId ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Відновлено чернетку. 
            <Button size="small" onClick={clearDraft} sx={{ ml: 1 }}>
              Очистити
            </Button>
          </Alert>
        ) : null}

        {!canWrite && (
          <Alert severity="error" sx={{ mb: 2 }}>
            У тебе немає дозволу <b>warehouse:write</b>. Створення операцій недоступне.
          </Alert>
        )}

        {type === 'TRANSFER' && canWrite && !canTransfer && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Для <b>TRANSFER</b> потрібен окремий дозвіл <b>warehouse:transfer</b>.
          </Alert>
        )}

        {err && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {err}
          </Alert>
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            select
            label="Тип"
            value={type}
            onChange={(e) => setType(e.target.value as MovementType)}
            fullWidth
            disabled={typeLocked}
          >
            <MenuItem value="IN">IN (Прихід)</MenuItem>
            <MenuItem value="OUT">OUT (Видаток)</MenuItem>
            <MenuItem value="TRANSFER" disabled={!canTransfer}>
              TRANSFER (Переміщення)
            </MenuItem>
          </TextField>

          {type === 'TRANSFER' && (
            <TextField
              select
              label="Склад-одержувач"
              value={toWarehouseId ?? ''}
              onChange={(e) => setToWarehouseId(Number(e.target.value))}
              fullWidth
              helperText={
                isValidId(toWarehouseId) && n(toWarehouseId) === n(warehouseId)
                  ? 'Одержувач не може бути тим самим складом.'
                  : 'Вибери склад, куди переносимо.'
              }
              error={isValidId(toWarehouseId) && n(toWarehouseId) === n(warehouseId)}
            >
              <MenuItem value="">—</MenuItem>
              {warehouses.map((w) => (
                <MenuItem key={w.id} value={w.id} disabled={w.id === warehouseId}>
                  {w.name}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Документ (№)"
            value={docNo}
            onChange={(e) => setDocNo(e.target.value)}
            fullWidth
          />
          <TextField
            label="Обʼєкт"
            value={objectName}
            onChange={(e) => setObjectName(e.target.value)}
            fullWidth
          />
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField
            label="Контрагент"
            value={counterpartyName}
            onChange={(e) => setCounterpartyName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Примітка"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            fullWidth
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 800 }}>Позиції</Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Мінімум 1 позиція з матеріалом і кількістю.
            </Typography>
          </Box>

          <Button startIcon={<AddIcon />} onClick={addRow} variant="outlined">
            Додати позицію
          </Button>
        </Stack>

        <Stack spacing={1}>
          {items.map((it, idx) => (
            <Stack
              key={idx}
              direction={{ xs: 'column', md: 'row' }}
              spacing={1}
              alignItems={{ md: 'center' }}
            >
              <Autocomplete
                options={materials}
                value={materials.find((m) => m.id === it.materialId) ?? null}
                getOptionLabel={(m) => m?.name ?? ''}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, m) =>
                  updateRow(idx, {
                    materialId: m?.id ?? 0,
                    unit: m?.unit ?? '',
                  })
                }
                renderInput={(params) => (
                  <TextField {...params} label="Матеріал" sx={{ minWidth: 320 }} />
                )}
              />

              <TextField
                label="Од."
                value={String(it.unit ?? '')}
                onChange={(e) => updateRow(idx, { unit: e.target.value })}
                sx={{ width: { xs: '100%', md: 120 } }}
              />

              <TextField
                label="К-сть"
                value={String(it.qty ?? '')}
                onChange={(e) => updateRow(idx, { qty: n(e.target.value) })}
                sx={{ width: { xs: '100%', md: 120 } }}
              />

              <TextField
                label="Ціна"
                value={it.price == null ? '' : String(it.price)}
                onChange={(e) =>
                  updateRow(idx, { price: e.target.value === '' ? null : n(e.target.value) })
                }
                sx={{ width: { xs: '100%', md: 140 } }}
              />

              <IconButton
                onClick={() => removeRow(idx)}
                disabled={items.length <= 1}
                aria-label="remove"
              >
                <DeleteOutlineIcon />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Скасувати
        </Button>
        <Button variant="contained" onClick={submit} disabled={!canSubmit || submitting}>
          Створити
        </Button>
      </DialogActions>
    </Dialog>
  );
}