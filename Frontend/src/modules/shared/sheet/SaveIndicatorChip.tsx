import { createPortal } from 'react-dom';
import { Box, Chip } from '@mui/material';

export type SaveIndicatorState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

type Props = {
  state: SaveIndicatorState;
  /**
   * When true, shows chip also for the "dirty" state.
   * When false, renders only for saving/saved/error.
   */
  showDirty?: boolean;
};

function getLabel(state: SaveIndicatorState): string {
  switch (state) {
    case 'dirty':
      return 'Є незбережені зміни';
    case 'saving':
      return 'Автозбереження…';
    case 'saved':
      return 'Збережено';
    case 'error':
      return 'Помилка збереження';
    default:
      return '';
  }
}

function getColor(state: SaveIndicatorState): 'default' | 'warning' | 'info' | 'success' | 'error' {
  switch (state) {
    case 'dirty':
      return 'warning';
    case 'saving':
      return 'info';
    case 'saved':
      return 'success';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
}

export default function SaveIndicatorChip({ state, showDirty = true }: Props) {
  const shouldShow = state !== 'idle' && (showDirty ? true : state !== 'dirty');

  const content = (
    <Box
      sx={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 1500,
        pointerEvents: 'none',
        opacity: shouldShow ? 1 : 0,
        visibility: shouldShow ? 'visible' : 'hidden',
        transition: 'opacity 0.15s ease',
      }}
    >
      <Chip
        size="small"
        label={getLabel(state) || '\u00A0'}
        color={getColor(state) as any}
        variant="outlined"
        sx={{ minWidth: 120 }}
      />
    </Box>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
