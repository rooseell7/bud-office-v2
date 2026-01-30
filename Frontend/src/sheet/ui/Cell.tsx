import React from 'react';
import { Box } from '@mui/material';
import type { CellCoord, CellStyle } from '../engine/types';
import type { LocaleSettings } from '../configs/types';
import { defaultLocale } from '../configs/types';
import { formatForDisplay } from '../engine/number/formatNumber';
import { CellEditor } from './CellEditor';

export type CellProps = {
  coord: CellCoord;
  value: string;
  isActive: boolean;
  isInSelection: boolean;
  cellStyle?: CellStyle;
  locale?: LocaleSettings;
  rowHeight?: number;
  colWidth?: number;
  onSelect: () => void;
  onMouseEnter?: () => void;
  onDoubleClick?: () => void;
  isEditingThis?: boolean;
  editorValue?: string;
  onEditorChange?: (value: string) => void;
};

const ROW_HEIGHT = 28;
const COL_WIDTH = 100;
const ACTIVE_BORDER = '#1976d2';

export const Cell = React.memo<CellProps>(function Cell({
  value,
  isActive,
  isInSelection,
  cellStyle,
  locale = defaultLocale,
  onSelect,
  onMouseEnter,
  onDoubleClick,
  isEditingThis = false,
  editorValue = '',
  onEditorChange,
  rowHeight = ROW_HEIGHT,
  colWidth = COL_WIDTH,
}) {
  return (
  <Box
    onMouseDown={onSelect}
    onMouseEnter={onMouseEnter}
    onDoubleClick={onDoubleClick}
    sx={{
      position: 'relative',
      width: colWidth,
      minWidth: colWidth,
      height: rowHeight,
      display: 'flex',
      alignItems: 'center',
      px: 1,
      fontSize: 13,
      cursor: 'cell',
      fontWeight: cellStyle?.bold ? 700 : undefined,
      fontStyle: cellStyle?.italic ? 'italic' : undefined,
      textAlign: cellStyle?.align ?? 'left',
      borderRight: 1,
      borderBottom: 1,
      borderColor: 'divider',
      outline: isActive ? `2px solid ${ACTIVE_BORDER}` : 'none',
      outlineOffset: -1,
      zIndex: isActive ? 1 : 0,
      bgcolor: cellStyle?.fill
        ? cellStyle.fill
        : isActive
          ? 'rgba(25, 118, 210, 0.08)'
          : isInSelection
            ? 'rgba(25, 118, 210, 0.04)'
            : 'background.paper',
    }}
  >
    {isEditingThis ? (
      <CellEditor
        value={editorValue}
        onChange={onEditorChange ?? (() => {})}
        rowHeight={rowHeight}
        colWidth={colWidth}
      />
    ) : (
      formatForDisplay(value, cellStyle?.numberFormat ?? 'plain', locale) || value
    )}
  </Box>
  );
});
