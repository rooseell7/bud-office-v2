import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { getWallets, type WalletDto } from '../../../api/finance';

type Form = {
  date: string;
  fromWalletId: number;
  toWalletId: number;
  amount: string;
  currency: string;
  fxRate: string;
  comment: string;
};

const defaultForm: Form = {
  date: new Date().toISOString().slice(0, 10),
  fromWalletId: 0,
  toWalletId: 0,
  amount: '',
  currency: 'UAH',
  fxRate: '',
  comment: '',
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: any) => Promise<void>;
};

export const TransactionTransferModal: React.FC<Props> = ({ open, onClose, onSubmit }) => {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletDto[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm((f) => ({ ...f, date: new Date().toISOString().slice(0, 10) }));
    setError(null);
    getWallets().then(setWallets).catch(() => setWallets([]));
  }, [open]);

  const isUAH = form.currency.toUpperCase() === 'UAH';
  const amountNum = parseFloat(form.amount) || 0;
  const fxNum = parseFloat(form.fxRate) || 0;
  const computedUAH = !isUAH && fxNum > 0 ? amountNum * fxNum : amountNum;

  const handleSubmit = async () => {
    if (!form.fromWalletId || !form.toWalletId || form.fromWalletId === form.toWalletId) {
      setError('Оберіть два різні гаманці');
      return;
    }
    if (amountNum <= 0) {
      setError('Вкажіть суму');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        date: form.date,
        fromWalletId: form.fromWalletId,
        toWalletId: form.toWalletId,
        amount: amountNum,
        currency: form.currency,
        fxRate: !isUAH && fxNum > 0 ? fxNum : undefined,
        amountUAH: !isUAH ? computedUAH : undefined,
        comment: form.comment.trim() || undefined,
      });
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка збереження');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Переказ між гаманцями</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField type="date" label="Дата" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth size="small" />
          <FormControl fullWidth size="small" required>
            <InputLabel>З гаманця</InputLabel>
            <Select
              value={form.fromWalletId || ''}
              label="З гаманця"
              onChange={(e) => setForm((f) => ({ ...f, fromWalletId: Number(e.target.value) }))}
            >
              {wallets.map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name} ({w.currency})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small" required>
            <InputLabel>В гаманець</InputLabel>
            <Select
              value={form.toWalletId || ''}
              label="В гаманець"
              onChange={(e) => setForm((f) => ({ ...f, toWalletId: Number(e.target.value) }))}
            >
              {wallets.map((w) => (
                <MenuItem key={w.id} value={w.id}>{w.name} ({w.currency})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack direction="row" gap={1}>
            <TextField type="number" label="Сума" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} fullWidth size="small" />
            <FormControl size="small" sx={{ minWidth: 90 }}>
              <InputLabel>Валюта</InputLabel>
              <Select value={form.currency} label="Валюта" onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                <MenuItem value="UAH">UAH</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          {!isUAH && (
            <Stack direction="row" gap={1}>
              <TextField type="number" label="Курс до UAH" value={form.fxRate} onChange={(e) => setForm((f) => ({ ...f, fxRate: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} size="small" />
              <Typography sx={{ alignSelf: 'center' }}>≈ {computedUAH.toFixed(2)} UAH</Typography>
            </Stack>
          )}
          <TextField label="Коментар" value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} fullWidth size="small" />
          {error && <Typography color="error" variant="body2">{error}</Typography>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Скасувати</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>{loading ? 'Збереження…' : 'Зберегти'}</Button>
      </DialogActions>
    </Dialog>
  );
};
