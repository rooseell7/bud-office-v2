import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { getEstimatesProjects, type EstimatesProjectItem, type EstimatesProjectsQuery } from '../../api/estimates';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
  const [hasUnpaid, setHasUnpaid] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const load = async () => {
    setLoading(true);
    setError(null);
    const query: EstimatesProjectsQuery = { page, limit };
    if (q.trim()) query.q = q.trim();
    if (quoteStatus.trim()) query.quoteStatus = quoteStatus.trim();
    if (hasUnpaid) query.hasUnpaidInvoices = true;
    try {
      const res = await getEstimatesProjects(query);
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, hasUnpaid]);

  const handleSearch = () => {
    setPage(1);
    load();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/estimate')} sx={{ mb: 1 }}>
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
          sx={{ minWidth: 120 }}
        />
        <Button variant="outlined" size="small" onClick={() => setHasUnpaid(!hasUnpaid)} color={hasUnpaid ? 'primary' : 'inherit'}>
          Є неоплачені накладні
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
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Об'єкт</TableCell>
                <TableCell>Клієнт</TableCell>
                <TableCell>КП (статус / сума)</TableCell>
                <TableCell>Акти (кількість / остання дата)</TableCell>
                <TableCell>Накладні (кількість / неопл. / остання дата)</TableCell>
                <TableCell>Остання активність</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
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
                      {row.quote.lastQuoteId ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip
                            size="small"
                            label={row.quote.status ?? '—'}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/estimate/${row.quote.lastQuoteId}`);
                            }}
                          />
                          {row.quote.total != null && row.quote.total !== '' && (
                            <Typography variant="caption" color="text.secondary">
                              {Number(row.quote.total).toLocaleString('uk-UA')}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {row.acts.count > 0 ? (
                        <>
                          {row.acts.count}
                          {row.acts.lastActAt && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {formatDate(row.acts.lastActAt)}
                            </Typography>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      {row.invoices.count > 0 ? (
                        <>
                          {row.invoices.count}
                          {row.invoices.unpaidCount > 0 && (
                            <Chip size="small" color="warning" label={row.invoices.unpaidCount} sx={{ ml: 0.5 }} />
                          )}
                          {row.invoices.lastInvoiceAt && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {formatDate(row.invoices.lastInvoiceAt)}
                            </Typography>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{formatDate(row.lastActivityAt)}</TableCell>
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
