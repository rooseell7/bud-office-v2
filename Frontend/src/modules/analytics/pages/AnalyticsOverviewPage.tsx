import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TextField,
  Typography,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { getOwnerOverview, type OwnerOverviewDto } from '../../../api/analytics';

const PRESETS = [
  { label: 'Сьогодні', from: () => today(), to: () => today() },
  { label: '7 днів', from: () => daysAgo(7), to: () => today() },
  { label: '30 днів', from: () => daysAgo(30), to: () => today() },
  { label: 'Цей місяць', from: () => monthStart(), to: () => today() },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function monthStart(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

function formatUAH(n: number): string {
  return new Intl.NumberFormat('uk-UA', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' ₴';
}

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#f44336', '#00bcd4', '#795548', '#607d8b'];

const DataQualityHelp: Record<string, string> = {
  transactionsWithoutProjectPct: 'Прив’яжіть транзакції до об’єкта в журналі фінансів.',
  transactionsWithoutCategoryPct: 'Вкажіть категорію для витрат у журналі фінансів.',
  tasksWithoutDueDatePct: 'Вкажіть термін виконання для задач у відділі реалізації.',
  projectsWithoutForemanPct: "Призначте виконроба на об'єкт у картці об’єкта.",
  stagesWithoutDatesPct: 'Заповніть дати етапів (якщо використовуються).',
};

const AnalyticsOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [data, setData] = useState<OwnerOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOwnerOverview({ from, to, groupBy });
      setData(res);
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Помилка завантаження');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, groupBy]);

  useEffect(() => {
    load();
  }, [load]);

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setFrom(preset.from());
    setTo(preset.to());
  };

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Аналітика для власників
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        {PRESETS.map((preset) => (
          <Button key={preset.label} variant="outlined" size="small" onClick={() => applyPreset(preset)}>
            {preset.label}
          </Button>
        ))}
        <TextField size="small" label="З" type="date" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
        <TextField size="small" label="По" type="date" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Групування</InputLabel>
          <Select label="Групування" value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}>
            <MenuItem value="day">День</MenuItem>
            <MenuItem value="week">Тиждень</MenuItem>
            <MenuItem value="month">Місяць</MenuItem>
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

      {!data && !loading && (
        <Typography color="text.secondary">Нема даних за обраний період.</Typography>
      )}

      {data && (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Card sx={{ minWidth: 140 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Виручка (IN)</Typography>
                <Typography variant="h6">{formatUAH(data.kpi.incomeUAH)}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Витрати (OUT)</Typography>
                <Typography variant="h6">{formatUAH(data.kpi.expenseUAH)}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Результат (NET)</Typography>
                <Typography variant="h6">{formatUAH(data.kpi.netUAH)}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Гроші на руках</Typography>
                <Typography variant="h6">{formatUAH(data.kpi.cashOnHandUAH)}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Активні об'єкти</Typography>
                <Typography variant="h6">{data.kpi.activeProjectsCount}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Прострочені задачі</Typography>
                <Typography variant="h6">{data.kpi.overdueTasksCount}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Blocked задачі</Typography>
                <Typography variant="h6">{data.kpi.blockedTasksCount}</Typography>
              </CardContent>
            </Card>
          </Stack>

          <Stack spacing={2}>
            {data.cashflowSeries.length > 0 && (
              <Box sx={{ width: '100%', maxWidth: 900 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Cashflow (IN vs OUT)</Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={data.cashflowSeries.map((r) => ({ ...r, date: r.dateBucket?.slice(0, 10) }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number | undefined) => `${((v ?? 0) / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number | undefined) => formatUAH(v ?? 0)} labelFormatter={(l) => l} />
                        <Legend />
                        <Line type="monotone" dataKey="incomeUAH" name="Прихід" stroke="#4caf50" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="expenseUAH" name="Витрати" stroke="#f44336" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Box>
            )}

            {data.expenseByCategory.length > 0 && (
              <Box sx={{ width: '100%', maxWidth: 400 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Витрати по категоріях</Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={data.expenseByCategory}
                          dataKey="amountUAH"
                          nameKey="categoryName"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(props) => { const p = props as unknown as { categoryName?: string; amountUAH?: number }; return `${p.categoryName ?? ''}: ${formatUAH(p.amountUAH ?? 0)}`; }}
                        >
                          {data.expenseByCategory.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number | undefined) => formatUAH(v ?? 0)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Box>
            )}

            {data.revenueByProject.length > 0 && (
              <Box sx={{ width: '100%' }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Топ об'єктів по виручці (клік — деталі)</Typography>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={data.revenueByProject} layout="vertical" margin={{ left: 120 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(v: number | undefined) => `${((v ?? 0) / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="projectName" width={110} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number | undefined) => formatUAH(v ?? 0)} />
                        <Bar dataKey="incomeUAH" name="Виручка" fill="#2196f3" onClick={(data) => { const p = data as unknown as { projectId?: number }; if (p?.projectId != null) navigate(`/analytics/projects?projectId=${p.projectId}`); }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Box>
            )}

            {data.projectStatusDistribution.length > 0 && (
              <Box sx={{ width: '100%', maxWidth: 480 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Статуси об'єктів</Typography>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.projectStatusDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" name="Кількість" fill="#9c27b0" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Box>
            )}

            {data.taskStatusDistribution.length > 0 && (
              <Box sx={{ width: '100%', maxWidth: 480 }}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>Статуси задач</Typography>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.taskStatusDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" name="Кількість" fill="#00bcd4" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Box>
            )}

            <Box sx={{ width: '100%' }}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>Якість даних</Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 1 }}>
                    {[
                      { key: 'transactionsWithoutProjectPct', label: 'Транзакції без об\'єкта, %', value: data.dataQuality.transactionsWithoutProjectPct },
                      { key: 'transactionsWithoutCategoryPct', label: 'Витрати без категорії, %', value: data.dataQuality.transactionsWithoutCategoryPct },
                      { key: 'tasksWithoutDueDatePct', label: 'Задачі без терміну, %', value: data.dataQuality.tasksWithoutDueDatePct },
                      { key: 'projectsWithoutForemanPct', label: "Об'єкти без виконроба, %", value: data.dataQuality.projectsWithoutForemanPct },
                      { key: 'stagesWithoutDatesPct', label: 'Етапи без дат, %', value: data.dataQuality.stagesWithoutDatesPct },
                    ].map(({ key, label, value }) => (
                      <Box key={key} sx={{ minWidth: 180 }}>
                        <Typography variant="body2" color="text.secondary">{label}</Typography>
                        <Typography variant="body1">{value}%</Typography>
                        {value > 0 && (
                          <Typography variant="caption" color="text.secondary">{DataQualityHelp[key]}</Typography>
                        )}
                      </Box>
                    ))}
                  </Stack>
                  <Button size="small" variant="outlined" onClick={() => navigate('/analytics/finance?missingCategory=true')}>
                    Показати проблемні записи (фінанси)
                  </Button>
                </CardContent>
              </Card>
            </Box>
          </Stack>
        </>
      )}
    </Box>
  );
};

export default AnalyticsOverviewPage;
