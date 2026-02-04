/**
 * Dev-only: show last 20 WS domain events. Enable with localStorage.setItem('DEBUG_WS_EVENTS', '1')
 */

import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useRealtime } from './RealtimeContext';
import type { DomainEvent } from './types';

const MAX_EVENTS = 20;

export const RealtimeDebugPanel: React.FC = () => {
  const realtime = useRealtime();
  const [events, setEvents] = useState<DomainEvent[]>([]);

  useEffect(() => {
    if (!realtime) return;
    return realtime.subscribe((ev) => {
      setEvents((prev) => [...prev.slice(1 - MAX_EVENTS), ev].slice(-MAX_EVENTS));
    });
  }, [realtime]);

  const show = typeof localStorage !== 'undefined' && localStorage.getItem('DEBUG_WS_EVENTS') === '1';
  if (!show || !realtime) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        width: 320,
        maxHeight: 240,
        overflow: 'auto',
        bgcolor: 'rgba(0,0,0,0.85)',
        color: '#ccc',
        fontSize: '0.7rem',
        p: 1,
        borderRadius: 1,
        zIndex: 9999,
        border: '1px solid #444',
      }}
    >
      <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5 }}>
        WS events (last {events.length})
      </Typography>
      {events.slice().reverse().map((ev, i) => (
        <Box key={`${ev.eventId}-${i}`} sx={{ mb: 0.5, fontFamily: 'monospace' }}>
          {ev.entity} {ev.action} id={ev.entityId} {ev.projectId != null ? `project=${ev.projectId}` : ''} {ev.ts?.slice(11, 19)}
        </Box>
      ))}
    </Box>
  );
};
