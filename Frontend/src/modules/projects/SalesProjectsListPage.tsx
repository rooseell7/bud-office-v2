import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import { useAuth } from '../auth/AuthContext';
import { getSalesProjects, getSalesOwners, type SalesProjectItem, type SalesProjectsQuery } from '../../api/sales';

const SALES_STAGE_LABELS: Record<string, string> = {
  lead_new: 'Новий',
  contact_made: 'Контакт',
  meeting_scheduled: 'Зустріч запланована',
  meeting_done: 'Зустріч проведена',
  kp_preparing: 'КП готується',
  kp_sent: 'КП відправлено',
  kp_negotiation: 'Узгодження',
  deal_signed: 'Угода підписана',
  handoff_to_exec: 'Передано в реалізацію',
  paused: 'Пауза',
  lost: 'Втрачено',
};

const NEXT_ACTION_TYPE_LABELS: Record<string, string> = {
  call: 'Дзвінок',
  meeting: 'Зустріч',
  send_kp: 'Відправити КП',
  follow_up: 'Дозвон',
  other: 'Інше',
};

function formatDate(str: string | null): string {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

function isOverdue(dueAt: string): boolean {
  if (!dueAt) return false;
  return dueAt < new Date().toISOString().slice(0, 10);
}

export default function SalesProjectsListPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const canCreateProject = can('sales:write');
  const [items, setItems] = useState<SalesProjectItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [salesStage, setSalesStage] = useState('');
  const [ownerId, setOwnerId] = useState<number | ''>('');
  const [nextActionBucket, setNextActionBucket] = useState<SalesProjectsQuery['nextActionBucket']>('any');
  const [page, setPage] = useState(1);
  const [owners, setOwners] = useState<{ id: number; name: string }[]>([]);
  const limit = 20;

  useEffect(() => {
    getSalesOwners().then(setOwners).catch(() => setOwners([]));
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    const query: SalesProjectsQuery = { page, limit };
    if (q.trim()) query.q = q.trim();
    if (salesStage.trim()) query.salesStage = salesStage.trim();
    if (ownerId !== '' && Number.isFinite(ownerId)) query.ownerId = Number(ownerId);
    if (nextActionBucket && nextActionBucket !== 'any') query.nextActionBucket = nextActionBucket;
    try {
      const res = await getSalesProjects(query);
      setItems(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = ex?.response?.data?.message || ex?.message || 'Помилка завантаження';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, nextActionBucket, ownerId]);

  const handleSearch = () => {
    setPage(1);
    load();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/sales')} sx={{ mb: 1 }}>
        Назад
      </Button>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Продажі — Об'єкти</Typography>
        {canCreateProject && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => navigate('/sales/projects/new')}
          >
            Додати об'єкт
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Пошук (назва, адреса)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Стадія продажу</InputLabel>
          <Select
            label="Стадія продажу"
            value={salesStage}
            onChange={(e) => setSalesStage(e.target.value)}
          >
            <MenuItem value="">Всі</MenuItem>
            {Object.entries(SALES_STAGE_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Власник</InputLabel>
          <Select
            label="Власник"
            value={ownerId === '' ? '' : ownerId}
            onChange={(e) => setOwnerId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <MenuItem value="">Всі</MenuItem>
            {owners.map((u) => (
              <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant={nextActionBucket === 'today' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setNextActionBucket(nextActionBucket === 'today' ? 'any' : 'today')}
        >
          Сьогодні
        </Button>
        <Button
          variant={nextActionBucket === 'this_week' ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setNextActionBucket(nextActionBucket === 'this_week' ? 'any' : 'this_week')}
        >
          Цього тижня
        </Button>
        <Button
          variant={nextActionBucket === 'overdue' ? 'contained' : 'outlined'}
          size="small"
          color={nextActionBucket === 'overdue' ? 'warning' : 'inherit'}
          onClick={() => setNextActionBucket(nextActionBucket === 'overdue' ? 'any' : 'overdue')}
        >
          Прострочено
        </Button>
        <Button variant="contained" size="small" onClick={handleSearch}>
          Шукати
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <Typography>Завантаження…</Typography>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Об'єкт</TableCell>
                <TableCell>Клієнт</TableCell>
                <TableCell>Етап</TableCell>
                <TableCell>Угода</TableCell>
                <TableCell>Next action</TableCell>
                <TableCell>Власник</TableCell>
                <TableCell>Останній контакт</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Немає об'єктів за критеріями
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow
                    key={row.projectId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/sales/projects/${row.projectId}`)}
                  >
                    <TableCell>
                      <Typography fontWeight={600}>{row.name}</Typography>
                      {row.address && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {row.address}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.client?.name ?? '—'}
                      {row.client?.phone && (
                        <Typography variant="caption" display="block" color="text.secondary">{row.client.phone}</Typography>
                      )}
                    </TableCell>
                    <TableCell>{SALES_STAGE_LABELS[row.salesStage] ?? row.salesStage}</TableCell>
                    <TableCell>{row.deal ? `${row.deal.amount} (${row.deal.status})` : '—'}</TableCell>
                    <TableCell>
                      {row.nextAction ? (
                        <Typography sx={{ color: isOverdue(row.nextAction.dueAt) ? 'error.main' : undefined }}>
                          {NEXT_ACTION_TYPE_LABELS[row.nextAction.type] ?? row.nextAction.type} {formatDate(row.nextAction.dueAt)}
                          {isOverdue(row.nextAction.dueAt) && ' (прострочено)'}
                        </Typography>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{row.owner?.name ?? '—'}</TableCell>
                    <TableCell>{formatDate(row.lastContactAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {total > limit && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Всього: {total}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Назад
            </Button>
            <Button size="small" disabled={page * limit >= total} onClick={() => setPage((p) => p + 1)}>
              Далі
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
