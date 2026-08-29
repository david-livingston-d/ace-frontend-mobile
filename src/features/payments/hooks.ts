import { useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { keys } from '@/lib/query/keys';
import { invalidateMoneySideEffects } from '@/lib/query/invalidate';
import { usePermission } from '@/lib/permissions';
import { useInfiniteList } from '@/lib/list/useInfiniteList';
import { paymentsApi } from './api';
import type { AllocationsIn, PaymentDetail, PaymentIn, PaymentListItem, ReceivablesOut } from './types';

// Payment modes are a lookup list that changes about as often as customer
// types do — same 10-minute `staleTime` as `features/masters/hooks.ts`, and
// the same `keys.masters(...)` key space, so this is one cached list across
// every screen that offers a mode.
const MODES_STALE_TIME = 10 * 60_000;

/** `payment_modes.read` is a permission of its own (`company/router.py`), so
 * a viewer without it never even fires the request — same shape as
 * `usePaymentTerms`. */
export function usePaymentModes() {
  const enabled = usePermission('payment_modes.read');
  return useQuery({
    queryKey: keys.masters('payment-modes'),
    queryFn: () => paymentsApi.modes().then((r) => r.items),
    enabled,
    staleTime: MODES_STALE_TIME,
  });
}

export function usePayment(id: string, enabled = true) {
  return useQuery({ queryKey: keys.payment(id), queryFn: () => paymentsApi.get(id), enabled: enabled && !!id });
}

/**
 * The FIFO proposal for a *submitted* payment. `enabled` is the caller's, not
 * a default: the server answers `not_submitted` (422) for a draft, so the
 * allocation screen holds the request until it knows the payment's real
 * status rather than firing a request it knows will fail.
 */
export function useSuggestAllocation(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...keys.payment(id), 'suggest-allocation'] as const,
    queryFn: () => paymentsApi.suggest(id),
    enabled: enabled && !!id,
    // The suggestion is a snapshot of what is owed *now*; re-reading a cached
    // one after the payment has moved would propose stale amounts.
    staleTime: 0,
    gcTime: 0,
  });
}

/**
 * Every payment mutation's response is the *whole* `PaymentDetailOut` — so it
 * seeds its own detail cache (warnings included, which a later plain `GET`
 * would drop) and reshapes everything else the money touched.
 *
 * `invalidateMoneySideEffects` deliberately leaves `keys.order(id)` alone —
 * see its own comment: it is written for mutations whose response *is* the
 * order. A payment's isn't, so the order detail behind it (its
 * `payment_status`, `summary.paid_amount`, `summary.receivable`, and its
 * `payments` list) has to be invalidated explicitly here, exactly as
 * `delivery/hooks.ts`'s `afterDeliveryMutation` does.
 */
function afterPaymentMutation(qc: QueryClient, payment: PaymentDetail) {
  qc.setQueryData<PaymentDetail>(keys.payment(payment.id), payment);
  // Every order this payment touches: the one it is tagged to, plus every
  // order behind an invoice it settles (a payment may legitimately settle
  // another order's invoice — the server's own `different_order` warning).
  const orderIds = new Set<string>();
  if (payment.sales_order_id) orderIds.add(payment.sales_order_id);
  for (const allocation of payment.allocations) orderIds.add(allocation.so_id);
  for (const orderId of orderIds) qc.invalidateQueries({ queryKey: keys.order(orderId) });
  // Every invoice this payment settles: its `paid_amount`/`outstanding` moved,
  // and this response is not the invoice, so nothing else refreshes it.
  for (const allocation of payment.allocations) {
    qc.invalidateQueries({ queryKey: keys.invoice(allocation.invoice_id) });
  }

  // Deliberately *without* `paymentId`: that argument invalidates
  // `keys.payment(id)`, which is the very cache line seeded two lines above.
  // Doing both would fire a refetch that replaces the mutation's own response
  // with a plain `GET` — and a plain `GET` never echoes the `warnings` the
  // allocation just produced (`different_order`), so they would vanish the
  // instant they were saved. It is there for *other* mutations that touch a
  // payment they did not return; this one returns it.
  invalidateMoneySideEffects(qc, { orderId: payment.sales_order_id, customerId: payment.customer_id });
  // The suggestion is derived from what this payment has already settled, so
  // it is stale the moment any of these land.
  qc.invalidateQueries({ queryKey: [...keys.payment(payment.id), 'suggest-allocation'] });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PaymentIn) => paymentsApi.create(body),
    onSuccess: (payment) => afterPaymentMutation(qc, payment),
  });
}

export function useSubmitPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentsApi.submit(id),
    onSuccess: (payment) => afterPaymentMutation(qc, payment),
  });
}

export function useSetAllocations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AllocationsIn }) => paymentsApi.setAllocations(id, body),
    onSuccess: (payment) => afterPaymentMutation(qc, payment),
  });
}

export function useCancelPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => paymentsApi.cancel(id, reason),
    onSuccess: (payment) => afterPaymentMutation(qc, payment),
  });
}

/** The payments register (M3 Task 4's History view, and the customer detail
 * page's own Payments tab), paged and deduped by `useInfiniteList` — its
 * `['list', '/payments', ...]` key is exactly what `invalidateMoneySideEffects`'
 * prefix invalidation targets, so a payment mutation elsewhere still refreshes
 * whatever variant of this register is on screen. */
export function usePayments(params: Record<string, unknown>, limit = 20, enabled = true) {
  return useInfiniteList<PaymentListItem>({ path: '/payments', params, limit, enabled });
}

/**
 * The receivables register. Not built on `useInfiniteList` for two reasons:
 * its rows are keyed by `invoice_id` (there is no `id` field to dedupe on),
 * and its envelope carries `total_outstanding` over the whole filtered set,
 * which the shared `{items,total}` envelope has no room for. `refresh`
 * mirrors `useInfiniteList`'s own — pull-to-refresh re-asks only for the
 * first page rather than replaying every "load more" already fetched.
 */
export function useReceivables(params: Record<string, unknown>, limit = 50, enabled = true) {
  const qc = useQueryClient();
  const queryKey = ['list', '/receivables', params, limit] as const;
  const query = useInfiniteQuery({
    queryKey,
    enabled,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => paymentsApi.receivables({ ...params, limit, offset: pageParam }),
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, page) => n + page.items.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
  });
  const pages: ReceivablesOut[] = query.data?.pages ?? [];

  const refresh = useCallback(() => {
    qc.setQueryData<InfiniteData<ReceivablesOut, number>>(queryKey, (data) =>
      data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data,
    );
    return query.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, JSON.stringify(params), limit]);

  return {
    ...query,
    items: pages.flatMap((page) => page.items),
    total: pages[0]?.total ?? 0,
    totalOutstanding: pages[0]?.total_outstanding ?? '0.00',
    isPending: query.isPending && !query.data,
    refresh,
  };
}
