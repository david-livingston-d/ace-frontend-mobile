import { api } from '@/lib/api/client';
import type { ListEnvelope } from '@/lib/list/useInfiniteList';
import type {
  AllocationsIn,
  PaymentDetail,
  PaymentIn,
  PaymentListItem,
  PaymentMode,
  ReceivablesOut,
  SuggestAllocation,
} from './types';

export const paymentsApi = {
  create: (body: PaymentIn) => api.post<PaymentDetail>('/payments', body).then((r) => r.data),
  get: (id: string) => api.get<PaymentDetail>(`/payments/${id}`).then((r) => r.data),
  submit: (id: string) => api.post<PaymentDetail>(`/payments/${id}/submit`).then((r) => r.data),
  cancel: (id: string, reason: string) =>
    api.post<PaymentDetail>(`/payments/${id}/cancel`, { reason }).then((r) => r.data),
  suggest: (id: string) =>
    api.get<SuggestAllocation>(`/payments/${id}/suggest-allocation`).then((r) => r.data),
  setAllocations: (id: string, body: AllocationsIn) =>
    api.put<PaymentDetail>(`/payments/${id}/allocations`, body).then((r) => r.data),
  list: (params: Record<string, unknown>) =>
    api.get<ListEnvelope<PaymentListItem>>('/payments', { params }).then((r) => r.data),
  // Not a `ListEnvelope`: `/receivables` also returns `total_outstanding`
  // (the register footer's figure over the *whole* filtered set, not just the
  // page), which is why this doesn't reuse the shared envelope type.
  receivables: (params: Record<string, unknown>) =>
    api.get<ReceivablesOut>('/receivables', { params }).then((r) => r.data),
  modes: () => api.get<ListEnvelope<PaymentMode>>('/payment-modes').then((r) => r.data),
};
