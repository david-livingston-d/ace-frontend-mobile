import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { keys } from '@/lib/query/keys';
import { invalidateMoneySideEffects } from '@/lib/query/invalidate';
import { deliveryApi } from './api';
import type { DeliveryNoteDetail, DeliveryNoteIn, MarkDeliveredIn } from './types';

export function useDeliverable(soId: string) {
  return useQuery({
    queryKey: keys.deliverable(soId),
    queryFn: () => deliveryApi.deliverable(soId),
    enabled: !!soId,
  });
}

export function useDeliveryNote(id: string) {
  return useQuery({ queryKey: keys.deliveryNote(id), queryFn: () => deliveryApi.get(id), enabled: !!id });
}

/**
 * Every create/submit/mark-delivered response seeds its own detail cache (so
 * the screen that just called it never re-spins waiting on a refetch) and
 * reshapes the same *other* places a delivery touches: the order's own
 * `deliverable` list (eligibility just changed) and everything
 * `invalidateMoneySideEffects` already covers for a money-adjacent mutation
 * (the order register, dashboard, timeline, receivables/payments lists).
 */
function afterDeliveryMutation(qc: QueryClient, dn: DeliveryNoteDetail) {
  qc.setQueryData<DeliveryNoteDetail>(keys.deliveryNote(dn.id), dn);
  qc.invalidateQueries({ queryKey: keys.deliverable(dn.so_id) });
  // A delivery response doesn't carry the full order detail, so invalidate it
  // so screens display refreshed order data (delivery counts, order status).
  qc.invalidateQueries({ queryKey: keys.order(dn.so_id) });
  invalidateMoneySideEffects(qc, { orderId: dn.so_id });
}

export function useCreateDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ soId, body }: { soId: string; body: DeliveryNoteIn }) => deliveryApi.create(soId, body),
    onSuccess: (dn) => afterDeliveryMutation(qc, dn),
  });
}

export function useSubmitDeliveryNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deliveryApi.submit(id),
    onSuccess: (dn) => afterDeliveryMutation(qc, dn),
  });
}

export function useMarkDelivered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: MarkDeliveredIn }) => deliveryApi.markDelivered(id, body),
    onSuccess: (dn) => afterDeliveryMutation(qc, dn),
  });
}
