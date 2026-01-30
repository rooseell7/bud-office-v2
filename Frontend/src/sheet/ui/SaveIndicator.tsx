import React from 'react';
import { Box, Typography } from '@mui/material';

export type SaveStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'error'
  | 'readonly'
  | 'locked'
  | 'conflict';

export type SaveIndicatorProps = {
  status: SaveStatus;
  message?: string;
};

const LABELS: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Збереження…',
  saved: 'Збережено',
  error: 'Помилка',
  readonly: 'Тільки перегляд',
  locked: 'Редагує інший',
  conflict: 'Конфлікт',
};

export const SaveIndicator: React.FC<SaveIndicatorProps> = ({
  status,
  message,
}) => {
  const label = message ?? LABELS[status];
  if (!label && status === 'idle') return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 8,
        left: 8,
        zIndex: 1300,
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        bgcolor: 'background.paper',
        boxShadow: 1,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
};
