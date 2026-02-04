import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useRealtime } from '../../../realtime/RealtimeContext';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getExecutionProjects, type ExecutionProjectListItem } from '../../../api/execution';
import { getForemanCandidates } from '../../../api/objects';

const statusLabels: Record<string, string> = {
  planned: 'Планується',
  in_progress: 'В роботі',
  paused: 'Пауза',
  done: 'Завершено',
};

const ExecutionProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const realtime = useRealtime();
  const [list, setList] = useState<ExecutionProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterForemanId, setFilterForemanId] = useState<string>('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [foremanCandidates, setForemanCandidates] = useState<{ id: number; fullName: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { status?: string; foremanId?: number; overdue?: boolean } = {};
      if (filterStatus) params.status = filterStatus;
      if (filterForemanId) params.foremanId = parseInt(filterForemanId, 10);
      if (filterOverdue) params.overdue = true;
      const data = await getExecutionProjects(params);
      setList(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterForemanId, filterOverdue]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!realtime) return;
    realtime.joinModule('execution');
    return () => realtime.leaveModule('execution');
  }, [realtime]);

  useEffect(() => {
    if (!realtime) return;
    return realtime.subscribe((ev) => {
      if (ev.entity === 'task') load();
    });
  }, [realtime, load]);

  useEffect(() => {
    if (!realtime) return;
    return realtime.refetchOnReconnect(load);
  }, [realtime, load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const candidates = await getForemanCandidates();
        if (!cancelled) setForemanCandidates(candidates);
      } catch {
        if (!cancelled) setForemanCandidates([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Відділ реалізації — Об'єкти
      </Typography>

      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Статус об'єкта</InputLabel>
          <Select
            value={filterStatus}
            label="Статус об'єкта"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="">Усі</MenuItem>
            <MenuItem value="planned">Планується</MenuItem>
            <MenuItem value="in_progress">В роботі</MenuItem>
            <MenuItem value="done">Завершено</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Виконроб</InputLabel>
          <Select
            value={filterForemanId}
            label="Виконроб"
            onChange={(e) => setFilterForemanId(e.target.value)}
          >
            <MenuItem value="">Усі</MenuItem>
            {foremanCandidates.map((u) => (
              <MenuItem key={u.id} value={String(u.id)}>{u.fullName}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={filterOverdue ? '1' : '0'}
            onChange={(e) => setFilterOverdue(e.target.value === '1')}
          >
            <MenuItem value="0">Усі об'єкти</MenuItem>
            <MenuItem value="1">Тільки з прострочками</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : list.length === 0 ? (
        <Typography color="text.secondary">
          Немає об'єктів за обраними фільтрами.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {list.map((p) => (
            <Card key={p.id} variant="outlined">
              <CardActionArea onClick={() => navigate(`/execution/projects/${p.id}`)}>
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                    <Box>
                      <Typography variant="h6">{p.name}</Typography>
                    </Box>
                    <Stack direction="row" gap={1} alignItems="center">
                      <Chip size="small" label={statusLabels[p.status] ?? p.status} variant="outlined" />
                      {p.openTasksCount > 0 && (
                        <Chip size="small" color="primary" label={`Активних задач: ${p.openTasksCount}`} />
                      )}
                      {p.overdueTasksCount > 0 && (
                        <Chip size="small" color="error" label={`Прострочено: ${p.overdueTasksCount}`} />
                      )}
                    </Stack>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Оновлено: {new Date(p.updatedAt).toLocaleString('uk-UA')}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default ExecutionProjectsPage;
