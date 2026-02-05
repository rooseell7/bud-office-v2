import React, { useState } from 'react';
import { Box, Typography, List, ListItem, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { AuditEventDto } from '../../../api/supply';

export const AuditBlock: React.FC<{ events: AuditEventDto[]; title?: string }> = ({ events, title = 'Історія' }) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  if (!events?.length) return null;
  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <List dense disablePadding>
        {events.map((e) => {
          const hasMeta = e.meta && Object.keys(e.meta).length > 0;
          const isExpanded = expandedId === e.id;
          return (
            <ListItem key={e.id} disablePadding sx={{ alignItems: 'flex-start', flexDirection: 'column', py: 0.5 }} dense>
              <Box sx={{ width: '100%' }}>
                <Typography variant="body2" component="span">{e.message ?? e.action}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, mt: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(e.createdAt).toLocaleString('uk-UA')}
                    {e.actorId != null && ` • Користувач #${e.actorId}`}
                  </Typography>
                  {hasMeta && (
                    <IconButton size="small" onClick={() => setExpandedId(isExpanded ? null : e.id)} sx={{ p: 0, ml: -0.25 }}>
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  )}
                </Box>
                {hasMeta && (
                  <Collapse in={isExpanded}>
                    <Box component="pre" sx={{ fontSize: '0.75rem', mt: 0.5, p: 1, bgcolor: 'background.paper', borderRadius: 1, overflow: 'auto' }}>
                      {JSON.stringify(e.meta, null, 2)}
                    </Box>
                  </Collapse>
                )}
              </Box>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};
