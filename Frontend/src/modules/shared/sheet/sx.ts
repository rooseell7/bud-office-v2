import type { SxProps, Theme } from '@mui/material/styles';
import { SHEET_GRID_COLOR, SHEET_OUTLINE_COLOR } from './constants';

export type SheetCellSxOpts = {
  isLastCol?: boolean;
  isLastRow?: boolean;
  align?: 'left' | 'right' | 'center';
  dense?: boolean;
};

/**
 * Common cell styling to mimic Google Sheets thin gridlines.
 * Use in MUI TableCell sx.
 */
export function sheetCellSx(opts: SheetCellSxOpts = {}): SxProps<Theme> {
  const { isLastCol, isLastRow, align = 'left', dense = true } = opts;

  return {
    borderRight: isLastCol ? 'none' : `1px solid ${SHEET_GRID_COLOR}`,
    borderBottom: isLastRow ? 'none' : `1px solid ${SHEET_GRID_COLOR}`,
    verticalAlign: 'middle',
    px: dense ? 0.75 : 1.25,
    py: dense ? 0.5 : 1,
    textAlign: align,
    '& input': {
      fontSize: '0.875rem',
      padding: dense ? '4px 6px' : '6px 8px',
    },
    '& .MuiOutlinedInput-root': {
      borderRadius: 0,
      '& fieldset': { border: 'none' },
    },
  };
}

/**
 * Outline (outer border) for sheet blocks.
 */
export function sheetOutlineSx(): SxProps<Theme> {
  return {
    border: `1px solid ${SHEET_OUTLINE_COLOR}`,
    borderRadius: 0,
    overflow: 'hidden',
  };
}
