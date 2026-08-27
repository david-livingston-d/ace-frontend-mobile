import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, ErrorState, Skeleton, Sheet, useSheet, Text, Button } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { getErrorMessage } from '@/lib/api/errors';
import type { RootStackParamList } from '@/navigation/types';
import { useDraftStore, hasContent } from '../store/draft';
import { useOrder, useSeedCustomer } from '../hooks';
import { WizardNavigator } from './wizard/WizardNavigator';
import { WizardEntryContext, type WizardEntry } from './wizard/context';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NewOrder'>;

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
 *
 * The fourth entrance is no params at all — the tab bar's "+" — and it is the
 * one that has to reckon with the *persisted* draft: see the resume prompt
 * below.
 */
export function NewOrderScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'NewOrder'>>();
  const navigation = useNavigation<Nav>();
  const { customerId, editOrderId, pickedCustomerId, pickNonce, fresh: declaredFresh } = route.params ?? {};
  const plainEntry = !customerId && !editOrderId && !pickedCustomerId;

  const hydrateFromOrder = useDraftStore((s) => s.hydrateFromOrder);
  const reset = useDraftStore((s) => s.reset);
  const draftCustomerId = useDraftStore((s) => s.customer?.id ?? null);
  const draftEditOrderId = useDraftStore((s) => s.editOrderId);
  const draftHasContent = useDraftStore(hasContent);

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
    if (plainEntry && draftEditOrderId) reset();
  }, [plainEntry, draftEditOrderId, reset]);

  // Whichever customer this entry names — an edited order's own customer
  // included, since only their detail carries the addresses the cart needs.
  const seedId = pickedCustomerId ?? customerId ?? (editOrderId ? (order.data?.customer_id ?? null) : null);
  const seed = useSeedCustomer(seedId);

  // The hand-off params have done their job the moment the draft carries the
  // customer they named. Clearing them is what lets the *next* hand-off be
  // seen at all: `navigate` merges params, so a route still holding
  // `pickedCustomerId: 'c1'` is unchanged by a second pick of the same
  // customer, and the forward jump below never re-arms. Cleared after the
  // customer step's own effect has run (child effects commit before the
  // parent's), so the jump it triggers is not cancelled by this.
  useEffect(() => {
    if (!pickedCustomerId || draftCustomerId !== pickedCustomerId) return;
    navigation.setParams({ pickedCustomerId: undefined, pickNonce: undefined });
  }, [pickedCustomerId, draftCustomerId, navigation]);

  const [visit, setVisit] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setVisit((n) => n + 1);
    }, []),
  );

  // "Resume draft?" — the persisted draft is not this entry's doing, so ask
  // rather than assume. Only for a plain "+" entry: every other entrance names
  // a customer or an order and is *about* to fill the draft itself, and
  // `fresh` is the caller (the success screen's "New order") saying it has
  // already emptied it. `draftEditOrderId` is handled by the effect above,
  // which resets the draft rather than offering to resume someone's saved order.
  //
  // Asked **once, at entry, and then latched** — this is a question about how
  // the wizard was opened, not a condition to keep watching. Re-derived live it
  // fires over a rep who is mid-flow, because both halves of it flip after
  // entry: picking a customer on step 1 fills the draft, and the customer
  // hand-off clears `pickedCustomerId` once seeded (which turns `plainEntry`
  // true) with the draft now full. Neither is anyone abandoning anything.
  const { ref: resumeRef, open: openResume, close: closeResume } = useSheet();
  const askResume = plainEntry && declaredFresh !== true && draftHasContent && !draftEditOrderId;
  // Kept in a ref so the focus effect below can read the *current* answer
  // without taking it as a dependency — depending on it is exactly what turned
  // "decide on entry" into "watch forever".
  const askResumeRef = useRef(askResume);
  useEffect(() => {
    askResumeRef.current = askResume;
  });
  const decided = useRef(false);
  useFocusEffect(
    // No changing dependencies at all: this runs on the first focus of this
    // mount and never again. (`decided` also covers a re-focus after a detour
    // through the customer-create screen, which is not a new entry either.)
    useCallback(() => {
      if (decided.current) return;
      decided.current = true;
      if (askResumeRef.current) openResume();
    }, [openResume]),
  );

  function startOver() {
    reset();
    closeResume();
  }

  const entry = useMemo<WizardEntry>(() => {
    // `pickNonce` is part of the token, not decoration: two hand-offs of the
    // same customer are the same three ids, and the customer step forwards
    // once per *token*.
    const token = `${editOrderId ?? ''}|${pickedCustomerId ?? ''}|${customerId ?? ''}|${pickNonce ?? ''}`;
    const base = { token, visit, fresh: plainEntry, editing: !!editOrderId };
    if (editOrderId) {
      const ready = draftEditOrderId === editOrderId;
      return { ...base, jumpTo: ready ? 'CartStep' : null, awaiting: !ready };
    }
    if (pickedCustomerId) {
      const ready = draftCustomerId === pickedCustomerId;
      return { ...base, jumpTo: ready ? 'ProductsStep' : null, awaiting: !ready };
    }
    return { ...base, jumpTo: null, awaiting: false };
  }, [editOrderId, pickedCustomerId, customerId, pickNonce, draftEditOrderId, draftCustomerId, visit, plainEntry]);

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
      <Sheet ref={resumeRef} title="Resume draft?">
        <Text variant="body" color="textMuted">
          There is an unfinished order on this phone. Carry on with it, or clear it and start a new one.
        </Text>
        <View style={styles.resumeActions}>
          <Button label="Resume" size="lg" fullWidth onPress={closeResume} />
          <Button label="Start over" variant="outline" size="lg" fullWidth onPress={startOver} />
        </View>
      </Sheet>
    </WizardEntryContext.Provider>
  );
}

const styles = StyleSheet.create({
  resumeActions: { gap: space[2], marginTop: space[4] },
});
