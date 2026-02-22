import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';

import { getForemanObjects, type ForemanObjectDto } from '../../../api/foreman';

/** Розширення для опційних полів, які бекенд може повертати. */
type ForemanObjectRow = ForemanObjectDto & { openTasksCount?: number; overdueTasksCount?: number };

const statusLabels: Record<string, string> = {
  planned: 'Планується',
  in_progress: 'В роботі',
  paused: 'Пауза',
  done: 'Завершено',
};

const ForemanObjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [objects, setObjects] = useState<ForemanObjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getForemanObjects();
      setObjects(list);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Помилка завантаження';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!can('foreman:read')) {
    return <Navigate to="/403" replace />;
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Мої об'єкти
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {objects.length === 0 ? (
        <Typography color="text.secondary">
          У вас немає об'єктів, де ви призначені виконробом.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {objects.map((obj) => {
            const row: ForemanObjectRow = obj;
            return (
              <Card key={obj.id} variant="outlined">
                <CardActionArea onClick={() => navigate(`/foreman/objects/${obj.id}`)}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography variant="h6">{obj.name}</Typography>
                        {obj.address && (
                          <Typography variant="body2" color="text.secondary">
                            {obj.address}
                          </Typography>
                        )}
                      </Box>
                      <Stack direction="row" gap={1} alignItems="center">
                        <Chip
                          size="small"
                          label={statusLabels[obj.status] ?? obj.status}
                          variant="outlined"
                        />
                        {obj.openIssuesCount != null && obj.openIssuesCount > 0 && (
                          <Chip size="small" color="warning" label={`Проблеми: ${obj.openIssuesCount}`} />
                        )}
                        {row.openTasksCount != null && row.openTasksCount > 0 && (
                          <Chip size="small" color="primary" label={`Задач: ${row.openTasksCount}`} />
                        )}
                        {row.overdueTasksCount != null && row.overdueTasksCount > 0 && (
                          <Chip size="small" color="error" label={`Прострочено: ${row.overdueTasksCount}`} />
                        )}
                        {obj.todayWorkLogsCount != null && obj.todayWorkLogsCount > 0 && (
                          <Chip size="small" color="info" label={`Сьогодні робіт: ${obj.todayWorkLogsCount}`} />
                        )}
                      </Stack>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Оновлено: {new Date(obj.updatedAt).toLocaleString('uk-UA')}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default ForemanObjectsPage;
