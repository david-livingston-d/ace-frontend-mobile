import { api } from '@/lib/api/client';
import { downloadAuthedPdf } from '@/native/pdf';
import type { InvoiceDetail } from '@/lib/api/types';

// `get` is a placeholder for M3's real invoice detail screen — this task only
// consumes `pdf` (the order detail's per-invoice PDF download).
export const invoicesApi = {
  get: (id: string) => api.get<InvoiceDetail>(`/invoices/${id}`).then((r) => r.data),
  pdf: (id: string, number: string | null) =>
    downloadAuthedPdf({ path: `/invoices/${id}/pdf`, fileName: `${number ?? 'invoice-draft'}.pdf` }),
};
