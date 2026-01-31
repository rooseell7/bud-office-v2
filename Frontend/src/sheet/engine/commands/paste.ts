/**
 * Paste command. Canonical sheet: src/sheet/**
 */

import type { SheetCommand } from './types';
import type { SheetState } from '../state';
import { cellKey } from '../state';
import { createApplyValuesCommand } from './applyValues';
import { createApplyStylesCommand } from './applyStyles';
import { shiftFormulaRefsForPaste } from '../formulas/shiftRefs';
import { isFormula } from '../formulas/parse';
import { normalizePastedCell } from '../clipboard/normalizeCellText';
import { validateCellByColumnType } from '../locale/validateCell';

function composeCommands(first: SheetCommand, second: SheetCommand): SheetCommand {
  return {
    do(state) {
      return second.do(first.do(state));
    },
    undo(state) {
      return first.undo(second.undo(state));
    },
  };
}

export function createPasteCommand(
  state: SheetState,
  startRow: number,
  startCol: number,
  matrix: string[][],
): SheetCommand {
  const { rawValues, rowCount, colCount, cellStyles, locale, columns } = state;
  const valueChanges: { row: number; col: number; prev: string; next: string; nextError?: import('../types').CellError | null }[] = [];
  const styleChanges: { key: string; row: number; col: number; prev: Record<string, unknown>; next: Record<string, unknown> }[] = [];

  for (let ri = 0; ri < matrix.length; ri++) {
    const r = startRow + ri;
    if (r >= rowCount) break;
    const row = matrix[ri];
    for (let ci = 0; ci < (row?.length ?? 0); ci++) {
      const c = startCol + ci;
      if (c >= colCount) break;
      if (columns?.[c]?.computed) continue;
      const prev = rawValues[r]?.[c] ?? '';
      const cellText = row?.[ci] ?? '';
      const norm = normalizePastedCell(cellText, locale);
      let next = norm.raw;
      if (next && isFormula(next)) {
        next = shiftFormulaRefsForPaste(next, startRow, startCol);
      }
      const colDef = columns?.[c];
      const { error } = validateCellByColumnType(next, colDef?.type, locale);
      valueChanges.push({ row: r, col: c, prev, next, nextError: error ?? null });

      if (norm.suggestedType && norm.suggestedType !== 'text') {
        const key = cellKey(r, c);
        const prevStyle = cellStyles[key] ?? {};
        const hasFormat = prevStyle.numberFormat != null && prevStyle.numberFormat !== 'plain';
        if (!hasFormat) {
          const nextStyle = { ...prevStyle, numberFormat: norm.suggestedType };
          styleChanges.push({
            key,
            row: r,
            col: c,
            prev: { ...prevStyle },
            next: nextStyle,
          });
        }
      }
    }
  }

  const valuesCmd = createApplyValuesCommand(valueChanges);
  if (styleChanges.length === 0) return valuesCmd;
  const stylesCmd = createApplyStylesCommand(styleChanges as any);
  return composeCommands(valuesCmd, stylesCmd);
}
