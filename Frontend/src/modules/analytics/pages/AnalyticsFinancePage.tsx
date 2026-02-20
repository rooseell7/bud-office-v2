import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
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
import { getFinanceBreakdown, type FinanceBreakdownDto } from '../../../api/analytics';
import { getTransactions, getWallets, type TransactionDto } from '../../../api/finance';

function formatUAH(n: number): string {
  return new Intl.NumberFormat('uk-UA', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' ₴';
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const typeLabels: Record<string, string> = {
  in: 'Прихід',
  out: 'Витрата',
  transfer: 'Переказ',
};

const AnalyticsFinancePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const missingCategory = searchParams.get('missingCategory') === 'true';

  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [walletId, setWalletId] = useState<string>('');
  const [wallets, setWallets] = useState<{ id: number; name: string }[]>([]);
  const [data, setData] = useState<FinanceBreakdownDto | null>(null);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { from?: string; to?: string; walletId?: number } = { from, to };
      if (walletId) params.walletId = parseInt(walletId, 10);
      const [wList, breakdown, txRes] = await Promise.all([
        getWallets(),
        getFinanceBreakdown(params),
        getTransactions({ fromDate: from, toDate: to, walletId: walletId ? parseInt(walletId, 10) : undefined, limit: 50 }),
      ]);
      setWallets(wList.map((w) => ({ id: w.id, name: w.name })));
      setData(breakdown);
      setTransactions(txRes.items ?? []);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Помилка завантаження');
      setData(null);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, walletId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Фінанси: деталізація</Typography>
        <Button size="small" onClick={() => navigate('/analytics')}>
          ← Огляд
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField size="small" label="З" type="date" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
        <TextField size="small" label="По" type="date" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Гаманець</InputLabel>
          <Select label="Гаманець" value={walletId} onChange={(e) => setWalletId(e.target.value)}>
            <MenuItem value="">Усі</MenuItem>
            {wallets.map((w) => (
              <MenuItem key={w.id} value={String(w.id)}>
                {w.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={load}>
          Застосувати
        </Button>
      </Stack>

      {missingCategory && (
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          Фільтр: показуємо дані; проблемні записи (без категорії) переглядайте у журналі фінансів.
        </Typography>
      )}

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && data && (
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Баланси по гаманцях</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Гаманець</TableCell>
                    <TableCell align="right">Баланс (UAH)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.balances.map((b) => (
                    <TableRow key={b.walletId}>
                      <TableCell>{b.walletName}</TableCell>
                      <TableCell align="right">{formatUAH(b.balanceUAH)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Рух по гаманцях (IN / OUT / NET)</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Гаманець</TableCell>
                    <TableCell align="right">Прихід</TableCell>
                    <TableCell align="right">Витрата</TableCell>
                    <TableCell align="right">Результат</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.byWallet.map((w) => (
                    <TableRow key={w.walletId}>
                      <TableCell>{w.walletName}</TableCell>
                      <TableCell align="right">{formatUAH(w.inUAH)}</TableCell>
                      <TableCell align="right">{formatUAH(w.outUAH)}</TableCell>
                      <TableCell align="right">{formatUAH(w.netUAH)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Витрати по категоріях (OUT)</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Категорія</TableCell>
                    <TableCell align="right">Сума</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.byCategory.map((c) => (
                    <TableRow key={c.categoryId}>
                      <TableCell>{c.categoryName}</TableCell>
                      <TableCell align="right">{formatUAH(c.amountUAH)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {data.topCounterparties.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Топ контрагенти</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Контрагент</TableCell>
                      <TableCell align="right">Сума</TableCell>
                      <TableCell align="right">Кількість</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.topCounterparties.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell>{c.counterparty}</TableCell>
                        <TableCell align="right">{formatUAH(c.amountUAH)}</TableCell>
                        <TableCell align="right">{c.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Останні транзакції (журнал)</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Дата</TableCell>
                    <TableCell>Тип</TableCell>
                    <TableCell align="right">Сума</TableCell>
                    <TableCell>Коментар</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.slice(0, 20).map((t) => (
                    <TableRow
                      key={t.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate('/finance')}
                    >
                      <TableCell>{new Date(t.date).toLocaleDateString('uk-UA')}</TableCell>
                      <TableCell>{typeLabels[t.type] ?? t.type}</TableCell>
                      <TableCell align="right">{formatUAH(t.amountUAH ?? t.amount)}</TableCell>
                      <TableCell>{t.comment ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/finance')}>
                Відкрити журнал фінансів
              </Button>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
};

export default AnalyticsFinancePage;
