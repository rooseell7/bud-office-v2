import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

// ✅ HOTFIX: типи в тебе відрізняються. Щоб прибрати TS-помилки — мінімізуємо жорстку типізацію тут.
// Далі (крок 2.1 за потреби) підженемо строго під твої work-log.types.ts.
import type { CreateWorkLogDto, WorkLog } from '../types/work-log.types';
import { useAuth } from '../../auth/context/AuthContext';

type Id = number | string;

type Props = {
  open: boolean;
  onClose: () => void;
  editItem?: WorkLog | null;
  onCreate: (dto: CreateWorkLogDto) => Promise<void> | void;
  onUpdate: (id: Id, dto: Partial<CreateWorkLogDto>) => Promise<void> | void;
};

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function WorkLogModal({
  open,
  onClose,
  editItem,
  onCreate,
  onUpdate,
}: Props) {
  const { can } = useAuth();

  const canWrite = useMemo(() => {
    try {
      return can('delivery:write');
    } catch {
      return false;
    }
  }, [can]);

  const isEdit = Boolean(editItem && (editItem as unknown as Record<string, unknown>).id);

  // ✅ поля зберігаємо як у твоєму UI, але читаємо з editItem через any
  const [date, setDate] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [qty, setQty] = useState<string>('0');
  const [unit, setUnit] = useState<string>('');
  const [price, setPrice] = useState<string>('0');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const total = useMemo(() => {
    const q = toNum(qty);
    const p = toNum(price);
    return q * p;
  }, [qty, price]);

  useEffect(() => {
    if (!open) return;

    setErr(null);

    if (editItem) {
      const it = editItem as unknown as Record<string, unknown>;
      setDate(String(it.date ?? it.workDate ?? it.performedAt ?? '').slice(0, 10));
      setTitle(String(it.title ?? it.name ?? it.workName ?? ''));
      setComment(String(it.comment ?? it.note ?? it.notes ?? ''));
      setQty(String(it.qty ?? it.quantity ?? 0));
      setUnit(String(it.unit ?? it.unitName ?? ''));
      setPrice(String(it.price ?? it.unitPrice ?? 0));
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');

      setDate(`${yyyy}-${mm}-${dd}`);
      setTitle('');
      setComment('');
      setQty('0');
      setUnit('');
      setPrice('0');
    }
  }, [open, editItem]);

  const isValid = useMemo(() => {
    if (!date) return false;
    if (!title.trim()) return false;
    if (toNum(qty) <= 0) return false;
    return true;
  }, [date, title, qty]);

  async function handleSubmit() {
    setErr(null);

    if (!canWrite) {
      setErr('Немає прав на створення/редагування робіт (потрібно: delivery:write).');
      return;
    }

    if (!isValid) {
      setErr('Перевір заповнення полів (дата, назва, кількість > 0).');
      return;
    }

    try {
      setBusy(true);

      const workDate = date ? date.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const dto: CreateWorkLogDto = {
        projectId: 0,
        title: title.trim(),
        qty: toNum(qty),
        unit: unit.trim(),
        price: toNum(price),
        workDate,
        note: comment.trim() || undefined,
      };

      if (isEdit && editItem && (editItem as unknown as Record<string, unknown>).id != null) {
        await onUpdate((editItem as unknown as Record<string, unknown>).id as Id, dto);
      } else {
        await onCreate(dto);
      }

      onClose();
    } catch (e: unknown) {
      setErr((e as Error)?.message ?? 'Помилка збереження.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Редагування роботи' : 'Нова робота'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!canWrite && (
            <Alert severity="warning">
              У тебе немає дозволу <b>delivery:write</b>. Поля заблоковано, збереження недоступне.
            </Alert>
          )}

          {err && <Alert severity="error">{err}</Alert>}

          <TextField
            label="Дата"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            disabled={!canWrite || busy}
            fullWidth
          />

          <TextField
            label="Назва/опис"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canWrite || busy}
            fullWidth
          />

          <TextField
            label="Коментар"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={!canWrite || busy}
            fullWidth
            multiline
            minRows={2}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Кількість"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              disabled={!canWrite || busy}
              fullWidth
              inputMode="decimal"
            />
            <TextField
              label="Одиниця"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={!canWrite || busy}
              fullWidth
              placeholder="шт / м2 / м3 ..."
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Ціна"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={!canWrite || busy}
              fullWidth
              inputMode="decimal"
            />
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Сума</Typography>
                <Typography variant="h6">{Number.isFinite(total) ? total.toFixed(2) : '0.00'}</Typography>
              </Box>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Закрити</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!canWrite || busy || !isValid}
        >
          {isEdit ? 'Зберегти' : 'Створити'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}