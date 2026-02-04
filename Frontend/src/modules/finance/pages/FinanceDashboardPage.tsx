import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useRealtime } from '../../../realtime/RealtimeContext';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

import {
  getBalances,
  getWallets,
  getTransactions,
  createTransactionIn,
  createTransactionOut,
  createTransactionTransfer,
  type BalanceDto,
  type TransactionDto,
} from '../../../api/finance';

import { TransactionInModal } from '../components/TransactionInModal';
import { TransactionOutModal } from '../components/TransactionOutModal';
import { TransactionTransferModal } from '../components/TransactionTransferModal';

const typeLabels: Record<string, string> = {
  in: 'Прихід',
  out: 'Витрата',
  transfer: 'Переказ',
};

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('uk-UA');
}

const FinanceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const realtime = useRealtime();
  const [balances, setBalances] = useState<BalanceDto[]>([]);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [totalUAH, setTotalUAH] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inModal, setInModal] = useState(false);
  const [outModal, setOutModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);

  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterWallet, setFilterWallet] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [wallets, setWallets] = useState<{ id: number; name: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bal, wList, tx] = await Promise.all([
        getBalances(),
        getWallets(),
        getTransactions({
          limit: 50,
          fromDate: filterFrom || undefined,
          toDate: filterTo || undefined,
          walletId: filterWallet ? parseInt(filterWallet, 10) : undefined,
          type: filterType || undefined,
        }),
      ]);
      setBalances(bal);
      setWallets(wList.map((w) => ({ id: w.id, name: w.name })));
      setTransactions(tx.items);
      const sum = bal.reduce((acc, b) => acc + (b.balanceUAH ?? 0), 0);
      setTotalUAH(sum);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [filterFrom, filterTo, filterWallet, filterType]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!realtime) return;
    realtime.joinModule('finance');
    return () => realtime.leaveModule('finance');
  }, [realtime]);

  useEffect(() => {
    if (!realtime) return;
    return realtime.subscribe((ev) => {
      if (ev.entity === 'transaction' || ev.entity === 'wallet') load();
    });
  }, [realtime, load]);

  useEffect(() => {
    if (!realtime) return;
    return realtime.refetchOnReconnect(load);
  }, [realtime, load]);

  if (!can('finance:read')) {
    return <Navigate to="/403" replace />;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Фінанси
        </Typography>
        {can('finance:write') && (
          <Button variant="outlined" size="small" startIcon={<AccountBalanceWalletIcon />} onClick={() => navigate('/finance/wallets')}>
            Гаманці
          </Button>
        )}
      </Stack>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
      )}

      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Баланси
      </Typography>
      {loading && balances.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      ) : balances.length === 0 ? (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography color="text.secondary">Немає гаманців. Додайте гаманець у розділі «Гаманці».</Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
          {balances.map((b) => (
            <Card key={b.walletId} variant="outlined" sx={{ minWidth: 160 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">{b.walletName}</Typography>
                <Typography variant="h6">{b.balance.toFixed(2)} {b.currency}</Typography>
                {b.currency !== 'UAH' && (
                  <Typography variant="caption" color="text.secondary">≈ {b.balanceUAH.toFixed(2)} UAH</Typography>
                )}
              </CardContent>
            </Card>
          ))}
          <Card variant="outlined" sx={{ minWidth: 160, borderColor: 'primary.main' }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Разом (UAH екв.)</Typography>
              <Typography variant="h6">{totalUAH.toFixed(2)} UAH</Typography>
            </CardContent>
          </Card>
        </Stack>
      )}

      {can('finance:write') && (
        <>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Швидкі дії
          </Typography>
          <Stack direction="row" gap={2} flexWrap="wrap" sx={{ mb: 3 }}>
            <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={() => setInModal(true)}>
              Отримали гроші
            </Button>
            <Button variant="contained" color="error" startIcon={<RemoveIcon />} onClick={() => setOutModal(true)}>
              Оплатили
            </Button>
            <Button variant="contained" startIcon={<SwapHorizIcon />} onClick={() => setTransferModal(true)}>
              Переказ між гаманцями
            </Button>
          </Stack>
        </>
      )}

      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Журнал операцій
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        <TextField
          type="date"
          size="small"
          label="З"
          value={filterFrom}
          onChange={(e) => setFilterFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 140 }}
        />
        <TextField
          type="date"
          size="small"
          label="По"
          value={filterTo}
          onChange={(e) => setFilterTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ width: 140 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Гаманець</InputLabel>
          <Select value={filterWallet} label="Гаманець" onChange={(e) => setFilterWallet(e.target.value)}>
            <MenuItem value="">Усі</MenuItem>
            {wallets.map((w) => (
              <MenuItem key={w.id} value={String(w.id)}>{w.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Тип</InputLabel>
          <Select value={filterType} label="Тип" onChange={(e) => setFilterType(e.target.value)}>
            <MenuItem value="">Усі</MenuItem>
            <MenuItem value="in">Прихід</MenuItem>
            <MenuItem value="out">Витрата</MenuItem>
            <MenuItem value="transfer">Переказ</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {loading && transactions.length === 0 ? (
        <CircularProgress size={24} />
      ) : transactions.length === 0 ? (
        <Typography color="text.secondary">Немає операцій за обраними фільтрами.</Typography>
      ) : (
        <Card variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Тип</TableCell>
                <TableCell>Сума</TableCell>
                <TableCell>UAH</TableCell>
                <TableCell>Контрагент</TableCell>
                <TableCell>Коментар</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={typeLabels[t.type] ?? t.type} variant="outlined" />
                  </TableCell>
                  <TableCell>{t.amount.toFixed(2)} {t.currency}</TableCell>
                  <TableCell>{t.amountUAH != null ? t.amountUAH.toFixed(2) : '—'}</TableCell>
                  <TableCell>{t.counterparty || '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>{t.comment ? `${t.comment.slice(0, 50)}${t.comment.length > 50 ? '…' : ''}` : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <TransactionInModal open={inModal} onClose={() => setInModal(false)} onSubmit={async (dto) => { await createTransactionIn(dto); load(); }} />
      <TransactionOutModal open={outModal} onClose={() => setOutModal(false)} onSubmit={async (dto) => { await createTransactionOut(dto); load(); }} />
      <TransactionTransferModal open={transferModal} onClose={() => setTransferModal(false)} onSubmit={async (dto) => { await createTransactionTransfer(dto); load(); }} />
    </Box>
  );
};

export default FinanceDashboardPage;
