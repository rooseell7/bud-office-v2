/**
 * STEP 6: Activity panel for project (projectId).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Link,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
import { getActivityFeedByProject, type ActivityFeedItem } from '../../api/activity';

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

type ProjectActivityPanelProps = {
  projectId: number;
};

export const ProjectActivityPanel: React.FC<ProjectActivityPanelProps> = ({ projectId }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (append = false, cursorParam?: string | null) => {
      setLoading(true);
      try {
        const result = await getActivityFeedByProject(projectId, {
          cursor: append ? (cursorParam ?? undefined) : undefined,
          limit: 30,
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
    [projectId],
  );

  useEffect(() => {
    load(false);
  }, [projectId]);

  const loadMore = useCallback(() => {
    if (nextCursor && !loading) load(true, nextCursor);
  }, [nextCursor, loading, load]);

  return (
    <Box>
      {loading && items.length === 0 ? (
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={32} />
        </Box>
      ) : items.length === 0 ? (
        <Typography color="text.secondary">Поки немає подій по проєкту</Typography>
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
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
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
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      )}
      {nextCursor && items.length > 0 && (
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Link component="button" variant="body2" onClick={loadMore} sx={{ cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? 'Завантаження…' : 'Завантажити ще'}
          </Link>
        </Box>
      )}
    </Box>
  );
};
