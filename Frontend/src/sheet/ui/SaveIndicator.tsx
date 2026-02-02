import React from 'react';
import { Box, Button, Typography } from '@mui/material';

export type SaveStatus =
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'error'
  | 'readonly'
  | 'locked'
  | 'conflict';

export type SaveIndicatorProps = {
  status: SaveStatus;
  message?: string;
  onRetry?: () => void;
};

const LABELS: Record<SaveStatus, string> = {
  idle: '',
  dirty: 'Зміни не збережені',
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
  onRetry,
}) => {
  const label = message ?? LABELS[status];
  if (!label && status === 'idle') return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1200,
        px: 1.5,
        py: 0.5,
        borderRadius: 1,
        bgcolor: 'background.paper',
        boxShadow: 1,
        border: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      {status === 'error' && onRetry && (
        <Button size="small" onClick={onRetry} sx={{ minWidth: 0, py: 0 }}>
          Повторити
        </Button>
      )}
    </Box>
  );
};
