/**
 * Config types. Canonical sheet: src/sheet/**
 */

export type LocaleSettings = {
  decimalSeparator: ',' | '.';
  argSeparator: ';' | ',';
  thousandsSeparator?: ' ' | '\u00A0' | ',' | '.';
};

export const defaultLocale: LocaleSettings = {
  decimalSeparator: '.',
  argSeparator: ',',
};

/** UA locale for BUD Office */
export const uaLocale: LocaleSettings = {
  decimalSeparator: ',',
  argSeparator: ';',
  thousandsSeparator: ' ',
};

export type SheetConfig = {
  colCount: number;
  rowCount: number;
  colWidth?: number;
  rowHeight?: number;
  locale?: LocaleSettings;
};
