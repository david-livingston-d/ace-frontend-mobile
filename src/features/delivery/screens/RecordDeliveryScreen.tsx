import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, FormScreen, Card, Text, Button, Input, DateField, Sheet, StepBar, useSheet, ErrorState, OfflineBanner, Skeleton, useIsOnline } from '@/ui';
import { gapField, gapList, space } from '@/ui/tokens/spacing';
import { CONTROL } from '@/ui/tokens/layout';
import { toast } from '@/ui/Toast';
import { todayIso } from '@/lib/format/date';
import { formatQty } from '@/lib/format/qty';
import { getErrorMessage, getErrorDetailField } from '@/lib/api/errors';
import { DELIVERY_ERRORS } from '@/lib/sales/errors';
import { useMe } from '@/features/auth/hooks';
import { hasPermission } from '@/lib/permissions';
import type { RootStackParamList } from '@/navigation/types';
import { useDeliverable, useCreateDeliveryNote, useSubmitDeliveryNote, useMarkDelivered } from '../hooks';
import { buildDeliveryNoteIn } from '../schema';
import { DeliverableLine } from '../components/DeliverableLine';
import { DeliverableLineSkeleton } from '../components/DeliverableLineSkeleton';

type Nav = NativeStackNavigationProp<RootStackParamList, 'RecordDelivery'>;

/**
 * This screen's own two steps (`record-delivery` frame). Display-only: the
 * note does not exist server-side until CONFIRM, so there is no status to read
 * — `DeliveryStepBar` on the DN detail is the server-driven one.
 */
const RECORD_STEPS = ['Create', 'Confirm'];

/** Mockup D3 (`record-delivery` frame) — record a delivery against a verified,
 * reserved order. Steppers default to "deliver all" (prefilled at each line's
 * `eligible`); CLEAR zeroes every line for a rep who wants to hand-pick a
 * partial delivery instead of trimming each one down, and DELIVER ALL puts
 * them all back. */
