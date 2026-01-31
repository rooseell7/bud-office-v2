import React from 'react';
import { Box, Tooltip } from '@mui/material';
import type { CellCoord, CellStyle } from '../engine/types';
import type { LocaleSettings } from '../configs/types';
import { defaultLocale } from '../configs/types';
import { formatForDisplay } from '../engine/number/formatNumber';
import { CellEditor } from './CellEditor';

export type CellProps = {
  coord: CellCoord;
  value: string;
  rawValue?: string;
  isActive: boolean;
  isInSelection: boolean;
  isInFillTarget?: boolean;
  cellStyle?: CellStyle;
  columnType?: 'text' | 'number' | 'uah' | 'percent';
  cellError?: { code: string; message: string };
  locale?: LocaleSettings;
  rowHeight?: number;
  colWidth?: number;
  flex?: boolean;
  gridCell?: boolean;
  wrap?: boolean;
  onSelect: () => void;
  onMouseEnter?: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  isEditingThis?: boolean;
  editorValue?: string;
  onEditorChange?: (value: string) => void;
};

const ROW_HEIGHT = 28;
const COL_WIDTH = 100;
const ACTIVE_BORDER = '#1976d2';

function getNumberFormat(
  cellStyle?: CellStyle,
  columnType?: 'text' | 'number' | 'uah' | 'percent',
): 'plain' | 'number' | 'uah' | 'percent' {
  if (cellStyle?.numberFormat && cellStyle.numberFormat !== 'plain') return cellStyle.numberFormat;
  if (columnType === 'number') return 'number';
  if (columnType === 'uah') return 'uah';
  if (columnType === 'percent') return 'percent';
  return cellStyle?.numberFormat ?? 'plain';
}

export const Cell = React.memo<CellProps>(function Cell({
  value,
  rawValue,
  isActive,
  isInSelection,
  isInFillTarget = false,
  cellStyle,
  columnType,
  cellError,
  locale = defaultLocale,
  onSelect,
  onMouseEnter,
  onDoubleClick,
  onContextMenu,
  isEditingThis = false,
  editorValue = '',
  onEditorChange,
  rowHeight = ROW_HEIGHT,
  colWidth = COL_WIDTH,
  flex = false,
  gridCell = false,
  wrap = false,
}) {
  const numberFormat = getNumberFormat(cellStyle, columnType);
  const isComputedErr = value === '#ERR';
  const displayValue = isComputedErr
    ? '#ERR'
    : cellError
      ? (rawValue ?? value)
      : (formatForDisplay(value, numberFormat, locale) || value);
  const showErrorBorder = cellError || isComputedErr;
  return (
  <Tooltip title={cellError?.message ?? (isComputedErr ? 'Помилка обчислення' : '')} disableHoverListener={!cellError && !isComputedErr}>
  <Box
    onMouseDown={onSelect}
    onMouseEnter={onMouseEnter}
    onDoubleClick={onDoubleClick}
  onContextMenu={onContextMenu}
    sx={{
      position: 'relative',
      ...(gridCell
        ? { width: '100%', minWidth: 0 }
        : flex
          ? { flex: 1, minWidth: 80 }
          : { width: colWidth, minWidth: colWidth }),
      height: rowHeight,
      display: 'flex',
      alignItems: wrap ? 'flex-start' : 'center',
      px: 1,
      py: wrap ? 0.5 : 0,
      fontSize: 13,
      cursor: 'cell',
      ...(wrap
        ? { whiteSpace: 'normal' as const, wordBreak: 'break-word' as const, overflowWrap: 'anywhere' as const, overflow: 'hidden' }
        : { whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }),
      fontWeight: cellStyle?.bold ? 700 : undefined,
      fontStyle: cellStyle?.italic ? 'italic' : undefined,
      textAlign: cellStyle?.align ?? 'left',
      borderRight: 1,
      borderBottom: 1,
      borderColor: 'divider',
      outline: isActive ? `2px solid ${ACTIVE_BORDER}` : 'none',
      outlineOffset: -1,
      border: showErrorBorder ? '2px solid #d32f2f' : undefined,
      boxSizing: 'border-box',
      zIndex: isActive ? 1 : 0,
      bgcolor: cellStyle?.fill
        ? cellStyle.fill
        : isInFillTarget
          ? 'rgba(25, 118, 210, 0.12)'
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
        colWidth={gridCell ? 200 : flex ? 200 : colWidth}
      />
    ) : (
      displayValue
    )}
  </Box>
  </Tooltip>
  );
});
