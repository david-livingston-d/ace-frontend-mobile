import { api } from '@/lib/api/client';
import { downloadAuthedPdf } from '@/native/pdf';
import type { DeliveryNoteDetail } from '@/lib/api/types';

// Read-only for M2 (`get`/`pdf`) — DN creation/dispatch/cancel writes land in M3.
export const deliveryApi = {
  get: (id: string) => api.get<DeliveryNoteDetail>(`/delivery-notes/${id}`).then((r) => r.data),
  pdf: (id: string, number: string) =>
    downloadAuthedPdf({ path: `/delivery-notes/${id}/pdf`, fileName: `${number}.pdf` }),
};
