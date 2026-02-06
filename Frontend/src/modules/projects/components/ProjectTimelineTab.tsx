import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { getProjectTimeline, type TimelineEvent } from '../../../api/projects';

type Props = { projectId: number; types?: string };

function formatAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function typeLabel(type: string): string {
  const t = type.toLowerCase();
  if (t === 'quote') return 'КП';
  if (t === 'act') return 'Акт';
  if (t === 'invoice') return 'Накладна';
  if (t === 'activity') return 'Подія';
  if (t === 'sales_stage_changed') return 'Стадія продажу';
  if (t === 'next_action_set') return 'Наступна дія';
  if (t === 'next_action_done') return 'Дію виконано';
  if (t === 'project_created') return 'Створено об\'єкт';
  if (t === 'project_updated') return 'Оновлено об\'єкт';
  if (t === 'attachment_added') return 'Файл';
  if (t === 'attachment_removed') return 'Видалено файл';
  if (t === 'contact_log') return 'Контакт';
  return type;
}

function routeForEntity(entity: { type: string; id: number } | undefined): string | null {
  if (!entity) return null;
  switch (entity.type) {
    case 'quote':
      return `/estimate/${entity.id}`;
    case 'act':
      return `/estimate/acts/${entity.id}`;
    case 'invoice':
      return `/invoices/${entity.id}`;
    default:
      return null;
  }
}

const TIMELINE_TYPE_OPTIONS = [
  { value: '', label: 'Всі типи' },
  { value: 'sales_stage_changed,next_action_set,next_action_done', label: 'Продажі' },
  { value: 'quote', label: 'КП' },
  { value: 'act', label: 'Акти' },
  { value: 'invoice', label: 'Накладні' },
  { value: 'activity', label: 'Події' },
];

export default function ProjectTimelineTab({ projectId, types: typesProp }: Props) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typesFilter, setTypesFilter] = useState(typesProp ?? '');

  const types = typesFilter || typesProp;

  useEffect(() => {
    setLoading(true);
    setError(null);
    getProjectTimeline(projectId, { types: types || undefined, limit: 50 })
      .then(setEvents)
      .catch((e: any) => setError(e?.response?.data?.message || e?.message || 'Помилка завантаження'))
      .finally(() => setLoading(false));
  }, [projectId, types]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }
  if (error) {
    return <Typography color="error">{error}</Typography>;
  }
  if (events.length === 0) {
    return <Typography color="text.secondary">Немає подій за обраний період.</Typography>;
  }

  const handleEventClick = (ev: TimelineEvent) => {
    const route = routeForEntity(ev.entity);
    if (route) navigate(route);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FormControl size="small" sx={{ minWidth: 180, mb: 1 }}>
        <InputLabel>Тип подій</InputLabel>
        <Select
          label="Тип подій"
          value={typesFilter}
          onChange={(e) => setTypesFilter(e.target.value)}
        >
          {TIMELINE_TYPE_OPTIONS.map((o) => (
            <MenuItem key={o.value || 'all'} value={o.value}>{o.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {events.map((ev) => {
        const route = routeForEntity(ev.entity);
        const clickable = Boolean(route);
        return (
          <Box
            key={`${ev.type}-${ev.entity?.id ?? ev.entityId ?? ''}-${ev.at}`}
            onClick={clickable ? () => handleEventClick(ev) : undefined}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              py: 0.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              cursor: clickable ? 'pointer' : undefined,
              '&:hover': clickable ? { bgcolor: 'action.hover' } : undefined,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140 }}>
              {formatAt(ev.at)}
            </Typography>
            <Typography variant="caption" sx={{ px: 0.5, borderRadius: 1, bgcolor: 'action.hover' }}>
              {typeLabel(ev.type)}
            </Typography>
            {ev.actor && (
              <Typography variant="caption" color="text.secondary">
                {ev.actor.name}
              </Typography>
            )}
            <Typography variant="body2">{ev.title}</Typography>
          </Box>
        );
      })}
    </Box>
  );
}
