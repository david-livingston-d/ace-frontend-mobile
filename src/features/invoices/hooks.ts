import { useQuery } from '@tanstack/react-query';
import { keys } from '@/lib/query/keys';
import { invoicesApi } from './api';

// Not consumed by any screen in M2 (InvoiceDetail is still a placeholder) —
// declared now so M3's real screen doesn't need to touch this module.
export function useInvoice(id: string) {
  return useQuery({ queryKey: keys.invoice(id), queryFn: () => invoicesApi.get(id) });
}
