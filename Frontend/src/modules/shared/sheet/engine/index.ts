// FILE: src/modules/shared/sheet/engine/index.ts

export type { SheetRange } from './types';
export { clamp, normalizeRange, isInRange } from './range';
export { forEachCellInRange } from './iterate';
export {
  matrixToTsv,
  rangeToMatrix,
  copyRangeToClipboard,
  applyTsvPasteToRows,
  type PasteEnsureRowAt,
  type ApplyPasteOptions,
} from './clipboard';
export { handleSheetsGridKeyDown, type SheetCell, type SheetsGridKeyDownDeps } from './keyboard';
export { useSheetSelection, makeSingleRange, type SheetAnchor, type UseSheetSelectionOptions } from './selection';
