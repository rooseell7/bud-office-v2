/**
 * STEP 6: Global Activity Feed page.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { getActivityFeed, type ActivityFeedItem } from '../../api/activity';

const ACTION_LABELS: Record<string, string> = {
  'invoice.create': 'Створено накладну',
  'invoice.update': 'Оновлено накладну',
  'invoice.status.change': 'Змінено статус накладної',
  'act.create': 'Створено акт',
  'act.update': 'Оновлено акт',
  'order.create': 'Створено замовлення',
  'order.update': 'Оновлено замовлення',
  'client.create': 'Створено клієнта',
  'client.update': 'Оновлено клієнта',
  'project.create': 'Створено обʼєкт',
  'project.update': 'Оновлено обʼєкт',
};

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

function actionToLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function entityToRoute(item: ActivityFeedItem): string | null {
  const { type, id } = item.entity;
  switch (type) {
    case 'invoice':
      return `/supply/invoices/${id}`;
    case 'act':
      return `/estimate/acts/${id}`;
    case 'order':
    case 'supply_order':
      return `/supply/orders/${id}`;
    case 'project':
      return `/projects/${id}`;
    case 'client':
      return `/sales/clients`;
    default:
      return null;
  }
}

const ActivityPage: React.FC = () => {
  const navigate = useNavigate();
  const [actionPrefix, setActionPrefix] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (append = false, nextCursorParam?: string | null) => {
      setLoading(true);
      try {
        const result = await getActivityFeed({
          scope: 'global',
          actionPrefix: actionPrefix || null,
          from: from || null,
          to: to || null,
          cursor: append ? nextCursorParam ?? cursor : null,
          limit: 50,
        });
        if (append) {
          setItems((prev) => [...prev, ...result.items]);
        } else {
          setItems(result.items);
        }
        setNextCursor(result.nextCursor);
      } catch {
        if (!append) setItems([]);
        setNextCursor(null);
      } finally {
        setLoading(false);
      }
    },
    [actionPrefix, from, to, cursor],
  );

  useEffect(() => {
    setCursor(null);
    load(false);
  }, [actionPrefix, from, to]);

  const loadMore = useCallback(() => {
    if (nextCursor && !loading) {
      load(true, nextCursor);
    }
  }, [nextCursor, loading, load]);

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Активність
      </Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Тип дії</InputLabel>
              <Select
                value={actionPrefix}
                label="Тип дії"
                onChange={(e) => setActionPrefix(e.target.value)}
              >
                <MenuItem value="">Усі</MenuItem>
                <MenuItem value="invoice">Накладні</MenuItem>
                <MenuItem value="act">Акти</MenuItem>
                <MenuItem value="order">Замовлення</MenuItem>
                <MenuItem value="client">Клієнти</MenuItem>
                <MenuItem value="project">Обʼєкти</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Від"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 140 }}
            />
            <TextField
              size="small"
              label="До"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 140 }}
            />
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          {loading && items.length === 0 ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={32} />
            </Box>
          ) : items.length === 0 ? (
            <Typography color="text.secondary">Поки немає подій</Typography>
          ) : (
            <List dense disablePadding>
              {items.map((a) => {
                const route = entityToRoute(a);
                const entityLabel = a.entity.title ?? `${a.entity.type} #${a.entity.id}`;
                return (
                  <ListItem
                    key={a.id}
                    disablePadding
                    sx={{
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <ListItemAvatar>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        {a.actor.initials}
                      </Box>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2">
                          <strong>{a.actor.name}</strong>
                          {' — '}
                          {actionToLabel(a.action)}
                          {route ? (
                            <Link
                              component="button"
                              variant="body2"
                              onClick={() => navigate(route)}
                              sx={{ ml: 0.5, cursor: 'pointer' }}
                            >
                              {entityLabel}
                            </Link>
                          ) : (
                            <span> {entityLabel}</span>
                          )}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(a.createdAt)}
                          {a.projectId && ` · Проєкт #${a.projectId}`}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
          {nextCursor && items.length > 0 && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={loadMore}
                sx={{ cursor: loading ? 'wait' : 'pointer' }}
              >
                {loading ? 'Завантаження…' : 'Завантажити ще'}
              </Link>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ActivityPage;
