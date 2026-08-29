import { api } from '@/lib/api/client';
import { downloadAuthedPdf } from '@/native/pdf';
import type { InvoiceDetail, InvoiceIn, InvoiceableOut } from './types';

/**
 * PRD §21's billing surface. Invoicing is **whole-DN**: the only thing the
 * client chooses is *which delivered notes* go on the invoice (`dn_ids`) —
 * never a quantity — so there is no line payload here at all.
 */
export const invoicesApi = {
  get: (id: string) => api.get<InvoiceDetail>(`/invoices/${id}`).then((r) => r.data),
  /** This order's delivered notes that no live (draft/submitted) invoice claims. */
  invoiceable: (soId: string) =>
    api.get<InvoiceableOut>(`/sales-orders/${soId}/invoiceable`).then((r) => r.data),
  create: (soId: string, body: InvoiceIn) =>
    api.post<InvoiceDetail>(`/sales-orders/${soId}/invoices`, body).then((r) => r.data),
  submit: (id: string) => api.post<InvoiceDetail>(`/invoices/${id}/submit`).then((r) => r.data),
  cancel: (id: string, reason: string) =>
    api.post<InvoiceDetail>(`/invoices/${id}/cancel`, { reason }).then((r) => r.data),
  pdf: (id: string, number: string | null) =>
    downloadAuthedPdf({ path: `/invoices/${id}/pdf`, fileName: `${number ?? 'invoice-draft'}.pdf` }),
};
