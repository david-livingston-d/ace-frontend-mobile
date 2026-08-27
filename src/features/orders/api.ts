import { api } from '@/lib/api/client';
import { downloadAuthedPdf } from '@/native/pdf';
import type { ListEnvelope } from '@/lib/list/useInfiniteList';
import type {
  SalesOrderListItem,
  SalesOrderDetail,
  SalesOrderIn,
  SalesOrderPatch,
  SalesOrderCancelIn,
  TimelineOut,
} from './types';

// `create`/`update` are declared against the generated schema types now, so
// Task 5 (order creation/editing) doesn't need to touch this module again.
export const ordersApi = {
  list: (params: Record<string, unknown>) =>
    api.get<ListEnvelope<SalesOrderListItem>>('/sales-orders', { params }).then((r) => r.data),
  get: (id: string) => api.get<SalesOrderDetail>(`/sales-orders/${id}`).then((r) => r.data),
  timeline: (id: string) => api.get<TimelineOut>(`/sales-orders/${id}/timeline`).then((r) => r.data),
  create: (body: SalesOrderIn) => api.post<SalesOrderDetail>('/sales-orders', body).then((r) => r.data),
  update: (id: string, body: SalesOrderPatch) => api.patch<SalesOrderDetail>(`/sales-orders/${id}`, body).then((r) => r.data),
  verify: (id: string) => api.post<SalesOrderDetail>(`/sales-orders/${id}/verify`).then((r) => r.data),
  cancel: (id: string, body: SalesOrderCancelIn) => api.post<SalesOrderDetail>(`/sales-orders/${id}/cancel`, body).then((r) => r.data),
  pdf: (id: string, number: string) => downloadAuthedPdf({ path: `/sales-orders/${id}/pdf`, fileName: `${number}.pdf` }),
};