export function RecordDeliveryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'RecordDelivery'>>();
  const { orderId } = route.params;

  const { data: me } = useMe();
  const { data, isPending, isError, error, refetch } = useDeliverable(orderId);
  const create = useCreateDeliveryNote();
  const submit = useSubmitDeliveryNote();
  const markDelivered = useMarkDelivered();
  const confirm = useSheet();
  // Same rule as `RecordPaymentScreen`: the write would fail fast offline
  // rather than hang, but saying so before the tap beats saying so after it.
  const online = useIsOnline();

  const [dnDate, setDnDate] = useState(todayIso());
  const [remarks, setRemarks] = useState('');
  // Only the rep's *overrides* — "deliver all" (the default) is never stored
  // here, it's derived straight from `data` below. That sidesteps the seed
  // race a `useEffect`-populated qty map would have (the first render with
  // `data` available and the render where a seeding effect's `setState` lands
  // are two different commits — a query racing that gap would read stale
  // zeros), and it means the `exceeds_eligible` recovery refetch (eligibility
  // may have dropped) auto-clamps instead of needing its own reconciliation:
  // `qtyFor` below re-reads the *current* `eligible` every render.
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [highlightedLineId, setHighlightedLineId] = useState<string | null>(null);

  function can(code: string) {
    return hasPermission(me, code);
  }

  const lines = data?.lines ?? [];

  function qtyFor(lineId: string, eligible: number): number {
    const override = overrides[lineId];
    return Math.min(override ?? eligible, eligible);
  }

  const qtyByLine = Object.fromEntries(lines.map((l) => [l.so_line_id, qtyFor(l.so_line_id, Number(l.eligible))]));
  const totalUnits = Object.values(qtyByLine).reduce((sum, qty) => sum + qty, 0);
  // What the order still *could* ship, regardless of what the steppers are set
  // to — the header's own "still to deliver" figure.
  const eligibleUnits = lines.reduce((sum, l) => sum + Number(l.eligible), 0);
  const lineCount = Object.values(qtyByLine).filter((qty) => qty > 0).length;
  const chaining = create.isPending || submit.isPending || markDelivered.isPending;

  function clearAll() {
    setOverrides(Object.fromEntries(lines.map((l) => [l.so_line_id, 0])));
  }

  // Back to the default. Emptying the override map rather than writing each
  // line's eligible into it keeps `qtyFor`'s "re-read the current eligible
  // every render" property (see `overrides`' own comment).
  function deliverAll() {
    setOverrides({});
  }

  async function handleConfirm() {
    setHighlightedLineId(null);
    const body = buildDeliveryNoteIn({ dnDate, qtyByLine, remarks });
    create.mutate({ soId: orderId, body }, {
      onSuccess: async (dn) => {
        confirm.close();
        // Chains only as far as the rep's own permissions reach — a stop
        // here is not a failure, the detail screen just shows the real
        // status with its own CONTINUE for whoever picks it up next.
        if (can('delivery_note.submit')) {
          try {
            const submitted = await submit.mutateAsync(dn.id);
            if (can('delivery_note.mark_delivered')) {
              try {
                await markDelivered.mutateAsync({ id: submitted.id, body: { delivered_at: dnDate } });
              } catch (e) {
                toast.show(getErrorMessage(e, DELIVERY_ERRORS));
              }
            }
          } catch (e) {
            toast.show(getErrorMessage(e, DELIVERY_ERRORS));
          }
        }
        navigation.navigate('DeliveryNoteDetail', { id: dn.id });
      },
      onError: (e) => {
        confirm.close();
        const lineId = getErrorDetailField(e, 'so_line_id');
        if (lineId) setHighlightedLineId(lineId);
        toast.show(getErrorMessage(e, DELIVERY_ERRORS));
        refetch(); // eligibility may have changed since this screen loaded
      },
    });
  }

  if (isPending) {
    return (
      <Screen title="Record delivery" back={() => navigation.goBack()}>
        <OfflineBanner />
        {/* Fix round 1 (finding 3): two 110px blocks were sized for an
            earlier, taller line card. `DeliverableLineSkeleton` mirrors the
            current `DeliverableLine` `Card`, so loading and loaded read as
            the same silhouette. */}
        <View style={styles.skeletonGap}>
          <Skeleton width="100%" height={64} />
          <DeliverableLineSkeleton />
        </View>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen title="Record delivery" back={() => navigation.goBack()}>
        <ErrorState message={getErrorMessage(error, DELIVERY_ERRORS)} onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <FormScreen
      title="Record delivery"
      back={() => navigation.goBack()}
      footer={
        <Button
          label="Confirm delivery"
          size="lg"
          fullWidth
          disabled={totalUnits === 0 || !online}
          onPress={confirm.open}
        />
      }
    >
      <OfflineBanner />

      <StepBar steps={RECORD_STEPS} current={0} />

      {/* The order this ships against, how much of it is still owed, and the
          two ways to fill every stepper at once. */}
      <Card padding="row">
        {/* Two rows, not one: an order number, "N units still to deliver" and
            two buttons do not share a phone-width line — the number wrapped
            mid-word on device. */}
        <Text variant="rowTitle">{data.number}</Text>
        <Text variant="caption" color="muted" style={styles.headerMeta}>
          {`${formatQty(String(eligibleUnits))} ${eligibleUnits === 1 ? 'unit' : 'units'} still to deliver`}
        </Text>
        <View style={styles.headerActions}>
          <Button label="Clear" variant="ghost" size="sm" onPress={clearAll} />
          <Button label="Deliver all" variant="outline" size="sm" onPress={deliverAll} />
        </View>
      </Card>

      <View style={styles.lines}>
        {lines.map((line) => (
          <DeliverableLine
            key={line.so_line_id}
            line={line}
            qty={qtyByLine[line.so_line_id] ?? 0}
            onChange={(qty) => setOverrides((prev) => ({ ...prev, [line.so_line_id]: qty }))}
            highlighted={highlightedLineId === line.so_line_id}
          />
        ))}
      </View>

      <View style={styles.pairRow}>
        <View style={styles.pairField}>
          <DateField label="Delivery date" value={dnDate} onChange={(v) => setDnDate(v ?? todayIso())} />
        </View>
        {/* MVP is one warehouse (PRD), so where it ships from is a fact, not a
            choice — shown because the frame shows it, read-only because the
            deliverable payload is the only thing that decides it. */}
        <View style={styles.pairField}>
          <Text variant="label" color="muted" style={styles.dispatchLabel}>Dispatch from</Text>
          {/* Same box height as the date field beside it, so the two columns
              share a baseline instead of one floating above the other. */}
          <View style={styles.dispatchValue}>
            <Text variant="bodySm">{data.warehouse_name ?? '—'}</Text>
          </View>
        </View>
      </View>

      <Input label="Remarks" value={remarks} onChangeText={setRemarks} multiline tall />

      <Sheet
        ref={confirm.ref}
        title="Confirm delivery"
        footer={
          <>
            <View style={styles.footerButton}>
              <Button label="Back" variant="outline" onPress={confirm.close} fullWidth />
            </View>
            <View style={styles.footerButton}>
              <Button label="Confirm" variant="solid" loading={chaining} onPress={handleConfirm} fullWidth />
            </View>
          </>
        }
      >
        <Text variant="bodySm" color="muted">
          {`Delivering ${totalUnits} units across ${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`}
        </Text>
      </Sheet>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  headerMeta: { marginTop: space[1] },
  headerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space[2], marginTop: space[2] },
  lines: { gap: gapList },
  pairRow: { flexDirection: 'row', gap: space[3] },
  pairField: { flex: 1 },
  dispatchLabel: { marginBottom: gapField },
  dispatchValue: { minHeight: CONTROL.field, justifyContent: 'center' },
  footerButton: { flex: 1 },
  skeletonGap: { gap: space[3] },
});
