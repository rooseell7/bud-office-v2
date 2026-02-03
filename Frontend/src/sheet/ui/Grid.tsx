import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Menu, MenuItem, TextField, Divider, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { colToLetter } from '../utils';
import { colToLabel } from '../utils/colLabel';
import { Cell } from './Cell';
import { CellEditor } from './CellEditor';
import { cellKey, type SheetState } from '../engine/state';
import type { CellCoord } from '../engine/types';
import type { SheetConfig } from '../configs/types';
import { clampColWidth, clampRowHeight } from '../engine/resizeConstants';
import { computeAutoFitWidth } from '../engine/autofit';
import { computeAutoFitRowHeight } from '../engine/autofitRow';
import {
  columnHasData,
  rowHasData,
  tableHasFormulas,
  columnsHaveData,
  rowsHaveData,
} from '../engine/deleteGuards';
import { ConfirmDialog } from './ConfirmDialog';
import { ColumnFormulaDialog } from './ColumnFormulaDialog';
import { validateExpr } from '../engine/computed/validateExpr';
import { useFillHandle } from '../hooks/useFillHandle';
import { computeRowVisibility } from '../engine/filter/applyFilters';
import { ColumnFilterDialog } from './ColumnFilterDialog';

function CommentDialog({
  open,
  row,
  col,
  initialText,
  onSave,
  onCancel,
}: {
  open: boolean;
  row: number;
  col: number;
  initialText: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initialText);
  useEffect(() => {
    if (open) setText(initialText);
  }, [open, initialText]);
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Коментар до клітинки {colToLabel(col)}{row + 1}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          multiline
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введіть коментар..."
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Скасувати</Button>
        <Button variant="contained" onClick={() => onSave(text)}>
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const ROW_HEIGHT_DEFAULT = 28;
const LETTERS_ROW_HEIGHT = 22;
const COL_WIDTH_DEFAULT = 140;
const ROW_HEADER_WIDTH = 48;
const RESIZE_HANDLE_WIDTH = 8;

export type GridProps = {
  state: SheetState;
  config?: Partial<SheetConfig> | null;
  onCellSelect: (coord: CellCoord) => void;
  onExtendSelection?: (coord: CellCoord) => void;
  onCellDoubleClick?: () => void;
  onEditorChange?: (value: string) => void;
  onEditorBlur?: () => void;
  onColumnResize?: (col: number, width: number) => void;
  onColumnResizeCommit?: (col: number, prevWidth: number, nextWidth: number) => void;
  onRowResizeCommit?: (row: number, prevHeight: number, nextHeight: number) => void;
  onInsertRowAbove?: (row: number) => void;
  onInsertRowBelow?: (row: number) => void;
  onInsertColumnAt?: (atIndex: number) => void;
  onDeleteColumn?: (col: number) => void;
  onDeleteColumnsBatch?: (cols: number[]) => void;
  onRenameColumn?: (colIndex: number, prevTitle: string, nextTitle: string) => void;
  onDeleteRow?: (row: number) => void;
  onDeleteRowsBatch?: (rows: number[]) => void;
  onSetColumnFormula?: (colIndex: number, prevExpr: string | undefined, nextExpr: string) => void;
  onApplyFill?: (
    source: { r1: number; r2: number; c1: number; c2: number },
    target: { r1: number; r2: number; c1: number; c2: number },
  ) => void;
  onSortRows?: (colIndex: number, direction: 'asc' | 'desc') => void;
  onSetFiltersEnabled?: (enabled: boolean) => void;
  onSetColumnFilter?: (colId: string, spec: import('../engine/types').FilterSpec | null) => void;
  onClearAllFilters?: () => void;
  onSetFreezeRows?: (count: number) => void;
  onSetFreezeCols?: (count: number) => void;
  onAddRowAtEnd?: () => void;
  onAutocompleteSelect?: (row: number, name: string, unit?: string | null, materialId?: number) => void;
  onSetCellComment?: (row: number, col: number, text: string) => void;
};

export const Grid: React.FC<GridProps> = ({
  state,
  config,
  onCellSelect,
  onExtendSelection,
  onCellDoubleClick,
  onEditorChange,
  onEditorBlur,
  onColumnResize,
  onColumnResizeCommit,
  onRowResizeCommit,
  onInsertRowAbove,
  onInsertRowBelow,
  onInsertColumnAt,
  onDeleteColumn,
  onDeleteColumnsBatch,
  onRenameColumn,
  onDeleteRow,
  onDeleteRowsBatch,
  onSetColumnFormula,
  onApplyFill,
  onSortRows,
  onSetFiltersEnabled,
  onSetColumnFilter,
  onClearAllFilters,
  onSetFreezeRows,
  onSetFreezeCols,
  onAddRowAtEnd,
  onAutocompleteSelect,
  onSetCellComment,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const [resizingRow, setResizingRow] = useState<number | null>(null);
  const [tempColWidth, setTempColWidth] = useState<number | null>(null);
  const [tempRowHeight, setTempRowHeight] = useState<number | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartW, setResizeStartW] = useState(0);
  const [resizeStartY, setResizeStartY] = useState(0);
  const [resizeStartH, setResizeStartH] = useState(0);
  const [contextMenu, setContextMenu] = useState<{
    row: number;
    col: number;
    x: number;
    y: number;
  } | null>(null);
  const [confirmState, setConfirmState] = useState<{
    type: 'column' | 'row';
    target: number;
    batchCols?: number[];
    batchRows?: number[];
    title: string;
    message: string;
    hasData: boolean;
    hasFormulas: boolean;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [commentDialog, setCommentDialog] = useState<{ row: number; col: number; text: string } | null>(null);
  const [filterDialog, setFilterDialog] = useState<{
    colIndex: number;
    columnTitle: string;
    columnType?: 'text' | 'number' | 'uah' | 'percent';
    colId: string;
    initialSpec: import('../engine/types').FilterSpec | null;
  } | null>(null);
  const [formulaDialog, setFormulaDialog] = useState<{
    colIndex: number;
    columnTitle: string;
    initialExpr: string;
  } | null>(null);
  const [editingHeaderCol, setEditingHeaderCol] = useState<number | null>(null);
  const [headerEditValue, setHeaderEditValue] = useState('');
  const headerInputRef = useRef<HTMLInputElement>(null);

  const s = state.selection;
  const selR1 = Math.min(s.r1, s.r2);
  const selR2 = Math.max(s.r1, s.r2);
  const selC1 = Math.min(s.c1, s.c2);
  const selC2 = Math.max(s.c1, s.c2);
  const sourceRange =
    onApplyFill && !state.isEditing ? { r1: selR1, r2: selR2, c1: selC1, c2: selC2 } : null;

  const rowVisibility = React.useMemo(() => computeRowVisibility(state), [state]);


  const { targetRange: fillTargetRange, onFillHandleMouseDown } = useFillHandle(
    sourceRange,
    state.rowCount,
    onApplyFill ?? (() => {}),
  );

  useEffect(() => {
    if (editingHeaderCol != null) {
      headerInputRef.current?.focus();
      headerInputRef.current?.select();
    }
  }, [editingHeaderCol]);

  useEffect(() => {
    if (!isDragging) return;
    const onUp = () => setIsDragging(false);
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [isDragging]);

  useEffect(() => {
    if (resizingCol == null) return;
    const col = resizingCol;
    const startX = resizeStartX;
    const startW = resizeStartW;
    const onMove = (e: MouseEvent) => {
      setTempColWidth(clampColWidth(startW + e.clientX - startX));
    };
    const onUp = (e: MouseEvent) => {
      const nextW = clampColWidth(startW + e.clientX - startX);
      if (onColumnResizeCommit && nextW !== startW) {
        onColumnResizeCommit(col, startW, nextW);
      }
      setResizingCol(null);
      setTempColWidth(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp as EventListener);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp as EventListener);
    };
  }, [resizingCol, resizeStartX, resizeStartW, onColumnResizeCommit]);

  useEffect(() => {
    if (resizingRow == null) return;
    const row = resizingRow;
    const startY = resizeStartY;
    const startH = resizeStartH;
    const onMove = (e: MouseEvent) => {
      setTempRowHeight(clampRowHeight(startH + e.clientY - startY));
    };
    const onUp = (e: MouseEvent) => {
      const nextH = clampRowHeight(startH + e.clientY - startY);
      if (onRowResizeCommit && nextH !== startH) {
        onRowResizeCommit(row, startH, nextH);
      }
      setResizingRow(null);
      setTempRowHeight(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp as EventListener);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp as EventListener);
    };
  }, [resizingRow, resizeStartY, resizeStartH, onRowResizeCommit]);

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
  const defaultRowHeight = config?.rowHeight ?? ROW_HEIGHT_DEFAULT;
  const defaultColWidth = config?.colWidth ?? COL_WIDTH_DEFAULT;
  const getColWidth = (c: number) => {
    if (resizingCol === c && tempColWidth != null) return tempColWidth;
    return state.columnWidths?.[c] ?? config?.columnWidthDefaults?.[c] ?? defaultColWidth;
  };
  const getRowHeight = (r: number) => {
    if (resizingRow === r && tempRowHeight != null) return tempRowHeight;
    return state.rowHeights?.[r] ?? defaultRowHeight;
  };

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

  const useGrid = Boolean(config?.gridTemplateColumns) || Boolean(config?.columnHeaders?.length);
  const flexCol = config?.flexColumn;
  /** When using grid, letter/header count must match gridTemplateColumns tracks (1 corner + N data). Use config.columnHeaders to avoid wrap. */
  const fullColCount = useGrid
    ? (state.columns?.length ?? config?.columnHeaders?.length ?? colCount)
    : colCount;
  const hiddenSet = new Set(config?.hiddenColumns ?? []);
  const visibleCols = Array.from({ length: fullColCount }, (_, i) => i).filter((i) => !hiddenSet.has(i));
  const dataColCount = visibleCols.length;
  const getHeaderTitle = (c: number) =>
    state.columns?.[c]?.title ?? config?.columnHeaders?.[c] ?? colToLetter(c);
  const dynamicGridTemplate = useGrid
    ? [`${ROW_HEADER_WIDTH}px`, ...visibleCols.map((c) => `${getColWidth(c)}px`)].join(' ')
    : '';
  const gridTemplate = dynamicGridTemplate || (config?.gridTemplateColumns ?? '');
  const freezeRows = useGrid ? Math.min(state.freeze?.rows ?? 0, state.rowCount) : 0;
  const freezeCols = useGrid ? Math.min(state.freeze?.cols ?? 0, dataColCount) : 0;

  const minTableWidth = useGrid
    ? ROW_HEADER_WIDTH + visibleCols.reduce((a, c) => a + getColWidth(c), 0)
    : 40 +
      Array.from({ length: colCount }, (_, c) => (flexCol === c ? 80 : getColWidth(c))).reduce(
        (a, b) => a + b,
        0,
      );

  const headerRowSx = useGrid
    ? {
        width: '100%',
        minWidth: minTableWidth,
        display: 'grid' as const,
        gridTemplateColumns: gridTemplate,
        borderBottom: 1,
        borderColor: 'var(--sheet-grid)',
        background: 'var(--sheet-bg)',
      }
    : {
        width: '100%',
        minWidth: minTableWidth,
        display: 'flex' as const,
        borderBottom: 1,
        borderColor: 'var(--sheet-grid)',
      };

  const dataRowSx = useGrid
    ? {
        width: '100%',
        minWidth: minTableWidth,
        display: 'grid' as const,
        gridTemplateColumns: gridTemplate,
      }
    : {
        width: '100%',
        minWidth: minTableWidth,
        display: 'flex' as const,
      };

  const lettersRowSx = useGrid
    ? {
        width: '100%',
        minWidth: minTableWidth,
        display: 'grid' as const,
        gridTemplateColumns: gridTemplate,
        borderBottom: 1,
        borderColor: 'var(--sheet-grid)',
        background: 'var(--sheet-header-bg)',
      }
    : null;

  const headerTotalHeight = LETTERS_ROW_HEIGHT + defaultRowHeight;
  const cumulativeColLeft = React.useMemo(() => {
    const out: number[] = [ROW_HEADER_WIDTH];
    for (let i = 0; i < visibleCols.length - 1; i++) {
      out.push(out[out.length - 1] + getColWidth(visibleCols[i]));
    }
    return out;
  }, [visibleCols, resizingCol, tempColWidth, state.columnWidths, config]);

  const cumulativeRowTop = React.useMemo(() => {
    const out: number[] = [headerTotalHeight];
    for (let r = 0; r < rowCount - 1; r++) {
      out.push(out[out.length - 1] + getRowHeight(r));
    }
    return out;
  }, [rowCount, resizingRow, tempRowHeight, state.rowHeights, config]);

  const letterCellSx = {
    minWidth: 0,
    height: LETTERS_ROW_HEIGHT,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--sheet-header-text)',
    bgcolor: 'var(--sheet-header-bg)',
    borderRight: 1,
    borderColor: 'var(--sheet-grid)',
    whiteSpace: 'nowrap' as const,
    wordBreak: 'normal' as const,
    overflowWrap: 'normal' as const,
    writingMode: 'horizontal-tb' as const,
    textOrientation: 'mixed' as const,
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
    <Box
      sx={{
        width: '100%',
        minWidth: minTableWidth,
        border: '1px solid var(--sheet-grid)',
        overflow: 'auto',
        maxHeight: '72vh',
        scrollbarGutter: 'stable',
        bgcolor: 'var(--sheet-bg)',
      }}
    >
      {/* Sticky container: letters row + column headers */}
      {useGrid && lettersRowSx ? (
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            background: 'var(--sheet-header-bg)',
          }}
        >
          {/* Letters row (A, B, C, ...) */}
          <Box sx={lettersRowSx}>
            <Box
              sx={{
                width: ROW_HEADER_WIDTH,
                minWidth: ROW_HEADER_WIDTH,
                maxWidth: ROW_HEADER_WIDTH,
                height: LETTERS_ROW_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'var(--sheet-header-bg)',
                borderRight: 1,
                borderColor: 'var(--sheet-grid)',
                ...(freezeCols > 0 && {
                  position: 'sticky' as const,
                  left: 0,
                  zIndex: 6,
                  boxShadow: '2px 0 4px -2px rgba(0,0,0,0.1)',
                }),
              }}
            />
            {visibleCols.map((c, i) => (
              <Box
                key={c}
                sx={{
                  ...letterCellSx,
                  ...(freezeCols > 0 && i < freezeCols && {
                    position: 'sticky' as const,
                    left: cumulativeColLeft[i],
                    zIndex: 6,
                    boxShadow: i === freezeCols - 1 ? '2px 0 4px -2px rgba(0,0,0,0.1)' : undefined,
                    borderRight: i === freezeCols - 1 ? '1px solid' : undefined,
                    borderColor: i === freezeCols - 1 ? 'var(--sheet-grid)' : undefined,
                  }),
                }}
              >
                {colToLabel(c)}
              </Box>
            ))}
          </Box>
          {/* Column headers */}
          <Box sx={{ ...headerRowSx, background: 'var(--sheet-bg)' }}>
        <Box
          sx={{
            width: ROW_HEADER_WIDTH,
            minWidth: ROW_HEADER_WIDTH,
            maxWidth: ROW_HEADER_WIDTH,
            height: defaultRowHeight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'var(--sheet-header-bg)',
            borderRight: 1,
            borderColor: 'var(--sheet-grid)',
            position: 'relative',
            ...(freezeCols > 0 && {
              position: 'sticky' as const,
              left: 0,
              zIndex: 6,
              boxShadow: '2px 0 4px -2px rgba(0,0,0,0.1)',
            }),
          }}
        >
          {state.filtersEnabled && (
            <Box
              component="span"
              sx={{ fontSize: 14, color: 'primary.main' }}
              title="Фільтр увімкнено"
            >
              🔍
            </Box>
          )}
        </Box>
        {visibleCols.map((c, i) => {
          const cw = getColWidth(c);
          const isFlex = !useGrid && config?.flexColumn === c;
          return (
            <Box
              key={c}
              onDoubleClick={
                onRenameColumn
                  ? (e) => {
                      if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
                      setEditingHeaderCol(c);
                      setHeaderEditValue(getHeaderTitle(c));
                    }
                  : undefined
              }
              sx={{
                ...(useGrid ? { minWidth: 0 } : isFlex ? { flex: 1, minWidth: 80 } : { width: cw, minWidth: cw }),
                height: defaultRowHeight,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--sheet-header-text)',
                bgcolor: 'var(--sheet-header-bg)',
                borderRight: 1,
                borderColor: 'var(--sheet-grid)',
                position: 'relative',
                ...(freezeCols > 0 && i < freezeCols && {
                  position: 'sticky' as const,
                  left: cumulativeColLeft[i],
                  zIndex: 6,
                  boxShadow: i === freezeCols - 1 ? '2px 0 4px -2px rgba(0,0,0,0.1)' : undefined,
                  borderRight: i === freezeCols - 1 ? '1px solid' : 1,
                  borderColor: 'var(--sheet-grid)',
                }),
              }}
            >
              {editingHeaderCol === c ? (
                <TextField
                  inputRef={headerInputRef}
                  value={headerEditValue}
                  onChange={(e) => setHeaderEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const prev = getHeaderTitle(c);
                      const next = headerEditValue.trim() || prev;
                      if (next !== prev) onRenameColumn?.(c, prev, next);
                      setEditingHeaderCol(null);
                    } else if (e.key === 'Escape') {
                      setHeaderEditValue(getHeaderTitle(c));
                      setEditingHeaderCol(null);
                    }
                  }}
                  onBlur={() => {
                    const prev = getHeaderTitle(c);
                    const next = headerEditValue.trim() || prev;
                    if (next !== prev) onRenameColumn?.(c, prev, next);
                    setEditingHeaderCol(null);
                  }}
                  size="small"
                  variant="standard"
                  sx={{ '& .MuiInput-input': { fontSize: 12, fontWeight: 600, textAlign: 'center', py: 0 } }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                getHeaderTitle(c)
              )}
              {onColumnResizeCommit && (
                <Box
                  data-resize-handle
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setResizingCol(c);
                    setResizeStartX(e.clientX);
                    setResizeStartW(getColWidth(c));
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const prev = getColWidth(c);
                    const next = computeAutoFitWidth(state, c, config);
                    if (next !== prev) onColumnResizeCommit(c, prev, next);
                  }}
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: RESIZE_HANDLE_WIDTH,
                    cursor: 'col-resize',
                  }}
                />
              )}
            </Box>
          );
        })}
          </Box>
        </Box>
      ) : (
        <Box sx={headerRowSx}>
          <Box
            sx={{
              width: ROW_HEADER_WIDTH,
              minWidth: ROW_HEADER_WIDTH,
              maxWidth: ROW_HEADER_WIDTH,
              flex: '0 0 auto',
              height: defaultRowHeight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'var(--sheet-header-bg)',
              borderRight: 1,
              borderColor: 'var(--sheet-grid)',
            }}
          />
          {visibleCols.map((c, i) => {
            const cw = getColWidth(c);
            const isFlex = config?.flexColumn === c;
            return (
              <Box
                key={c}
                onDoubleClick={
                  onRenameColumn
                    ? (e) => {
                        if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
                        setEditingHeaderCol(c);
                        setHeaderEditValue(getHeaderTitle(c));
                      }
                    : undefined
                }
                sx={{
                  ...(isFlex ? { flex: 1, minWidth: 80 } : { width: cw, minWidth: cw }),
                  height: defaultRowHeight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--sheet-header-text)',
                bgcolor: 'var(--sheet-header-bg)',
                borderRight: 1,
                borderColor: 'var(--sheet-grid)',
                position: 'relative',
              }}
            >
              {editingHeaderCol === c ? (
                  <TextField
                    inputRef={headerInputRef}
                    value={headerEditValue}
                    onChange={(e) => setHeaderEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const prev = getHeaderTitle(c);
                        const next = headerEditValue.trim() || prev;
                        if (next !== prev) onRenameColumn?.(c, prev, next);
                        setEditingHeaderCol(null);
                      } else if (e.key === 'Escape') {
                        setHeaderEditValue(getHeaderTitle(c));
                        setEditingHeaderCol(null);
                      }
                    }}
                    onBlur={() => {
                      const prev = getHeaderTitle(c);
                      const next = headerEditValue.trim() || prev;
                      if (next !== prev) onRenameColumn?.(c, prev, next);
                      setEditingHeaderCol(null);
                    }}
                    size="small"
                    variant="standard"
                    sx={{ '& .MuiInput-input': { fontSize: 12, fontWeight: 600, textAlign: 'center', py: 0 } }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  getHeaderTitle(c)
                )}
                {onColumnResizeCommit && (
                  <Box
                    data-resize-handle
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setResizingCol(c);
                      setResizeStartX(e.clientX);
                      setResizeStartW(getColWidth(c));
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const prev = getColWidth(c);
                      const next = computeAutoFitWidth(state, c, config);
                      if (next !== prev) onColumnResizeCommit(c, prev, next);
                    }}
                    sx={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: RESIZE_HANDLE_WIDTH,
                      cursor: 'col-resize',
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Rows */}
      {Array.from({ length: rowCount }, (_, r) =>
        !rowVisibility[r] ? null : (
        <Box
          key={r}
          sx={{
            ...dataRowSx,
            ...(freezeRows > 0 && r < freezeRows && {
              position: 'sticky' as const,
              top: cumulativeRowTop[r],
              zIndex: 4,
              boxShadow: r === freezeRows - 1 ? '0 2px 4px -2px rgba(0,0,0,0.1)' : undefined,
              borderBottom: r === freezeRows - 1 ? '1px solid' : undefined,
              borderColor: r === freezeRows - 1 ? 'var(--sheet-grid)' : undefined,
            }),
          }}
          data-row={r}
        >
          <Box
            onContextMenu={
              (onInsertRowAbove || onInsertRowBelow || onDeleteRow || onInsertColumnAt || onDeleteColumn || onRenameColumn || onSetFreezeRows)
                ? (e) => {
                    e.preventDefault();
                    setContextMenu({ row: r, col: activeCell.col, x: e.clientX, y: e.clientY });
                  }
                : undefined
            }
            sx={{
              width: ROW_HEADER_WIDTH,
              minWidth: ROW_HEADER_WIDTH,
              maxWidth: ROW_HEADER_WIDTH,
              flex: '0 0 auto',
              position: 'relative',
              height: getRowHeight(r),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: 'var(--sheet-header-text)',
              bgcolor: 'var(--sheet-header-bg)',
              borderRight: 1,
              borderBottom: 1,
              borderColor: 'var(--sheet-grid)',
              ...(freezeCols > 0 && {
                position: 'sticky' as const,
                left: 0,
                zIndex: 5,
                boxShadow: '2px 0 4px -2px rgba(0,0,0,0.1)',
              }),
            }}
          >
            {r + 1}
            {onRowResizeCommit && (
              <Box
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setResizingRow(r);
                  setResizeStartY(e.clientY);
                  setResizeStartH(getRowHeight(r));
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const prev = getRowHeight(r);
                  const next = computeAutoFitRowHeight(state, r, config, getColWidth);
                  if (next !== prev) onRowResizeCommit(r, prev, next);
                }}
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: RESIZE_HANDLE_WIDTH,
                  cursor: 'row-resize',
                }}
              />
            )}
          </Box>
          {visibleCols.map((c, i) => {
            const coord = { row: r, col: c };
            const isActive = activeCell.row === r && activeCell.col === c;
            const inSel = isInSelection(r, c);
            const isBottomRightOfSelection = r === selR2 && c === selC2 && inSel;
            const isInFillTarget =
              fillTargetRange != null &&
              r >= fillTargetRange.r1 &&
              r <= fillTargetRange.r2 &&
              c >= fillTargetRange.c1 &&
              c <= fillTargetRange.c2;
            const isEditingThis =
              isEditing &&
              editCell?.row === r &&
              editCell?.col === c;
            const style = cellStyles[cellKey(r, c)];
            const cw = getColWidth(c);
            const isFlexCol = !useGrid && config?.flexColumn === c;
            const cellEl = (
              <Cell
                key={c}
                coord={coord}
                value={getValue(r, c)}
                rawValue={state.rawValues[r]?.[c] ?? ''}
                isActive={isActive}
                isInSelection={inSel}
                isInFillTarget={isInFillTarget}
                locale={state.locale}
                cellStyle={style}
                columnType={state.columns?.[c]?.type}
                cellError={state.cellErrors?.[cellKey(r, c)]}
                rowHeight={getRowHeight(r)}
                colWidth={isFlexCol ? undefined : cw}
                flex={isFlexCol}
                gridCell={useGrid}
                wrap={!!(state.columns?.[c]?.wrap ?? config?.columnWrap?.[c])}
                onSelect={() => handleCellMouseDown(coord)}
                onMouseEnter={() => handleCellMouseEnter(coord)}
                onDoubleClick={onCellDoubleClick}
                onContextMenu={
                  (onInsertRowAbove || onInsertRowBelow || onDeleteRow || onInsertColumnAt || onDeleteColumn || onRenameColumn || onSetFreezeRows)
                    ? (e) => {
                        e.preventDefault();
                        setContextMenu({ row: r, col: c, x: e.clientX, y: e.clientY });
                      }
                    : undefined
                }
                isEditingThis={isEditingThis}
                editorValue={editorValue}
                onEditorChange={onEditorChange ?? (() => {})}
                onEditorBlur={onEditorBlur}
                cellComment={state.cellComments?.[`${r}:${c}`]}
                autocompleteType={
                  config?.autocompleteForColumn?.colIndex === c
                    ? config.autocompleteForColumn.type
                    : undefined
                }
                onAutocompleteSelect={
                  config?.autocompleteForColumn?.colIndex === c && onAutocompleteSelect
                    ? (name, unit, materialId) => onAutocompleteSelect(r, name, unit, materialId)
                    : undefined
                }
              />
            );
            const cellWrapperSx =
              freezeCols > 0 && c < freezeCols
                ? {
                    position: 'sticky' as const,
                    left: cumulativeColLeft[c],
                    zIndex: 4,
                    minWidth: 0,
                    boxShadow: c === freezeCols - 1 ? '2px 0 4px -2px rgba(0,0,0,0.1)' : undefined,
                    borderRight: c === freezeCols - 1 ? '1px solid' : undefined,
                    borderColor: c === freezeCols - 1 ? 'var(--sheet-grid)' : undefined,
                  }
                : { position: 'relative' as const, minWidth: 0 };
            return isBottomRightOfSelection && sourceRange ? (
              <Box key={c} sx={cellWrapperSx}>
                {cellEl}
                <Box
                  data-fill-handle
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onFillHandleMouseDown();
                  }}
                  sx={{
                    position: 'absolute',
                    bottom: 2,
                    right: 2,
                    width: 6,
                    height: 6,
                    backgroundColor: '#1976d2',
                    border: '1px solid #fff',
                    cursor: 'crosshair',
                    zIndex: 10,
                  }}
                />
              </Box>
            ) : (
              <Box key={c} sx={cellWrapperSx}>
                {cellEl}
              </Box>
            );
          })}
        </Box>
      ))
      }
    </Box>
    {onAddRowAtEnd && (
      <Button
        size="small"
        onClick={onAddRowAtEnd}
        sx={{ alignSelf: 'flex-start', mt: 0.5 }}
      >
        +рядок
      </Button>
    )}
      <Menu
        open={contextMenu != null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu != null ? { top: contextMenu.y, left: contextMenu.x } : undefined
        }
      >
        {onInsertColumnAt && [
          <MenuItem
            key="insert-left"
            onClick={() => {
              if (contextMenu != null) {
                onInsertColumnAt(contextMenu.col);
                setContextMenu(null);
              }
            }}
          >
            Додати колонку зліва
          </MenuItem>,
          <MenuItem
            key="insert-right"
            onClick={() => {
              if (contextMenu != null) {
                onInsertColumnAt(contextMenu.col + 1);
                setContextMenu(null);
              }
            }}
          >
            Додати колонку справа
          </MenuItem>,
        ]}
        {onDeleteColumn && (
          <MenuItem
            onClick={() => {
              if (contextMenu == null) return;
              const col = contextMenu.col;
              const isProtected = (config?.protectedColumnIds ?? []).includes(
                state.columns?.[col]?.id ?? '',
              );
              if (isProtected || (config?.minColumns ?? 1) >= colCount) {
                if (isProtected) setToast('Колонку не можна видалити');
                setContextMenu(null);
                return;
              }
              setContextMenu(null);
              const needConfirm = config?.confirmDangerousOperations !== false;
              if (needConfirm) {
                setConfirmState({
                  type: 'column',
                  target: col,
                  title: 'Видалити колонку?',
                  message: `Видалити колонку "${getHeaderTitle(col)}"?`,
                  hasData: columnHasData(state, col),
                  hasFormulas: tableHasFormulas(state),
                });
              } else {
                onDeleteColumn(col);
              }
            }}
            disabled={
              contextMenu == null ||
              (config?.minColumns ?? 1) >= colCount ||
              (config?.protectedColumnIds ?? []).includes(state.columns?.[contextMenu.col]?.id ?? '')
            }
            title={
              (config?.protectedColumnIds ?? []).includes(state.columns?.[contextMenu?.col ?? 0]?.id ?? '')
                ? 'Колонку не можна видалити'
                : undefined
            }
          >
            Видалити колонку
          </MenuItem>
        )}
        {onDeleteColumnsBatch && contextMenu != null && (() => {
          const sc1 = state.selection.c1;
          const sc2 = state.selection.c2;
          const cMin = Math.min(sc1, sc2);
          const cMax = Math.max(sc1, sc2);
          const selectedCols = cMax > cMin
            ? Array.from({ length: cMax - cMin + 1 }, (_, i) => cMin + i)
            : [];
          const protectedIds = new Set(config?.protectedColumnIds ?? []);
          const hasProtected = selectedCols.some(
            (c) => protectedIds.has(state.columns?.[c]?.id ?? ''),
          );
          const canBulk = selectedCols.length > 1 &&
            state.colCount - selectedCols.length >= (config?.minColumns ?? 1);
          if (selectedCols.length <= 1) return null;
          return (
            <MenuItem
              disabled={hasProtected}
              title={hasProtected ? 'Серед вибраних є захищені колонки' : undefined}
              onClick={() => {
                if (contextMenu == null || hasProtected) return;
                const cols = selectedCols.filter(
                  (c) => !protectedIds.has(state.columns?.[c]?.id ?? ''),
                );
                if (cols.length === 0) return;
                setContextMenu(null);
                const needConfirm = config?.confirmDangerousOperations !== false;
                if (needConfirm) {
                  setConfirmState({
                    type: 'column',
                    target: -1,
                    batchCols: cols,
                    title: 'Видалити вибрані колонки?',
                    message: `Видалити ${cols.length} колонок?`,
                    hasData: columnsHaveData(state, cols),
                    hasFormulas: tableHasFormulas(state),
                  });
                } else {
                  setContextMenu(null);
                  onDeleteColumnsBatch(cols);
                }
              }}
            >
              Видалити вибрані колонки ({selectedCols.length})
            </MenuItem>
          );
        })()}
        {onRenameColumn && contextMenu != null && (
          <MenuItem
            onClick={() => {
              if (contextMenu != null) {
                setEditingHeaderCol(contextMenu.col);
                setHeaderEditValue(getHeaderTitle(contextMenu.col));
                setContextMenu(null);
              }
            }}
          >
            Перейменувати колонку
          </MenuItem>
        )}
        {onSetColumnFormula && contextMenu != null && (() => {
          const col = contextMenu.col;
          const colDef = state.columns?.[col];
          const t = colDef?.type ?? 'text';
          const canFormula = t === 'number' || t === 'uah' || t === 'percent';
          if (!canFormula) return null;
          return (
            <MenuItem
              onClick={() => {
                if (contextMenu == null) return;
                setFormulaDialog({
                  colIndex: col,
                  columnTitle: getHeaderTitle(col),
                  initialExpr: colDef?.computed?.expr ?? '',
                });
                setContextMenu(null);
              }}
            >
              Задати формулу колонки…
            </MenuItem>
          );
        })()}
        {onSortRows && contextMenu != null && !state.isEditing && [
          <Divider key="sort-div" />,
          <MenuItem
            key="sort-asc"
            onClick={() => {
              if (contextMenu != null) {
                onSortRows(contextMenu.col, 'asc');
                setContextMenu(null);
              }
            }}
          >
            Сортувати A→Z
          </MenuItem>,
          <MenuItem
            key="sort-desc"
            onClick={() => {
              if (contextMenu != null) {
                onSortRows(contextMenu.col, 'desc');
                setContextMenu(null);
              }
            }}
          >
            Сортувати Z→A
          </MenuItem>,
        ]}
        {onSetFiltersEnabled && onSetColumnFilter && contextMenu != null && !state.isEditing && [
          <Divider key="filter-div" />,
          <MenuItem
            key="filter-toggle"
            onClick={() => {
              onSetFiltersEnabled(!state.filtersEnabled);
              setContextMenu(null);
            }}
          >
            {state.filtersEnabled ? 'Вимкнути фільтр' : 'Увімкнути фільтр'}
          </MenuItem>,
          <MenuItem
            key="filter-config"
            onClick={() => {
              if (contextMenu != null) {
                const col = contextMenu.col;
                const colDef = state.columns?.[col];
                const colId = colDef?.id ?? `col_${col}`;
                setFilterDialog({
                  colIndex: col,
                  columnTitle: getHeaderTitle(col),
                  columnType: colDef?.type,
                  colId,
                  initialSpec: state.filters?.[colId] ?? null,
                });
                setContextMenu(null);
              }
            }}
          >
            Налаштувати фільтр колонки…
          </MenuItem>,
          <MenuItem
            key="filter-clear-col"
            onClick={() => {
              if (contextMenu != null) {
                const colDef = state.columns?.[contextMenu.col];
                const colId = colDef?.id ?? `col_${contextMenu.col}`;
                onSetColumnFilter(colId, null);
                setContextMenu(null);
              }
            }}
          >
            Очистити фільтр колонки
          </MenuItem>,
          ...(onClearAllFilters
            ? [
                <MenuItem
                  key="filter-clear-all"
                  onClick={() => {
                    onClearAllFilters();
                    setContextMenu(null);
                  }}
                >
                  Очистити всі фільтри
                </MenuItem>,
              ]
            : []),
        ]}
        {config?.allowCellComments && onSetCellComment && contextMenu != null && (
          <MenuItem
            onClick={() => {
              if (contextMenu != null) {
                const key = `${contextMenu.row}:${contextMenu.col}`;
                const text = state.cellComments?.[key] ?? '';
                setCommentDialog({ row: contextMenu.row, col: contextMenu.col, text });
                setContextMenu(null);
              }
            }}
          >
            Коментар
          </MenuItem>
        )}
        {onSetFreezeRows && onSetFreezeCols && contextMenu != null && !state.isEditing && [
          <Divider key="freeze-div" />,
          <MenuItem
            key="freeze-cols"
            onClick={() => {
              if (contextMenu != null) {
                onSetFreezeCols(contextMenu.col + 1);
                setContextMenu(null);
              }
            }}
          >
            Заморозити до цієї колонки
          </MenuItem>,
          <MenuItem
            key="unfreeze-cols"
            disabled={(state.freeze?.cols ?? 0) === 0}
            onClick={() => {
              onSetFreezeCols(0);
              setContextMenu(null);
            }}
          >
            Скасувати заморозку колонок
          </MenuItem>,
          <MenuItem
            key="freeze-rows"
            onClick={() => {
              if (contextMenu != null) {
                onSetFreezeRows(contextMenu.row + 1);
                setContextMenu(null);
              }
            }}
          >
            Заморозити до цього рядка
          </MenuItem>,
          <MenuItem
            key="unfreeze-rows"
            disabled={(state.freeze?.rows ?? 0) === 0}
            onClick={() => {
              onSetFreezeRows(0);
              setContextMenu(null);
            }}
          >
            Скасувати заморозку рядків
          </MenuItem>,
        ]}
        {(onInsertColumnAt || onDeleteColumn || onRenameColumn || onSetColumnFormula || onSortRows || onSetFreezeRows) &&
          (onInsertRowAbove || onInsertRowBelow || onDeleteRow) && <Divider />}
        {onInsertRowAbove && (
          <MenuItem
            onClick={() => {
              if (contextMenu != null) {
                onInsertRowAbove(contextMenu.row);
                setContextMenu(null);
              }
            }}
          >
            Додати рядок зверху
          </MenuItem>
        )}
        {onInsertRowBelow && (
          <MenuItem
            onClick={() => {
              if (contextMenu != null) {
                onInsertRowBelow(contextMenu.row);
                setContextMenu(null);
              }
            }}
          >
            Додати рядок знизу
          </MenuItem>
        )}
        {onDeleteRow && (
          <MenuItem
            onClick={() => {
              if (contextMenu == null) return;
              const row = contextMenu.row;
              const minRows = config?.minRows ?? 1;
              if (rowCount <= minRows) {
                setContextMenu(null);
                return;
              }
              setContextMenu(null);
              const needConfirm = config?.confirmDangerousOperations !== false;
              if (needConfirm) {
                setConfirmState({
                  type: 'row',
                  target: row,
                  title: 'Видалити рядок?',
                  message: `Видалити рядок ${row + 1}?`,
                  hasData: rowHasData(state, row),
                  hasFormulas: tableHasFormulas(state),
                });
              } else {
                onDeleteRow(row);
              }
            }}
            disabled={rowCount <= (config?.minRows ?? 1)}
          >
            Видалити рядок
          </MenuItem>
        )}
        {onDeleteRowsBatch && contextMenu != null && (() => {
          const sr1 = state.selection.r1;
          const sr2 = state.selection.r2;
          const rMin = Math.min(sr1, sr2);
          const rMax = Math.max(sr1, sr2);
          const selectedRows = rMax > rMin
            ? Array.from({ length: rMax - rMin + 1 }, (_, i) => rMin + i)
            : [];
          const minRows = config?.minRows ?? 1;
          const canBulk = selectedRows.length > 1 &&
            rowCount - selectedRows.length >= minRows;
          if (!canBulk) return null;
          return (
            <MenuItem
              onClick={() => {
                if (contextMenu == null) return;
                setContextMenu(null);
                const needConfirm = config?.confirmDangerousOperations !== false;
                if (needConfirm) {
                  setConfirmState({
                    type: 'row',
                    target: -1,
                    batchRows: selectedRows,
                    title: 'Видалити вибрані рядки?',
                    message: `Видалити ${selectedRows.length} рядків?`,
                    hasData: rowsHaveData(state, selectedRows),
                    hasFormulas: tableHasFormulas(state),
                  });
                } else {
                  onDeleteRowsBatch(selectedRows);
                }
              }}
            >
              Видалити вибрані рядки ({selectedRows.length})
            </MenuItem>
          );
        })()}
      </Menu>
      <ConfirmDialog
        open={confirmState != null}
        title={confirmState?.title ?? ''}
        message={confirmState?.message ?? ''}
        hasData={confirmState?.hasData}
        hasFormulas={confirmState?.hasFormulas}
        onConfirm={() => {
          if (confirmState != null) {
            if (confirmState.type === 'column') {
              if (confirmState.batchCols?.length) {
                onDeleteColumnsBatch?.(confirmState.batchCols);
              } else {
                onDeleteColumn?.(confirmState.target);
              }
            } else {
              if (confirmState.batchRows?.length) {
                onDeleteRowsBatch?.(confirmState.batchRows);
              } else {
                onDeleteRow?.(confirmState.target);
              }
            }
            setConfirmState(null);
          }
        }}
        onCancel={() => setConfirmState(null)}
      />
      <Snackbar
        open={toast != null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      {formulaDialog != null && (
        <ColumnFormulaDialog
          open
          columnTitle={formulaDialog.columnTitle}
          initialExpr={formulaDialog.initialExpr}
          validate={(expr) => {
            const r = validateExpr(expr, state.columns ?? []);
            return r.ok ? null : r.message;
          }}
          onSave={(nextExpr) => {
            const col = formulaDialog.colIndex;
            const prevExpr = state.columns?.[col]?.computed?.expr;
            onSetColumnFormula?.(col, prevExpr, nextExpr);
            setFormulaDialog(null);
          }}
          onCancel={() => setFormulaDialog(null)}
        />
      )}
      {filterDialog != null && (
        <ColumnFilterDialog
          open
          columnTitle={filterDialog.columnTitle}
          columnType={filterDialog.columnType}
          initialSpec={filterDialog.initialSpec}
          onSave={(spec) => {
            onSetColumnFilter?.(filterDialog.colId, spec);
            setFilterDialog(null);
          }}
          onCancel={() => setFilterDialog(null)}
        />
      )}
      {commentDialog != null && onSetCellComment && (
        <CommentDialog
          open
          row={commentDialog.row}
          col={commentDialog.col}
          initialText={commentDialog.text}
          onSave={(text) => {
            onSetCellComment(commentDialog.row, commentDialog.col, text);
            setCommentDialog(null);
          }}
          onCancel={() => setCommentDialog(null)}
        />
      )}
    </Box>
  );
};
