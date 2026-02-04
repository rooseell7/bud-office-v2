import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Link, List, ListItem, ListItemText, Typography } from '@mui/material';
import { getActivity, type ActivityLogItem } from '../../api/activity';

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

/**
 * Головна сторінка після логіну. Блок "Остання активність".
 */
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [activity, setActivity] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getActivity({ limit: 10 });
      setActivity(Array.isArray(data) ? data : []);
    } catch {
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 700,
          color: '#0b2923',
          mb: 3,
        }}
      >
        BUD Office
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Остання активність
          </Typography>
          {loading ? (
            <Typography color="text.secondary">Завантаження…</Typography>
          ) : activity.length === 0 ? (
            <Typography color="text.secondary">Поки немає подій</Typography>
          ) : (
            <List dense disablePadding>
              {activity.map((a) => (
                <ListItem key={a.id} disablePadding sx={{ py: 0.5 }}>
                  <ListItemText
                    primary={
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => {
                          if (a.projectId) navigate(`/execution/projects/${a.projectId}`);
                        }}
                        sx={{ cursor: a.projectId ? 'pointer' : 'default', textAlign: 'left' }}
                      >
                        {a.summary ?? `${a.entity}:${a.action}`}
                      </Link>
                    }
                    secondary={formatTime(a.ts)}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      <Typography variant="body2" color="text.secondary">
        Головна сторінка
      </Typography>
    </Box>
  );
};

export default HomePage;
