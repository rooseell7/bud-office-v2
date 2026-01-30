/**
 * Canonical sheet module. Table logic: src/sheet/** only.
 */

export { Sheet } from './ui/Sheet';
export { Grid } from './ui/Grid';
export { Cell } from './ui/Cell';

export type { CellCoord, SelectionRange, SheetSnapshot, CellStyle } from './engine/types';
export type { SheetState } from './engine/state';
export type { SheetConfig, LocaleSettings } from './configs/types';
export { defaultLocale, uaLocale } from './configs/types';
export {
  quoteSheetConfig,
  invoiceSheetConfig,
  actSheetConfig,
} from './configs/presets';
export type { SheetAdapter } from './adapters/types';

export { useSheetController } from './hooks/useSheetController';
export { colToLetter } from './utils';
export { draftKey, loadDraft, saveDraft, clearDraft } from './adapters/localDraftAdapter';
export { createDocumentsAdapter } from './adapters/documentsAdapter';
export { useDocumentsAdapter } from './hooks/useDocumentsAdapter';
