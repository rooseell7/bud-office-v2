import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getExecutionHealth, getProjectsPerformance, type ExecutionHealthDto, type ProjectPerformanceDto } from '../../../api/analytics';

const AnalyticsExecutionPage: React.FC = () => {
  const navigate = useNavigate();
  const [health, setHealth] = useState<ExecutionHealthDto | null>(null);
  const [problemProjects, setProblemProjects] = useState<ProjectPerformanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, projects] = await Promise.all([
        getExecutionHealth({}),
        getProjectsPerformance({ sort: 'overdue' }),
      ]);
      setHealth(h);
      setProblemProjects(projects.filter((p) => p.overdueTasksCount > 0 || p.blockedTasksCount > 0).slice(0, 15));
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e && (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg || 'Помилка завантаження');
      setHealth(null);
      setProblemProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">Здоров'я реалізації</Typography>
        <Button size="small" onClick={() => navigate('/analytics')}>
          ← Огляд
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

      {!loading && health && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Card sx={{ minWidth: 140 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Активні об'єкти</Typography>
                <Typography variant="h6">{health.activeProjectsCount}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">На паузі</Typography>
                <Typography variant="h6">{health.pausedProjectsCount}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Прострочені задачі</Typography>
                <Typography variant="h6">{health.overdueTasksCount}</Typography>
              </CardContent>
            </Card>
            <Card sx={{ minWidth: 140 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Blocked задачі</Typography>
                <Typography variant="h6">{health.blockedTasksCount}</Typography>
              </CardContent>
            </Card>
          </Stack>

          {health.tasksByStatus.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Задачі по статусах</Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={health.tasksByStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Кількість" fill="#00bcd4" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Проблемні об'єкти (прострочені / blocked)</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Об'єкт</TableCell>
                    <TableCell align="right">Прострочені задачі</TableCell>
                    <TableCell align="right">Blocked</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {problemProjects.map((p) => (
                    <TableRow
                      key={p.projectId}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/projects/${p.projectId}`)}
                    >
                      <TableCell>{p.projectName}</TableCell>
                      <TableCell align="right">{p.overdueTasksCount}</TableCell>
                      <TableCell align="right">{p.blockedTasksCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {problemProjects.length === 0 && (
                <Typography color="text.secondary" sx={{ py: 2 }}>
                  Нема об'єктів з простроченими або blocked задачами.
                </Typography>
              )}
            </CardContent>
          </Card>

          {health.topBlockedReasons.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Топ причини блокування</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Причина</TableCell>
                      <TableCell align="right">Кількість</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {health.topBlockedReasons.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.reason}</TableCell>
                        <TableCell align="right">{r.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default AnalyticsExecutionPage;
