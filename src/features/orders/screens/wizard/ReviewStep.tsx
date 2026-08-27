import React, { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen, Card, Text, Button, Divider, Banner, toast } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { toApiError, getErrorMessage } from '@/lib/api/errors';
import { SALES_ERRORS } from '@/lib/sales/errors';
import { usePermission } from '@/lib/permissions';
import { formatMoney } from '@/lib/format/money';
import { formatDate, todayIso } from '@/lib/format/date';
import { formatAddress } from '@/lib/customers/address';
import { useDraftStore, selectTotals, draftLines } from '../../store/draft';
import { toSalesOrderIn, toSalesOrderPatch } from '../../mapping';
import { useCreateOrder, useUpdateOrder } from '../../hooks';
import { StepHeader } from '../../components/StepHeader';
import { TotalsCard } from '../../components/TotalsCard';
import type { WizardNav } from './types';

/** Mockup C5 — the order the way the customer would read it, then Confirm. */
export function ReviewStep() {
  const navigation = useNavigation<WizardNav>();
  const state = useDraftStore();
  const totals = useDraftStore(selectTotals);
  const lines = useMemo(() => draftLines(state), [state]);
  const reset = useDraftStore((s) => s.reset);

  const canOverrideDiscount = usePermission('sales_order.discount_override');
  const create = useCreateOrder();
  const update = useUpdateOrder();
  const [error, setError] = useState<string | null>(null);

  const shipping = state.customer?.addresses.find((a) => a.id === state.shippingAddressId);

  /**
   * A rejected line comes back as `row_index` — an index into the `lines`
   * array that was just sent, which is `draftLines` order. Turn it back into
   * the variant it names and hand the cart the message, rather than dropping
   * the user on a review screen with a toast and no idea which row.
   */
  function surface(err: unknown) {
    const message = getErrorMessage(err, SALES_ERRORS);
    const rowIndex = toApiError(err).rowIndex;
    const variantId = rowIndex === null ? undefined : lines[rowIndex]?.variantId;
    setError(message);
    toast.show(message);
    if (variantId) navigation.navigate('CartStep', { errorVariantId: variantId, errorMessage: message });
  }

  function confirm() {
    setError(null);
    const onSuccess = (order: { id: string; number: string }) => {
      const edited = !!state.editOrderId;
      reset();
      navigation.navigate('WizardSuccess', { orderId: order.id, number: order.number, edited });
    };
    if (state.editOrderId) {
      update.mutate(
        { id: state.editOrderId, body: toSalesOrderPatch(state, canOverrideDiscount) },
        { onSuccess, onError: surface },
      );
    } else {
      create.mutate(toSalesOrderIn(state, todayIso(), canOverrideDiscount), { onSuccess, onError: surface });
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <Screen title="Review" back={() => navigation.goBack()}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <StepHeader step={4} hint="Check it over, then confirm." />

        {error ? <Banner tone="danger" title={error} /> : null}

        <Card depth="soft">
          <Text variant="display" style={styles.wordmark}>ACE</Text>
          <Text variant="label" color="textMuted" style={styles.forLabel}>Order for</Text>
          <Text variant="h4">{state.customer?.name ?? '—'}</Text>
          {shipping ? (
            <Text variant="bodySm" color="textMuted" style={styles.address}>{formatAddress(shipping)}</Text>
          ) : null}
          <Text variant="bodySm" color="textMuted" style={styles.address}>
            {state.expectedDeliveryDate ? `Committed ${formatDate(state.expectedDeliveryDate)}` : 'No committed date'}
          </Text>
        </Card>

        <Card depth="soft">
          <Text variant="label" color="textMuted">Items</Text>
          {lines.map((line, index) => (
            <View key={line.variantId} style={styles.line}>
              <View style={styles.lineText}>
                <Text variant="body" numberOfLines={1}>{line.snapshot.productName}</Text>
                <Text variant="caption" color="textMuted" numberOfLines={1}>
                  {`${line.snapshot.sku}${line.snapshot.variantLabel ? ` · ${line.snapshot.variantLabel}` : ''}`}
                </Text>
                <Text variant="caption" color="textMuted">
                  {`${line.qty} × ${formatMoney(line.rate)}${Number(line.discountPct) ? ` · ${line.discountPct}% off` : ''}`}
                </Text>
              </View>
              <Text variant="bodySm">{formatMoney(totals.lines[index]?.total ?? 0)}</Text>
            </View>
          ))}
          {state.remarks.trim() ? (
            <>
              <Divider style={styles.divider} />
              <Text variant="bodySm" color="textMuted">{state.remarks.trim()}</Text>
            </>
          ) : null}
        </Card>

        <TotalsCard totals={totals} lines={lines} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={state.editOrderId ? 'Save changes' : 'Confirm order'}
          size="lg"
          fullWidth
          loading={busy}
          onPress={confirm}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: space[3], paddingBottom: space[6] },
  wordmark: { letterSpacing: 6 },
  forLabel: { marginTop: space[3] },
  address: { marginTop: space[1] },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], marginTop: space[3] },
  lineText: { flex: 1 },
  divider: { marginVertical: space[3] },
  footer: { paddingVertical: space[3] },
});
