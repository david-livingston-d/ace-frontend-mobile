import { useQuery } from '@tanstack/react-query';
import { keys } from '@/lib/query/keys';
import { invoicesApi } from './api';

/**
 * One invoice's detail. `enabled` is the caller's because the allocation
 * screen only needs it in the *miss* case — when the FIFO suggestion left out
 * the invoice the rep tapped "Pay" on and its real `outstanding` has to come
 * from somewhere (the order detail's `invoices[]` carries `net`, not what is
 * still owed).
 */
export function useInvoice(id: string, enabled = true) {
  return useQuery({ queryKey: keys.invoice(id), queryFn: () => invoicesApi.get(id), enabled: enabled && !!id });
}
