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
  if (!shouldShow) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 1500,
        pointerEvents: 'none',
      }}
    >
      <Chip
        size="small"
        label={getLabel(state)}
        color={getColor(state) as any}
        variant="outlined"
      />
    </Box>
  );
}
