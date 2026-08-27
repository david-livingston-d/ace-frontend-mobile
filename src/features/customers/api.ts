import { api } from '@/lib/api/client';
import type { ListEnvelope } from '@/lib/list/useInfiniteList';
import type {
  CustomerOut,
  CustomerDetailOut,
  CustomerIn,
  CustomerFinancialSummary,
  DuplicateCheckIn,
  DuplicateCheckOut,
} from './types';

export const customersApi = {
  list: (params: Record<string, unknown>) =>
    api.get<ListEnvelope<CustomerOut>>('/customers', { params }).then((r) => r.data),
  get: (id: string) => api.get<CustomerDetailOut>(`/customers/${id}`).then((r) => r.data),
  financialSummary: (id: string) =>
    api.get<CustomerFinancialSummary>(`/customers/${id}/financial-summary`).then((r) => r.data),
  duplicateCheck: (body: DuplicateCheckIn) =>
    api.post<DuplicateCheckOut>('/customers/duplicate-check', body).then((r) => r.data),
  create: (body: CustomerIn) => api.post<CustomerOut>('/customers', body).then((r) => r.data),
};
