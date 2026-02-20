/**
 * Thin re-export: canonical invoices API is Frontend/src/modules/invoices/api/invoices.api.ts
 */
export type InvoiceItem = {
  materialId?: number;
  materialName?: string;
  unit?: string;
  qty?: number | string;
  supplierPrice?: number | string;
  clientPrice?: number | string;
};

export {
  listInvoices as getInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  downloadInvoicePdf,
} from '../modules/invoices/api/invoices.api';

export type { Invoice } from '../modules/invoices/api/invoices.api';
