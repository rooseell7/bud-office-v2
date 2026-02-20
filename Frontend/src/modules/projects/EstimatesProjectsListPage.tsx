import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
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
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { getEstimatesProjects, type EstimatesProjectItem, type EstimatesProjectsQuery } from '../../api/estimates';

function formatDate(str: string | null): string {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function EstimatesProjectsListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<EstimatesProjectItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [quoteStatus, setQuoteStatus] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const load = async () => {
    setLoading(true);
    setError(null);
    const query: EstimatesProjectsQuery = { page, limit };
    if (q.trim()) query.q = q.trim();
    if (quoteStatus.trim()) query.quoteStatus = quoteStatus.trim();
    try {
      const res = await getEstimatesProjects(query);
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
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    load();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/estimate/kp')} sx={{ mb: 1 }}>
        Назад
      </Button>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Кошториси — Об'єкти
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Пошук (назва, адреса)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ minWidth: 200 }}
        />
        <TextField
          size="small"
          placeholder="Статус КП"
          value={quoteStatus}
          onChange={(e) => setQuoteStatus(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ minWidth: 140 }}
        />
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
                <TableCell>КП</TableCell>
                <TableCell>Акти</TableCell>
                <TableCell>Накладні</TableCell>
                <TableCell>Остання активність</TableCell>
                <TableCell align="right" />
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
                    onClick={() => navigate(`/estimates/projects/${row.projectId}`)}
                  >
                    <TableCell>
                      <Typography fontWeight={600}>{row.name}</Typography>
                      {row.address && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {row.address}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{row.client?.name ?? '—'}</TableCell>
                    <TableCell>
                      {row.quote?.status ?? '—'}
                      {row.quote?.total != null && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {row.quote.total}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{row.acts?.count ?? 0}</TableCell>
                    <TableCell>
                      {row.invoices?.count ?? 0}
                      {row.invoices?.unpaidCount != null && row.invoices.unpaidCount > 0 && (
                        <Typography component="span" variant="caption" color="error.main">
                          {' '}(неопл. {row.invoices.unpaidCount})
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(row.lastActivityAt)}</TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      {row.quote?.lastQuoteId != null && (
                        <Button
                          size="small"
                          startIcon={<OpenInNewIcon />}
                          onClick={() => navigate(`/estimate/${row.quote!.lastQuoteId}`)}
                        >
                          КП
                        </Button>
                      )}
                    </TableCell>
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
