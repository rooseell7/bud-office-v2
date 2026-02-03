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
import { getWallets, getCategories, type WalletDto, type CategoryDto } from '../../../api/finance';

type Form = {
  date: string;
  walletId: number;
  amount: string;
  currency: string;
  fxRate: string;
  amountUAH: string;
  projectId: string;
  categoryId: number;
  counterparty: string;
  comment: string;
};

const defaultForm: Form = {
  date: new Date().toISOString().slice(0, 10),
  walletId: 0,
  amount: '',
  currency: 'UAH',
  fxRate: '',
  amountUAH: '',
  projectId: '',
  categoryId: 0,
  counterparty: '',
  comment: '',
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: any) => Promise<void>;
  projectId?: number | null;
};

export const TransactionOutModal: React.FC<Props> = ({ open, onClose, onSubmit, projectId }) => {
  const [form, setForm] = useState<Form>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<WalletDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  useEffect(() => {
    if (!open) return;
    setForm((f) => ({ ...f, date: new Date().toISOString().slice(0, 10), projectId: projectId ? String(projectId) : '' }));
    setError(null);
    (async () => {
      try {
        const [w, c] = await Promise.all([getWallets(), getCategories('out')]);
        setWallets(w);
        setCategories(c);
        if (w.length > 0 && form.walletId === 0) setForm((f) => ({ ...f, walletId: w[0].id, currency: w[0].currency }));
        if (c.length > 0 && form.categoryId === 0) setForm((f) => ({ ...f, categoryId: c[0].id }));
      } catch {
        setWallets([]);
        setCategories([]);
      }
    })();
  }, [open, projectId]);

  const isUAH = form.currency.toUpperCase() === 'UAH';
  const amountNum = parseFloat(form.amount) || 0;
  const fxNum = parseFloat(form.fxRate) || 0;
  const computedUAH = !isUAH && fxNum > 0 ? amountNum * fxNum : amountNum;

  const handleSubmit = async () => {
    if (!form.walletId || amountNum <= 0) {
      setError('Оберіть гаманець та вкажіть суму');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        date: form.date,
        walletId: form.walletId,
        amount: amountNum,
        currency: form.currency,
        fxRate: !isUAH && fxNum > 0 ? fxNum : undefined,
        amountUAH: !isUAH ? computedUAH : undefined,
        projectId: projectId ?? (form.projectId ? parseInt(form.projectId, 10) : null),
        categoryId: form.categoryId || undefined,
        counterparty: form.counterparty.trim() || undefined,
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
      <DialogTitle>Оплатили</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField type="date" label="Дата" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} InputLabelProps={{ shrink: true }} fullWidth size="small" />
          <FormControl fullWidth size="small" required>
            <InputLabel>Гаманець</InputLabel>
            <Select
              value={form.walletId || ''}
              label="Гаманець"
              onChange={(e) => {
                const id = Number(e.target.value);
                const w = wallets.find((x) => x.id === id);
                setForm((f) => ({ ...f, walletId: id, currency: w?.currency ?? 'UAH' }));
              }}
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
          {projectId == null && (
            <TextField type="number" label="Об'єкт (ID)" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))} size="small" />
          )}
          <FormControl fullWidth size="small">
            <InputLabel>Категорія</InputLabel>
            <Select value={form.categoryId || ''} label="Категорія" onChange={(e) => setForm((f) => ({ ...f, categoryId: Number(e.target.value) }))}>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Контрагент (постачальник)" value={form.counterparty} onChange={(e) => setForm((f) => ({ ...f, counterparty: e.target.value }))} fullWidth size="small" />
          <TextField label="Коментар" value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} multiline rows={2} fullWidth size="small" />
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
