import { api } from '@/lib/api/client';
import { downloadAuthedPdf } from '@/native/pdf';
import type { ListEnvelope } from '@/lib/list/useInfiniteList';
import type { DeliverableOut, DeliveryNoteDetail, DeliveryNoteIn, DeliveryNoteSummary, MarkDeliveredIn } from './types';

export const deliveryApi = {
  deliverable: (soId: string) => api.get<DeliverableOut>(`/sales-orders/${soId}/deliverable`).then((r) => r.data),
  create: (soId: string, body: DeliveryNoteIn) =>
    api.post<DeliveryNoteDetail>(`/sales-orders/${soId}/delivery-notes`, body).then((r) => r.data),
  submit: (id: string) => api.post<DeliveryNoteDetail>(`/delivery-notes/${id}/submit`).then((r) => r.data),
  markDelivered: (id: string, body: MarkDeliveredIn) =>
    api.post<DeliveryNoteDetail>(`/delivery-notes/${id}/mark-delivered`, body).then((r) => r.data),
  get: (id: string) => api.get<DeliveryNoteDetail>(`/delivery-notes/${id}`).then((r) => r.data),
  list: (params: Record<string, unknown>) =>
    api.get<ListEnvelope<DeliveryNoteSummary>>('/delivery-notes', { params }).then((r) => r.data),
  pdf: (id: string, number: string) =>
    downloadAuthedPdf({ path: `/delivery-notes/${id}/pdf`, fileName: `${number}.pdf` }),
};
