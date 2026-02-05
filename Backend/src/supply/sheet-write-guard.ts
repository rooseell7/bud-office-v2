/**
 * HARD RULE: Supply module MUST NOT perform any write operations on Sheet/Quotes.
 * Only READ is allowed. Use QuoteReadService for quote data.
 * If any code in supply attempts to call sheet save/applyOp/documents.update/quotes.update
 * it must throw with this message (or be absent from the codebase).
 */
export const SHEET_WRITE_FORBIDDEN_FROM_SUPPLY = 'SHEET_WRITE_FORBIDDEN_FROM_SUPPLY';

export function assertNoSheetWriteFromSupply(): void {
  throw new Error(SHEET_WRITE_FORBIDDEN_FROM_SUPPLY);
}
