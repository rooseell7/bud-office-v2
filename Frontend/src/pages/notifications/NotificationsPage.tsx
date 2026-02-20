/**
 * STEP 10: Notifications page.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { getNotifications, markNotificationRead, type NotificationItem } from '../../api/notifications';

function entityToRoute(n: NotificationItem): string | null {
  if (!n.entityType || !n.entityId) return null;
  switch (n.entityType) {
    case 'invoice':
      return `/invoices/${n.entityId}`;
    case 'act':
      return `/estimate/acts/${n.entityId}`;
    case 'order':
      return `/supply/orders/${n.entityId}`;
    case 'project':
      return `/projects/${n.entityId}`;
    default:
      return null;
  }
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = useCallback(
    async (append = false, cursor?: string | null) => {
      setLoading(true);
      try {
        const result = await getNotifications({
          unreadOnly: filter === 'unread',
          limit: 50,
          cursor: append ? (cursor ?? nextCursor) ?? undefined : undefined,
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
    [filter, nextCursor],
  );

  useEffect(() => {
    load(false);
  }, [filter]);

  const handleClick = async (n: NotificationItem) => {
    if (!n.readAt) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
      } catch {
        /* ignore */
      }
    }
    const route = entityToRoute(n);
    if (route) navigate(route);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Сповіщення
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Chip
          label="Всі"
          onClick={() => setFilter('all')}
          color={filter === 'all' ? 'primary' : 'default'}
          variant={filter === 'all' ? 'filled' : 'outlined'}
        />
        <Chip
          label="Непрочитані"
          onClick={() => setFilter('unread')}
          color={filter === 'unread' ? 'primary' : 'default'}
          variant={filter === 'unread' ? 'filled' : 'outlined'}
        />
      </Box>
      <Card>
        <CardContent>
          {loading && items.length === 0 ? (
            <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={32} />
            </Box>
          ) : items.length === 0 ? (
            <Typography color="text.secondary">Немає сповіщень</Typography>
          ) : (
            <List dense disablePadding>
              {items.map((n) => {
                const route = entityToRoute(n);
                return (
                  <ListItem
                    key={n.id}
                    disablePadding
                    sx={{
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      opacity: n.readAt ? 0.8 : 1,
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Link
                          component="button"
                          variant="body2"
                          onClick={() => handleClick(n)}
                          sx={{ cursor: 'pointer', textAlign: 'left', fontWeight: n.readAt ? 400 : 600 }}
                        >
                          {n.title}
                        </Link>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {formatTime(n.createdAt)}
                          {n.projectId && ` · Проєкт #${n.projectId}`}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default NotificationsPage;
