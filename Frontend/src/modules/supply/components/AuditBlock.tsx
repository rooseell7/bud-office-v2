import React from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import type { AuditEventDto } from '../../../api/supply';

export const AuditBlock: React.FC<{ events: AuditEventDto[]; title?: string }> = ({ events, title = 'Історія' }) => {
  if (!events?.length) return null;
  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <List dense disablePadding>
        {events.map((e) => (
          <ListItem key={e.id} disablePadding sx={{ alignItems: 'flex-start' }}>
            <ListItemText
              primary={e.message ?? e.action}
              secondary={
                <>
                  {new Date(e.createdAt).toLocaleString('uk-UA')}
                  {e.meta && Object.keys(e.meta).length > 0 && ` • ${JSON.stringify(e.meta)}`}
                </>
              }
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
