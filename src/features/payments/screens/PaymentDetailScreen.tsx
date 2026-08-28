import React, { useRef } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Banner, Button, Card, Divider, ErrorState, HeaderRow, Screen, Skeleton, StatusChip, Text, useBottomClearance } from '@/ui';
import { gapList, space } from '@/ui/tokens/spacing';
import { hit } from '@/ui/tokens/layout';
import { toast } from '@/ui/Toast';
import { formatMoney } from '@/lib/format/money';
import { formatDate } from '@/lib/format/date';
import { paymentDocStatusLabel, paymentDocStatusTone } from '@/lib/sales/status';
import { getErrorMessage } from '@/lib/api/errors';
import { PAYMENT_ERRORS } from '@/lib/sales/errors';
import { useMe } from '@/features/auth/hooks';
import { hasPermission } from '@/lib/permissions';
import { ReasonSheet, type ReasonSheetHandle } from '@/features/orders/components/ReasonSheet';
import type { RootStackParamList } from '@/navigation/types';
import { usePayment, useSubmitPayment, useCancelPayment } from '../hooks';
import { paymentNextAction } from '../steps';
import { PaymentStepBar } from '../components/PaymentStepBar';

type Nav = NativeStackNavigationProp<RootStackParamList, 'PaymentDetail'>;

/** One label/value line of the header card (`payment-detail` frame): a muted
 * caption on the left, the fact on the right. `onPress` makes the value a
 * link (the customer, the order this money was tagged to). */
function Fact({ label, value, onPress }: { label: string; value: string; onPress?: () => void }) {
  const body = <Text variant="rowStrong">{value}</Text>;
  return (
    <View style={styles.fact}>
      <Text variant="caption" color="muted">{label}</Text>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" hitSlop={hit.link}>
          {body}
        </Pressable>
      ) : (
        body
      )}
    </View>
  );
}

/**
 * The payment's own page (PRD §38, `payment-detail` frame): what came in, what
 * it settles, and the one action that moves it along. Every figure — including
 * the step bar — is read off the payment the server last returned, so a payment
 * whose submit or allocation failed halfway shows its *real* status with a
 * CONTINUE that re-drives the step from there.
 */
export function PaymentDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'PaymentDetail'>>();
  const { id } = route.params;

  const { data: me } = useMe();
  const { data, isPending, isError, error, refetch } = usePayment(id);
  const submit = useSubmitPayment();
  const cancel = useCancelPayment();
  const reasonRef = useRef<ReasonSheetHandle>(null);
  const clearance = useBottomClearance();

  function can(code: string) {
    return hasPermission(me, code);
  }

  function handleContinue() {
    if (!data) return;
    if (data.status === 'draft') {
      submit.mutate(data.id, { onError: (e) => toast.show(getErrorMessage(e, PAYMENT_ERRORS)) });
      return;
    }
    navigation.navigate('Allocation', { paymentId: data.id });
  }

  function handleCancel(reason: string) {
    cancel.mutate(
      { id, reason },
      {
        onSuccess: () => reasonRef.current?.close(),
        onError: (e) => toast.show(getErrorMessage(e, PAYMENT_ERRORS)),
      },
    );
  }

  if (isPending) {
    return (
      <Screen title="Payment" back={() => navigation.goBack()}>
        <View style={styles.skeletonGap}>
          <Skeleton width="100%" height={190} />
          <Skeleton width="100%" height={90} />
        </View>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen title="Payment" back={() => navigation.goBack()}>
        <ErrorState message={getErrorMessage(error, PAYMENT_ERRORS)} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const next = paymentNextAction(data);
  const modeLine = [data.payment_mode_name, formatDate(data.payment_date), data.reference]
    .filter(Boolean)
    .join(' · ');

  return (
    // The number is the screen's title — it is what this page *is*, and
    // repeating it inside the header card reads as a stutter.
    <Screen
      title={data.number ?? 'Draft'}
      back={() => navigation.goBack()}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: clearance }]} keyboardShouldPersistTaps="handled">
        <Card>
          {/* The amount is the card's headline, with the document status
              beside it — everything else is a fact about it. */}
          <HeaderRow>
            <View style={styles.amountBlock}>
              <Text variant="label" color="muted">Amount</Text>
              <Text variant="amountHero">{formatMoney(data.amount)}</Text>
              {/* How much of it has actually landed on an invoice — the one
                  figure a payment is judged by after it is submitted. */}
              <Text variant="caption" color="muted">
                {`Allocated ${formatMoney(data.allocated)} · Unallocated ${formatMoney(data.unallocated)}`}
              </Text>
            </View>
            <StatusChip tone={paymentDocStatusTone(data.status)} label={paymentDocStatusLabel(data.status)} />
          </HeaderRow>

          <Divider style={styles.rule} />

          <Fact
            label="Customer"
            value={data.customer_name}
            onPress={() => navigation.navigate('CustomerDetail', { id: data.customer_id })}
          />
          {data.sales_order_id && data.so_number ? (
            <Fact
              label="Against"
              value={data.so_number}
              onPress={() => navigation.navigate('OrderDetail', { id: data.sales_order_id! })}
            />
          ) : null}
          <Fact label="Mode" value={modeLine} />
        </Card>

        {data.warnings.map((warning) => (
          <Banner key={`${warning.code}-${warning.invoice_number ?? ''}`} tone="warning" title={warning.message} />
        ))}

        <PaymentStepBar
          payment={data}
          canContinue={!!next && can(next.permission)}
          continueLoading={submit.isPending}
          onContinue={handleContinue}
        />

        {data.allocations.length > 0 ? (
          <Card>
            <Text variant="label" color="muted">Settles</Text>
            {data.allocations.map((allocation) => (
              <View key={allocation.id} style={styles.allocationRow}>
                <View style={styles.allocationMain}>
                  <Text variant="rowTitle" numberOfLines={1}>
                    {`${allocation.invoice_number ?? 'Draft invoice'} · ${allocation.so_number}`}
                  </Text>
                  <Text variant="caption" color="muted">
                    {`Due ${formatDate(allocation.due_date)} · ${formatMoney(allocation.outstanding)} outstanding`}
                  </Text>
                </View>
                <Text variant="rowStrong">{formatMoney(allocation.amount)}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {data.remarks ? (
          <Card variant="note">
            <Text variant="caption" color="muted">{data.remarks}</Text>
          </Card>
        ) : null}

        {data.cancel_reason ? (
          <Card variant="note">
            <Text variant="caption" color="muted">{`Cancelled — ${data.cancel_reason}`}</Text>
          </Card>
        ) : null}

        {/* Cancelling reverses money that has already been counted, so it is a
            head-of-department action (`payment.cancel`) — a rep never sees it. */}
        {can('payment.cancel') && data.status !== 'cancelled' ? (
          <Button label="Cancel payment" variant="outline" fullWidth destructive onPress={() => reasonRef.current?.open()} />
        ) : null}
      </ScrollView>

      <ReasonSheet
        ref={reasonRef}
        title="Cancel payment"
        placeholder="Why is this payment being cancelled?"
        confirmLabel="Cancel payment"
        loading={cancel.isPending}
        onConfirm={handleCancel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: gapList },
  skeletonGap: { gap: space[3] },
  amountBlock: { flexShrink: 1, gap: space[1] },
  rule: { marginVertical: space[3] },
  fact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], paddingVertical: space[1] },
  allocationRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[3] },
  allocationMain: { flex: 1, gap: space[1] },
});
