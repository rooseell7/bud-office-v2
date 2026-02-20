import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
} from '@mui/material';
import { getRealizationProjects, type RealizationProjectListItem } from '../../../api/realization';
import { useAuth } from '../../auth/AuthContext';

export default function RealizationProjectsPage() {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [list, setList] = useState<RealizationProjectListItem[]>([]);
  const [total, setTotal] = useState(0);
  void total;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRealizationProjects({ limit: 100 });
      setList(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can('realization:read')) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">Немає доступу</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Об'єкти (Реалізація)</Typography>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Назва</TableCell>
                <TableCell>Адреса</TableCell>
                <TableCell>Клієнт</TableCell>
                <TableCell align="right">Відкриті проблеми</TableCell>
                <TableCell align="right">Заявки</TableCell>
                <TableCell>Останній запис</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">
                      Немає об'єктів
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                list.map((row) => (
                  <TableRow
                    key={row.projectId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/realization/projects/${row.projectId}`)}
                  >
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.address ?? '—'}</TableCell>
                    <TableCell>{row.clientName ?? '—'}</TableCell>
                    <TableCell align="right">{row.openIssues ?? 0}</TableCell>
                    <TableCell align="right">{row.pendingRequests ?? 0}</TableCell>
                    <TableCell>{row.lastWorkLogDate ?? '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
