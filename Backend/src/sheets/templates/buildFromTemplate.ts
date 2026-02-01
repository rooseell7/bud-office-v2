/**
 * Build SheetSnapshot from template. Canonical templates for Quote/Act/Invoice.
 */

const TEMPLATE_VERSION = 1;

const UA_LOCALE = {
  decimalSeparator: ',' as const,
  argSeparator: ';' as const,
  thousandsSeparator: ' ' as const,
};

function generateRowId(): string {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildQuoteSnapshot(): Record<string, any> {
  const columns = [
    { id: 'col-0', title: '№', key: 'num', type: 'text' as const, editable: false },
    { id: 'col-1', title: 'Найменування', key: 'name', type: 'text' as const, wrap: true },
    { id: 'col-2', title: 'Од. вимір', key: 'unit', type: 'text' as const },
    { id: 'col-3', title: 'Кіл-ть', key: 'qty', type: 'number' as const },
    { id: 'col-4', title: 'Ціна зо од.', key: 'price', type: 'uah' as const },
    { id: 'col-5', title: 'Загальна', key: 'total', type: 'uah' as const, computed: { expr: '{qty} * {price}' }, editable: false },
    { id: 'col-6', title: 'Собівартість одиниці', key: 'costUnit', type: 'uah' as const },
    { id: 'col-7', title: 'Загалом собівартість', key: 'costTotal', type: 'uah' as const, computed: { expr: '{qty} * {costUnit}' }, editable: false },
  ];
  const colCount = columns.length;
  const rowCount = 101;
  const rawValues: string[][] = [];
  for (let r = 0; r < rowCount; r++) {
    rawValues[r] = Array(colCount).fill('');
  }
  rawValues[rowCount - 1][1] = 'Підсумок';
  rawValues[rowCount - 1][5] = '=SUM(F1:F99)';
  rawValues[rowCount - 1][7] = '=SUM(H1:H99)';
  const values = rawValues.map((row) => [...row]);
  const rowIds = Array.from({ length: rowCount }, () => generateRowId());
  const columnWidths: Record<number, number> = {};
  [360, 90, 90, 120, 130, 150, 160, 120].forEach((w, i) => (columnWidths[i] = w));
  return {
    values,
    rawValues,
    rowCount,
    colCount,
    columns,
    columnWidths,
    rowIds,
    locale: UA_LOCALE,
    freeze: { rows: 0, cols: 0 },
    templateVersion: TEMPLATE_VERSION,
  };
}

function buildActSnapshot(): Record<string, any> {
  return buildQuoteSnapshot();
}

function buildInvoiceSnapshot(): Record<string, any> {
  return buildQuoteSnapshot();
}

/** Роботи — шаблон для етапу КП */
function buildWorksSnapshot(): Record<string, any> {
  const columns = [
    { id: 'col-0', title: '№', key: 'num', type: 'text' as const, editable: false },
    { id: 'col-1', title: 'Найменування робіт', key: 'name', type: 'text' as const, wrap: true },
    { id: 'col-2', title: 'Од. вимір', key: 'unit', type: 'text' as const },
    { id: 'col-3', title: 'К-ть', key: 'qty', type: 'number' as const },
    { id: 'col-4', title: 'Ціна за од.', key: 'price', type: 'uah' as const },
    { id: 'col-5', title: 'Сума', key: 'total', type: 'uah' as const, computed: { expr: '{qty} * {price}' }, editable: false },
    { id: 'col-6', title: 'Собівартість одиниці', key: 'costUnit', type: 'uah' as const },
    { id: 'col-7', title: 'Загалом собівартість', key: 'costTotal', type: 'uah' as const, computed: { expr: '{qty} * {costUnit}' }, editable: false },
    { id: 'col-8', title: 'Примітки', key: 'note', type: 'text' as const },
  ];
  return buildSheetFromColumns(columns, 20, [48, 360, 90, 90, 120, 130, 120, 130, 180]);
}

/** Матеріали — шаблон для етапу КП */
function buildMaterialsSnapshot(): Record<string, any> {
  const columns = [
    { id: 'col-0', title: '№', key: 'num', type: 'text' as const, editable: false },
    { id: 'col-1', title: 'Найменування матеріалу', key: 'name', type: 'text' as const, wrap: true },
    { id: 'col-2', title: 'Од. вимір', key: 'unit', type: 'text' as const },
    { id: 'col-3', title: 'К-ть', key: 'qty', type: 'number' as const },
    { id: 'col-4', title: 'Ціна за од.', key: 'price', type: 'uah' as const },
    { id: 'col-5', title: 'Сума', key: 'total', type: 'uah' as const, computed: { expr: '{qty} * {price}' }, editable: false },
    { id: 'col-6', title: 'Собівартість', key: 'costUnit', type: 'uah' as const },
    { id: 'col-7', title: 'Сума собівартість', key: 'costTotal', type: 'uah' as const, computed: { expr: '{qty} * {costUnit}' }, editable: false },
    { id: 'col-8', title: 'Постачальник / Примітка', key: 'note', type: 'text' as const },
  ];
  return buildSheetFromColumns(columns, 20, [48, 360, 90, 90, 120, 130, 120, 130, 180]);
}

function buildSheetFromColumns(columns: any[], rowCount: number, widths?: number[]): Record<string, any> {
  const colCount = columns.length;
  const defaultWidths = [48, 360, 90, 90, 120, 130, 180];
  const widthArr = widths && widths.length >= colCount ? widths : defaultWidths.slice(0, colCount);
  const rawValues: string[][] = [];
  for (let r = 0; r < rowCount; r++) {
    rawValues[r] = Array(colCount).fill('');
  }
  const values = rawValues.map((row) => [...row]);
  const rowIds = Array.from({ length: rowCount }, () => generateRowId());
  const columnWidths: Record<number, number> = {};
  widthArr.forEach((w, i) => (columnWidths[i] = w));
  return {
    values,
    rawValues,
    rowCount,
    colCount,
    columns,
    columnWidths,
    rowIds,
    locale: UA_LOCALE,
    freeze: { rows: 0, cols: 0 },
    templateVersion: TEMPLATE_VERSION,
  };
}

const BUILDERS: Record<string, () => Record<string, any>> = {
  quote: buildQuoteSnapshot,
  act: buildActSnapshot,
  invoice: buildInvoiceSnapshot,
  'quote-works': buildWorksSnapshot,
  'quote-materials': buildMaterialsSnapshot,
};

export function buildFromTemplate(templateId: string): Record<string, any> {
  const id = String(templateId || 'quote').toLowerCase();
  const fn = BUILDERS[id];
  if (!fn) throw new Error(`Unknown template: ${templateId}`);
  return fn();
}

export function listTemplates(): { id: string; name: string }[] {
  return [
    { id: 'quote', name: 'Комерційна пропозиція (КП)' },
    { id: 'act', name: 'Акт виконаних робіт' },
    { id: 'invoice', name: 'Накладна' },
  ];
}
