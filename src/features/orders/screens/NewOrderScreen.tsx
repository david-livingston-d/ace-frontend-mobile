import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRoute, type RouteProp } from '@react-navigation/native';
import { Screen, ErrorState, Skeleton } from '@/ui';
import { getErrorMessage } from '@/lib/api/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useDraftStore } from '../store/draft';
import { useOrder, useSeedCustomer } from '../hooks';
import { WizardNavigator } from './wizard/WizardNavigator';
import { WizardEntryContext, type WizardEntry } from './wizard/context';

/**
 * The root `NewOrder` route: resolves however the wizard was entered, then
 * hands off to the nested step stack.
 *
 * Three entrances, all of which have to end with the draft store holding a
 * customer before any step can do anything useful:
 *  - `customerId` — from a customer's detail page ("New order for them"):
 *    seeds the customer and stays on step 1 so the rep can still change it.
 *  - `pickedCustomerId` — the customer search/create screens land back here
 *    with their result: seeds and forwards to products.
 *  - `editOrderId` — order detail's Edit action: rebuilds the whole draft from
 *    the saved order and forwards to the cart.
 *
 * Both seeding paths are idempotent, and `hydrateFromOrder` keeps an
 * already-loaded customer record, so the two requests may land in either order.
 */
export function NewOrderScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'NewOrder'>>();
  const { customerId, editOrderId, pickedCustomerId } = route.params ?? {};
  const fresh = !customerId && !editOrderId && !pickedCustomerId;

  const hydrateFromOrder = useDraftStore((s) => s.hydrateFromOrder);
  const reset = useDraftStore((s) => s.reset);
  const draftCustomerId = useDraftStore((s) => s.customer?.id ?? null);
  const draftEditOrderId = useDraftStore((s) => s.editOrderId);

  const order = useOrder(editOrderId ?? '', !!editOrderId);

  // Once per order, tracked here rather than off the store's own
  // `editOrderId`: a successful save `reset()`s the draft, which would
  // otherwise read as "this order isn't loaded yet" and immediately re-hydrate
  // the draft the user just finished with.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!editOrderId || !order.data || hydratedFor.current === editOrderId) return;
    hydratedFor.current = editOrderId;
    hydrateFromOrder(order.data);
  }, [editOrderId, order.data, hydrateFromOrder]);

  // A draft left mid-edit and abandoned is still a *saved order's* draft;
  // starting a plain new order with it would PATCH that order instead of
  // creating one.
  useEffect(() => {
    if (fresh && draftEditOrderId) reset();
  }, [fresh, draftEditOrderId, reset]);

  // Whichever customer this entry names — an edited order's own customer
  // included, since only their detail carries the addresses the cart needs.
  const seedId = pickedCustomerId ?? customerId ?? (editOrderId ? (order.data?.customer_id ?? null) : null);
  const seed = useSeedCustomer(seedId);

  const [visit, setVisit] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setVisit((n) => n + 1);
    }, []),
  );

  const entry = useMemo<WizardEntry>(() => {
    const token = `${editOrderId ?? ''}|${pickedCustomerId ?? ''}|${customerId ?? ''}`;
    const base = { token, visit, fresh, editing: !!editOrderId };
    if (editOrderId) {
      const ready = draftEditOrderId === editOrderId;
      return { ...base, jumpTo: ready ? 'CartStep' : null, awaiting: !ready };
    }
    if (pickedCustomerId) {
      const ready = draftCustomerId === pickedCustomerId;
      return { ...base, jumpTo: ready ? 'ProductsStep' : null, awaiting: !ready };
    }
    return { ...base, jumpTo: null, awaiting: false };
  }, [editOrderId, pickedCustomerId, customerId, draftEditOrderId, draftCustomerId, visit, fresh]);

  if (editOrderId && order.isError) {
    return (
      <Screen title="Edit order">
        <ErrorState message={getErrorMessage(order.error)} onRetry={() => order.refetch()} />
      </Screen>
    );
  }
  if (editOrderId && order.isPending) {
    return (
      <Screen title="Edit order">
        <Skeleton width="100%" height={120} />
      </Screen>
    );
  }
  if (seed.isError && !draftCustomerId) {
    return (
      <Screen title="New order">
        <ErrorState message="That customer couldn't be loaded." onRetry={() => seed.refetch()} />
      </Screen>
    );
  }

  return (
    <WizardEntryContext.Provider value={entry}>
      <WizardNavigator />
    </WizardEntryContext.Provider>
  );
}
