import { api } from '@/lib/api/client';
import type { ListEnvelope } from '@/lib/list/useInfiniteList';
import type { ProductDetail, VariantSearchItem } from '@/lib/api/types';

export const productsApi = {
  get: (id: string) => api.get<ProductDetail>(`/products/${id}`).then((r) => r.data),
  searchVariants: (q: string) =>
    api.get<ListEnvelope<VariantSearchItem>>('/variants', { params: { q, limit: 20 } }).then((r) => r.data),
};
