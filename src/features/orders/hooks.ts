import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useInfiniteList } from '@/lib/list/useInfiniteList';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { keys } from '@/lib/query/keys';
import { invalidateMoneySideEffects } from '@/lib/query/invalidate';
import { useCustomer } from '@/features/customers/hooks';
import { useDraftStore } from './store/draft';
import { ordersApi } from './api';
import { filtersToParams, type OrderFilters } from './filters';
import type { SalesOrderListItem, SalesOrderDetail, SalesOrderIn, SalesOrderPatch } from './types';

/** The register's search box debounces before it becomes a request — every
 * keystroke would otherwise fire its own `/sales-orders?q=...` call. */
export function useOrders(filters: OrderFilters) {
  const debouncedQ = useDebouncedValue(filters.q, 300);
  const params = useMemo(
    () => filtersToParams({ ...filters, q: debouncedQ }),
    [filters, debouncedQ],
  );
  return useInfiniteList<SalesOrderListItem>({ path: '/sales-orders', params });
}

/** `enabled` lets a caller hold the request back while it has no id yet — the
 * wizard mounts before it knows whether it is editing anything. */
export function useOrder(id: string, enabled = true) {
  return useQuery({ queryKey: keys.order(id), queryFn: () => ordersApi.get(id), enabled: enabled && !!id });
}

export function useOrderTimeline(id: string) {
  return useQuery({ queryKey: keys.orderTimeline(id), queryFn: () => ordersApi.timeline(id) });
}

/** Every order-detail mutation (verify, cancel, and M3/M5's onward) reshapes
 * the same *other* places: the register list the order appears in, Home's
 * dashboard tiles, and its own timeline. Delegates to the slice-wide
 * `invalidateMoneySideEffects` (`src/lib/query/invalidate.ts`) — see that
 * function's own comment for why `keys.order(id)` itself is deliberately
 * never invalidated here; the caller seeds that cache directly with the full
 * detail the mutation already got back (see `useVerifyOrder`/`useCancelOrder`). */
function invalidateOrderSideEffects(qc: QueryClient, id: string) {
  invalidateMoneySideEffects(qc, { orderId: id });
}

export function useVerifyOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ordersApi.verify(id),
    onSuccess: (data, id) => {
      qc.setQueryData<SalesOrderDetail>(keys.order(id), data);
      invalidateOrderSideEffects(qc, id);
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => ordersApi.cancel(id, { reason }),
    onSuccess: (data, vars) => {
      qc.setQueryData<SalesOrderDetail>(keys.order(vars.id), data);
      invalidateOrderSideEffects(qc, vars.id);
    },
  });
}

/** Everything a freshly created or re-saved order changes elsewhere. Unlike
 * `invalidateOrderSideEffects` this *seeds* `keys.order(id)` from the response
 * the mutation already holds, so the success screen's "View order" opens a
 * detail page that is already populated rather than spinning. */
function afterSave(qc: QueryClient, order: SalesOrderDetail) {
  qc.setQueryData<SalesOrderDetail>(keys.order(order.id), order);
  invalidateOrderSideEffects(qc, order.id);
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SalesOrderIn) => ordersApi.create(body),
    onSuccess: (order) => afterSave(qc, order),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SalesOrderPatch }) => ordersApi.update(id, body),
    onSuccess: (order) => afterSave(qc, order),
  });
}

/**
 * Loads a customer's full record (addresses, payment terms) into the order
 * draft. The register row a user taps carries neither, and the wizard's
 * address picker and payment-terms select both need them — so every route into
 * the wizard that names a customer (`customerId`, `pickedCustomerId`, the
 * customer step's own pick, an edited order's snapshot) funnels through here.
 *
 * `setCustomer` is deliberately idempotent for the same id (see the store), so
 * re-seeding never clobbers an address the user has since chosen.
 */
export function useSeedCustomer(customerId: string | null) {
  const setCustomer = useDraftStore((s) => s.setCustomer);
  const { data, isPending, isError, refetch } = useCustomer(customerId ?? '', !!customerId);

  useEffect(() => {
    if (!data) return;
    setCustomer({
      id: data.id,
      name: data.name,
      code: data.code,
      addresses: data.addresses,
      paymentTermsId: data.payment_terms_id,
    });
  }, [data, setCustomer]);

  return { isPending: !!customerId && isPending, isError, refetch };
}
