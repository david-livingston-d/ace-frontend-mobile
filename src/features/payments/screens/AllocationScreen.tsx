import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, Card, Text, Button, Banner, ErrorState, Skeleton, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { getErrorMessage } from '@/lib/api/errors';
import { PAYMENT_ERRORS } from '@/lib/sales/errors';
import type { RootStackParamList } from '@/navigation/types';
import { usePayment, useSuggestAllocation, useSetAllocations } from '../hooks';
import { initAllocations, setRowAmount, toAllocationsIn, totals, type AllocationRowState } from '../allocation';
import { AllocationRow } from '../components/AllocationRow';
import type { PaymentWarning } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Allocation'>;

/**
 * Mockup D1's second step — spend a submitted payment across the invoices it
 * settles. Seeded with the server's own FIFO proposal (`GET
 * /suggest-allocation`), which the rep is free to overwrite row by row: the
 * screen never rewrites a typed figure, it only refuses to send a set that
 * over-draws the payment, and reports a row above its invoice's outstanding
 * balance rather than clamping it.
 *
 * The `PUT` is a full replace of what this payment settles, so a row left at
 * zero is simply absent from the body — that is how an allocation is removed.
 */
export function AllocationScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Allocation'>>();
  const { paymentId, invoiceId } = route.params;
  const theme = useTheme();

  const payment = usePayment(paymentId);
  // A draft has nothing to allocate and the server answers `not_submitted` —
  // so the suggestion waits until the payment's real status says otherwise.
  const suggest = useSuggestAllocation(paymentId, payment.data?.status === 'submitted');
  const save = useSetAllocations();

  const [rows, setRows] = useState<AllocationRowState[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<PaymentWarning[]>([]);

  const amount = payment.data?.amount ?? '0.00';

  // Seeded from the suggestion, and re-seeded whenever a *new* suggestion
  // arrives (the "Suggest (FIFO)" button refetches it). Keyed on the query's
  // own `dataUpdatedAt` so a refetch that returns identical data still
  // re-seeds — otherwise pressing the button after hand-editing would look
  // like it did nothing.
  const suggestedAt = suggest.dataUpdatedAt;
  useEffect(() => {
    if (!suggest.data || !payment.data) return;
    setRows(initAllocations(suggest.data.allocations, payment.data.amount));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedAt]);

  function handleSave() {
    if (!rows) return;
    setError(null);
    save.mutate(
      { id: paymentId, body: toAllocationsIn(rows) },
      {
        onSuccess: (updated) => {
          // A `different_order` warning is not a failure — the allocation is
          // saved. It is shown here, before leaving, because it is about the
          // choice the rep just made rather than about the payment itself.
          if (updated.warnings.length > 0) {
            setWarnings(updated.warnings);
            return;
          }
          navigation.navigate('PaymentDetail', { id: paymentId });
        },
        onError: (e) => setError(getErrorMessage(e, PAYMENT_ERRORS)),
      },
    );
  }

  if (payment.isPending || (suggest.isPending && payment.data?.status === 'submitted')) {
    return (
      <Screen title="Allocate payment" back={() => navigation.goBack()}>
        <View style={styles.skeletonGap}>
          <Skeleton width="100%" height={80} />
          <Skeleton width="100%" height={110} />
        </View>
      </Screen>
    );
  }

  if (payment.isError || !payment.data) {
    return (
      <Screen title="Allocate payment" back={() => navigation.goBack()}>
        <ErrorState message={getErrorMessage(payment.error, PAYMENT_ERRORS)} onRetry={() => payment.refetch()} />
      </Screen>
    );
  }

  if (suggest.isError) {
    return (
      <Screen title="Allocate payment" back={() => navigation.goBack()}>
        <ErrorState message={getErrorMessage(suggest.error, PAYMENT_ERRORS)} onRetry={() => suggest.refetch()} />
      </Screen>
    );
  }

  const current = rows ?? [];
  const t = totals(current, amount);
  const blocked = t.overAllocated || Object.keys(t.rowErrors).length > 0;

  return (
    <Screen title="Allocate payment" back={() => navigation.goBack()} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Card style={styles.header}>
            <Text variant="h4">{payment.data.number ?? 'Draft'}</Text>
            <Text variant="money">{formatMoney(amount)}</Text>
            <Text variant="bodySm" color="textMuted">{payment.data.customer_name}</Text>
          </Card>

          {error ? <Banner tone="danger" title={error} /> : null}
          {warnings.map((warning) => (
            <Banner
              key={`${warning.code}-${warning.invoice_number ?? ''}`}
              tone="warning"
              title={warning.message}
              action={{ label: 'View payment', onPress: () => navigation.navigate('PaymentDetail', { id: paymentId }) }}
            />
          ))}

          {current.length === 0 ? (
            <Text variant="bodySm" color="textMuted">
              Nothing open to settle — this payment stays on the customer's account as an advance.
            </Text>
          ) : null}

          {current.map((row) => (
            <AllocationRow
              key={row.invoice_id}
              row={row}
              error={t.rowErrors[row.invoice_id]}
              autoFocus={row.invoice_id === invoiceId}
              onChange={(value) => setRows((prev) => (prev ? setRowAmount(prev, row.invoice_id, value) : prev))}
            />
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Text variant="body">
            {`Allocated ${formatMoney(t.allocated)} · Unallocated ${formatMoney(t.unallocated)}`}
          </Text>
          {t.overAllocated ? (
            <Text variant="bodySm" color={theme.colors.tone.danger.fg}>
              {`Over-allocated by ${formatMoney(t.unallocated.replace('-', ''))}`}
            </Text>
          ) : null}
          <View style={styles.buttons}>
            <View style={styles.button}>
              <Button
                label="Suggest (FIFO)"
                variant="outline"
                fullWidth
                loading={suggest.isFetching}
                onPress={() => suggest.refetch()}
              />
            </View>
            <View style={styles.button}>
              <Button
                label="Save allocation"
                fullWidth
                disabled={blocked}
                loading={save.isPending}
                onPress={handleSave}
              />
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { gap: space[2], paddingBottom: space[6] },
  skeletonGap: { gap: space[3] },
  header: { gap: space[1] },
  footer: { gap: space[2], paddingVertical: space[3] },
  buttons: { flexDirection: 'row', gap: space[2] },
  button: { flex: 1 },
});
