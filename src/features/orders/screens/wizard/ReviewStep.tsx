import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Banner, Button, Card, Divider, FactRow, FormScreen, StatusChip, Text, toast } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { toApiError, getErrorMessage } from '@/lib/api/errors';
import { SALES_ERRORS } from '@/lib/sales/errors';
import { formatMoney } from '@/lib/format/money';
import { formatRate } from '@/lib/format/rate';
import { formatDate, todayIso } from '@/lib/format/date';
import { formatAddress } from '@/lib/customers/address';
import { usePaymentTerms } from '@/features/masters/hooks';
import { useDraftStore, selectTotals, selectLineCount, selectUnitCount, draftLines } from '../../store/draft';
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
  const lineCount = useDraftStore(selectLineCount);
  const unitCount = useDraftStore(selectUnitCount);
  const reset = useDraftStore((s) => s.reset);
  const { data: paymentTerms } = usePaymentTerms();

  const create = useCreateOrder();
  const update = useUpdateOrder();
  const [error, setError] = useState<string | null>(null);

  const shipping = state.customer?.addresses.find((a) => a.id === state.shippingAddressId);
  const termsName = paymentTerms?.find((t) => t.id === state.paymentTermsId)?.name;

  /**
   * Surfaces a refusal instead of quietly re-shaping the order until the
   * server accepts it: a rate or discount this caller may not save comes back
   * as a 403 (`rate_override_required` / `discount_override_required`) and is
   * shown for what it is.
   *
   * A rejected *line* also carries `row_index` — an index into the `lines`
   * array that was just sent, which is `draftLines` order. Turn it back into
   * the variant it names and hand the cart the message, rather than dropping
   * the user on a review screen with a toast and no idea which row. An
   * order-level refusal has no `row_index`, and stays here on the review
   * screen's own banner.
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
    const onSuccess = (order: { id: string; number: string; customer_id: string }) => {
      const edited = !!state.editOrderId;
      reset();
      // The order is saved, so the wizard has nothing left to hold: replace the
      // *root* stack outright rather than pushing a fifth step onto a stack of
      // emptied ones. What's left is the order list with the success card over
      // it — which is also what the back button then falls back to.
      //
      // `customerId` travels with the order so the success screen's "Record
      // payment now" can hand the payment form both — the form would resolve
      // the customer from the order anyway, but not until that fetch lands.
      navigation.getParent()?.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'Tabs', params: { screen: 'Orders' } },
            {
              name: 'OrderSuccess',
              params: { orderId: order.id, number: order.number, customerId: order.customer_id, edited },
            },
          ],
        }),
      );
    };
    if (state.editOrderId) {
      update.mutate(
        { id: state.editOrderId, body: toSalesOrderPatch(state) },
        { onSuccess, onError: surface },
      );
    } else {
      create.mutate(toSalesOrderIn(state, todayIso()), { onSuccess, onError: surface });
    }
  }

  const busy = create.isPending || update.isPending;

  return (
    <FormScreen
      title="Review"
      back={() => navigation.goBack()}
      footer={
        <Button
          label={state.editOrderId ? 'Save changes' : 'Confirm order'}
          size="lg"
          fullWidth
          loading={busy}
          onPress={confirm}
        />
      }
    >
      <StepHeader step={4} hint="Check it over, then confirm." />

      {error ? <Banner tone="danger" title={error} /> : null}

      {/* The order the way the customer would read it (`wizard-4-review`):
          who it is for, when it is committed, what is on it, what it comes to. */}
      <Card>
        <View style={styles.headRow}>
          <View style={styles.headText}>
            <Text variant="cardTitle" numberOfLines={2}>{state.customer?.name ?? '—'}</Text>
            <Text variant="caption" color="muted" numberOfLines={1}>
              {[state.customer?.code, termsName].filter(Boolean).join(' · ') || '—'}
            </Text>
          </View>
          <StatusChip tone="neutral" label="Draft" size="sm" />
        </View>

        <Divider style={styles.divider} />

        {shipping ? (
          <Text variant="caption" color="muted" style={styles.address}>{formatAddress(shipping)}</Text>
        ) : null}
        <FactRow
          label="Committed delivery"
          value={state.expectedDeliveryDate ? formatDate(state.expectedDeliveryDate) : 'Not committed'}
        />
        <FactRow label="Lines" value={`${lineCount} · ${unitCount} units`} />
      </Card>

      <Card>
        <Text variant="label" color="muted">Items</Text>
        {lines.map((line, index) => (
          <View key={line.variantId} style={styles.line}>
            <View style={styles.lineText}>
              <Text variant="row" numberOfLines={1}>
                {`${line.snapshot.productName}${line.snapshot.variantLabel ? ` · ${line.snapshot.variantLabel}` : ''} × ${line.qty}`}
              </Text>
              <Text variant="caption" color="muted" numberOfLines={1}>
                {`${line.snapshot.sku} · ${formatMoney(line.rate)}${Number(line.discountPct) ? ` · ${formatRate(line.discountPct)}% off` : ''}`}
              </Text>
            </View>
            <Text variant="row">{formatMoney(totals.lines[index]?.total ?? 0)}</Text>
          </View>
        ))}
        {state.remarks.trim() ? (
          <>
            <Divider style={styles.divider} />
            <Text variant="caption" color="muted">{state.remarks.trim()}</Text>
          </>
        ) : null}
      </Card>

      <TotalsCard totals={totals} lines={lines} />

      <Banner tone="neutral" title="Items freeze once the order is verified." />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space[3] },
  headText: { flex: 1, gap: space[1] - 2 },
  address: { marginBottom: space[2] },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], marginTop: space[3] },
  lineText: { flex: 1, gap: space[1] - 2 },
  divider: { marginVertical: space[3] },
});
