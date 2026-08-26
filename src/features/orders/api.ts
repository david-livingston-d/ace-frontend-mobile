import { api } from '@/lib/api/client';
import type { ListEnvelope } from '@/lib/list/useInfiniteList';
import type {
  SalesOrderListItem,
  SalesOrderDetail,
  SalesOrderIn,
  SalesOrderPatch,
  SalesOrderCancelIn,
  TimelineOut,
} from './types';

// Only `list` (this task's register) and `get` (a detail-view prerequisite) are
// consumed here — `create`/`update`/`verify`/`cancel`/`timeline`/`pdf` are declared
// now, against the generated schema types, so Tasks 2/5 (order detail, creation,
// verification, cancellation) don't need to touch this module again.
export const ordersApi = {
  list: (params: Record<string, unknown>) =>
    api.get<ListEnvelope<SalesOrderListItem>>('/sales-orders', { params }).then((r) => r.data),
  get: (id: string) => api.get<SalesOrderDetail>(`/sales-orders/${id}`).then((r) => r.data),
  timeline: (id: string) => api.get<TimelineOut>(`/sales-orders/${id}/timeline`).then((r) => r.data),
  create: (body: SalesOrderIn) => api.post<SalesOrderDetail>('/sales-orders', body).then((r) => r.data),
  update: (id: string, body: SalesOrderPatch) => api.patch<SalesOrderDetail>(`/sales-orders/${id}`, body).then((r) => r.data),
  verify: (id: string) => api.post<SalesOrderDetail>(`/sales-orders/${id}/verify`).then((r) => r.data),
  cancel: (id: string, body: SalesOrderCancelIn) => api.post<SalesOrderDetail>(`/sales-orders/${id}/cancel`, body).then((r) => r.data),
  pdf: (id: string, regenerate?: boolean) =>
    api.get<unknown>(`/sales-orders/${id}/pdf`, { params: regenerate ? { regenerate: 1 } : {} }).then((r) => r.data),
};
