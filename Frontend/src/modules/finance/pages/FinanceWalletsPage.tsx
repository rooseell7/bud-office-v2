import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';

import { getWallets, createWallet, updateWallet, type WalletDto } from '../../../api/finance';

const FinanceWalletsPage: React.FC = () => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [list, setList] = useState<WalletDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<WalletDto | null>(null);
  const [form, setForm] = useState({ name: '', type: 'fop', currency: 'UAH', isActive: true, details: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWallets(false);
      setList(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', type: 'fop', currency: 'UAH', isActive: true, details: '' });
    setModalOpen(true);
  };

  const openEdit = (w: WalletDto) => {
    setEditing(w);
    setForm({
      name: w.name,
      type: w.type,
      currency: w.currency,
      isActive: w.isActive,
      details: w.details ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateWallet(editing.id, { ...form, details: form.details || null });
      } else {
        await createWallet({ ...form, details: form.details || null });
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка збереження');
    } finally {
      setSaving(false);
    }
  };

  if (!can('finance:read')) {
    return <Navigate to="/403" replace />;
  }

  const canManage = can('finance:write') || can('finance:admin');

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/finance')} size="small">
          Назад
        </Button>
        <Typography variant="h5" fontWeight={700}>
          Гаманці
        </Typography>
        {canManage && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ ml: 'auto' }}>
            Додати ФОП / гаманець
          </Button>
        )}
      </Stack>

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : list.length === 0 ? (
        <Typography color="text.secondary">Немає гаманців. Додайте перший.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {list.map((w) => (
            <Card key={w.id} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                <Box>
                  <Typography fontWeight={600}>{w.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {w.type} · {w.currency}
                    {w.balance != null && ` · Баланс: ${w.balance.toFixed(2)} ${w.currency}`}
                    {w.balanceUAH != null && w.currency !== 'UAH' && ` (≈ ${w.balanceUAH.toFixed(2)} UAH)`}
                  </Typography>
                </Box>
                <Stack direction="row" alignItems="center" gap={1}>
                  {!w.isActive && <Chip size="small" label="Неактивний" color="default" />}
                  {canManage && (
                    <Button size="small" onClick={() => openEdit(w)}>Редагувати</Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Редагувати гаманець' : 'Додати гаманець'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField label="Назва" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} fullWidth size="small" required />
            <FormControl fullWidth size="small">
              <InputLabel>Тип</InputLabel>
              <Select value={form.type} label="Тип" onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <MenuItem value="cash">Каса</MenuItem>
                <MenuItem value="fop">ФОП</MenuItem>
                <MenuItem value="bank">Банк</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Валюта</InputLabel>
              <Select value={form.currency} label="Валюта" onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                <MenuItem value="UAH">UAH</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" alignItems="center">
              <Typography>Активний</Typography>
              <Switch checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            </Stack>
            <TextField label="Реквізити / примітки" value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} multiline rows={2} fullWidth size="small" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'Збереження…' : 'Зберегти'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinanceWalletsPage;
