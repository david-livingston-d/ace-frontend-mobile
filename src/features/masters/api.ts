import { api } from '@/lib/api/client';
import type { ListEnvelope } from '@/lib/list/useInfiniteList';
import type { CustomerTypeOut, PaymentTermOut, CategoryOut } from '@/lib/api/types';

export const mastersApi = {
  customerTypes: () => api.get<ListEnvelope<CustomerTypeOut>>('/customer-types').then((r) => r.data),
  paymentTerms: () => api.get<ListEnvelope<PaymentTermOut>>('/payment-terms').then((r) => r.data),
  categories: () => api.get<ListEnvelope<CategoryOut>>('/categories').then((r) => r.data),
};
