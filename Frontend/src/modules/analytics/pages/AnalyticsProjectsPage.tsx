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
import { getProjectsPerformance, type ProjectPerformanceDto } from '../../../api/analytics';

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

const AnalyticsProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');

  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [status, setStatus] = useState<string>('');
  const [sort, setSort] = useState<string>('netUAH');
  const [data, setData] = useState<ProjectPerformanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProjectsPerformance({ from, to, status, sort });
      setData(res);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Помилка завантаження');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, status, sort]);

  useEffect(() => {
    load();
  }, [load]);

  let rows = data;
  if (projectIdFromUrl) {
    const id = parseInt(projectIdFromUrl, 10);
    if (!Number.isNaN(id)) rows = data.filter((r) => r.projectId === id);
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Ефективність об'єктів</Typography>
        <Button size="small" onClick={() => navigate('/analytics')}>
          ← Огляд
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField size="small" label="З" type="date" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
        <TextField size="small" label="По" type="date" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Статус</InputLabel>
          <Select label="Статус" value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="">Усі</MenuItem>
            <MenuItem value="in_progress">В роботі</MenuItem>
            <MenuItem value="paused">На паузі</MenuItem>
            <MenuItem value="done">Завершено</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Сортування</InputLabel>
          <Select label="Сортування" value={sort} onChange={(e) => setSort(e.target.value)}>
            <MenuItem value="netUAH">Результат (NET) ↓</MenuItem>
            <MenuItem value="overdue">Прострочені ↓</MenuItem>
            <MenuItem value="expense">Витрати ↓</MenuItem>
            <MenuItem value="income">Виручка ↓</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" onClick={load}>
          Застосувати
        </Button>
      </Stack>

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

      {!loading && (
        <Card>
          <CardContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Об'єкт</TableCell>
                  <TableCell>Статус</TableCell>
                  <TableCell>Виконроб</TableCell>
                  <TableCell align="right">Виручка</TableCell>
                  <TableCell align="right">Витрати</TableCell>
                  <TableCell align="right">Результат</TableCell>
                  <TableCell align="right">Прострочені</TableCell>
                  <TableCell align="right">Blocked</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.projectId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/projects/${r.projectId}`)}
                  >
                    <TableCell>{r.projectName}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell>{r.foremanName ?? '—'}</TableCell>
                    <TableCell align="right">{formatUAH(r.incomeUAH)}</TableCell>
                    <TableCell align="right">{formatUAH(r.expenseUAH)}</TableCell>
                    <TableCell align="right">{formatUAH(r.netUAH)}</TableCell>
                    <TableCell align="right">{r.overdueTasksCount}</TableCell>
                    <TableCell align="right">{r.blockedTasksCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                Нема даних за обраний період.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AnalyticsProjectsPage;
