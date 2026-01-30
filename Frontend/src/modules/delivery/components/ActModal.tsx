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

// ✅ HOTFIX: DTO/типи в тебе відрізняються. Щоб прибрати TS-помилки — мінімізуємо жорстку типізацію тут.
// Далі підженемо строго під act.types.ts.
import type { DeliveryAct } from '../types/act.types';
import { useAuth } from '../../auth/context/AuthContext';

type Id = number | string;

type Props = {
  open: boolean;
  onClose: () => void;
  editItem?: DeliveryAct | null;
  onCreate: (dto: any) => Promise<void> | void;
  onUpdate: (id: Id, dto: any) => Promise<void> | void;
};

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function ActModal({
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

  const isEdit = Boolean((editItem as any)?.id);

  const [date, setDate] = useState<string>('');
  const [name, setName] = useState<string>(''); // №/назва акту
  const [comment, setComment] = useState<string>('');
  const [amount, setAmount] = useState<string>('0');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setErr(null);

    if (editItem) {
      const it: any = editItem;
      setDate(String(it.date ?? it.actDate ?? '').slice(0, 10));
      setName(String(it.name ?? it.number ?? it.title ?? ''));
      setComment(String(it.comment ?? it.note ?? it.notes ?? ''));
      setAmount(String(it.amount ?? it.total ?? it.sum ?? 0));
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');

      setDate(`${yyyy}-${mm}-${dd}`);
      setName('');
      setComment('');
      setAmount('0');
    }
  }, [open, editItem]);

  const isValid = useMemo(() => {
    if (!date) return false;
    if (!name.trim()) return false;
    if (toNum(amount) <= 0) return false;
    return true;
  }, [date, name, amount]);

  async function handleSubmit() {
    setErr(null);

    if (!canWrite) {
      setErr('Немає прав на створення/редагування актів (потрібно: delivery:write).');
      return;
    }

    if (!isValid) {
      setErr('Перевір заповнення полів (дата, назва акту, сума > 0).');
      return;
    }

    try {
      setBusy(true);

      // ✅ HOTFIX: збираємо як any (бо DTO типи у тебе інші).
      const dto: any = {
        date,
        name: name.trim(),
        comment: comment.trim(),
        amount: toNum(amount),
      };

      if (isEdit && (editItem as any)?.id != null) {
        await onUpdate((editItem as any).id as Id, dto);
      } else {
        await onCreate(dto);
      }

      onClose();
    } catch (e: any) {
      setErr(e?.message ?? 'Помилка збереження.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Редагування акту' : 'Новий акт'}</DialogTitle>

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
            label="Акт (№ / назва)"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
              label="Сума"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={!canWrite || busy}
              fullWidth
              inputMode="decimal"
            />
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Перевірка</Typography>
                <Typography variant="h6">{toNum(amount).toFixed(2)}</Typography>
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