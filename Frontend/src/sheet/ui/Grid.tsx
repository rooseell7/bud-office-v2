import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';
import { colToLetter } from '../utils';
import { Cell } from './Cell';
import { CellEditor } from './CellEditor';
import { cellKey, type SheetState } from '../engine/state';
import type { CellCoord } from '../engine/types';
import type { SheetConfig } from '../configs/types';

const ROW_HEIGHT = 28;
const COL_WIDTH = 100;
const HEADER_BG = '#f1f5f9';

export type GridProps = {
  state: SheetState;
  config?: Partial<SheetConfig> | null;
  onCellSelect: (coord: CellCoord) => void;
  onExtendSelection?: (coord: CellCoord) => void;
  onCellDoubleClick?: () => void;
  onEditorChange?: (value: string) => void;
  onColumnResize?: (col: number, width: number) => void;
};

export const Grid: React.FC<GridProps> = ({
  state,
  config,
  onCellSelect,
  onExtendSelection,
  onCellDoubleClick,
  onEditorChange,
  onColumnResize,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartW, setResizeStartW] = useState(0);

  useEffect(() => {
    if (!isDragging) return;
    const onUp = () => setIsDragging(false);
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [isDragging]);

  useEffect(() => {
    if (resizingCol == null || !onColumnResize) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX;
      const w = Math.max(40, Math.min(400, resizeStartW + delta));
      onColumnResize(resizingCol, w);
    };
    const onUp = () => setResizingCol(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizingCol, resizeStartX, resizeStartW, onColumnResize]);

  const {
    rowCount,
    colCount,
    values,
    activeCell,
    isEditing,
    editCell,
    editorValue,
    cellStyles,
  } = state;
  const rowHeight = config?.rowHeight ?? ROW_HEIGHT;
  const defaultColWidth = config?.colWidth ?? COL_WIDTH;
  const getColWidth = (c: number) => state.columnWidths?.[c] ?? defaultColWidth;

  const getValue = (r: number, c: number): string => {
    return values[r]?.[c] ?? '';
  };

  const handleCellMouseDown = (coord: CellCoord) => {
    onCellSelect(coord);
    setIsDragging(true);
  };

  const handleCellMouseEnter = (coord: CellCoord) => {
    if (isDragging && onExtendSelection) {
      onExtendSelection(coord);
    }
  };

  const isInSelection = (r: number, c: number): boolean => {
    const s = state.selection;
    const r1 = Math.min(s.r1, s.r2);
    const r2 = Math.max(s.r1, s.r2);
    const c1 = Math.min(s.c1, s.c2);
    const c2 = Math.max(s.c1, s.c2);
    return r >= r1 && r <= r2 && c >= c1 && c <= c2;
  };

  return (
    <Box
      sx={{
        display: 'inline-block',
        border: '1px solid #e2e8f0',
        overflow: 'auto',
        maxHeight: 400,
        maxWidth: 600,
      }}
    >
      {/* Column headers */}
      <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider' }}>
        <Box
          sx={{
            width: 40,
            minWidth: 40,
            height: rowHeight,
            bgcolor: HEADER_BG,
            borderRight: 1,
            borderColor: 'divider',
          }}
        />
        {Array.from({ length: colCount }, (_, c) => {
          const cw = getColWidth(c);
          return (
            <Box
              key={c}
              sx={{
                width: cw,
                minWidth: cw,
                height: rowHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: 'text.secondary',
                bgcolor: HEADER_BG,
                borderRight: 1,
                borderColor: 'divider',
                position: 'relative',
              }}
            >
              {colToLetter(c)}
              {onColumnResize && (
                <Box
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setResizingCol(c);
                    setResizeStartX(e.clientX);
                    setResizeStartW(cw);
                  }}
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 6,
                    cursor: 'col-resize',
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      {/* Rows */}
      {Array.from({ length: rowCount }, (_, r) => (
        <Box key={r} sx={{ display: 'flex' }}>
          <Box
            sx={{
              width: 40,
              minWidth: 40,
              height: rowHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: 'text.secondary',
              bgcolor: HEADER_BG,
              borderRight: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            {r + 1}
          </Box>
          {Array.from({ length: colCount }, (_, c) => {
            const coord = { row: r, col: c };
            const isActive = activeCell.row === r && activeCell.col === c;
            const inSel = isInSelection(r, c);
            const isEditingThis =
              isEditing &&
              editCell?.row === r &&
              editCell?.col === c;
            const style = cellStyles[cellKey(r, c)];
            const cw = getColWidth(c);
            return (
              <Cell
                key={c}
                coord={coord}
                value={getValue(r, c)}
                isActive={isActive}
                isInSelection={inSel}
                locale={state.locale}
                cellStyle={style}
                rowHeight={rowHeight}
                colWidth={cw}
                onSelect={() => handleCellMouseDown(coord)}
                onMouseEnter={() => handleCellMouseEnter(coord)}
                onDoubleClick={onCellDoubleClick}
                isEditingThis={isEditingThis}
                editorValue={editorValue}
                onEditorChange={onEditorChange ?? (() => {})}
              />
            );
          })}
        </Box>
      ))}
    </Box>
  );
};
