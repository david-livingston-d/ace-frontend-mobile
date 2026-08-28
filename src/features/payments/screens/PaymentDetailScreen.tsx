import React, { useRef } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Banner, Button, Card, ErrorState, HeaderRow, Screen, Skeleton, StatusChip, Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';
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

/**
 * The payment's own page (PRD §38): what came in, what it settles, and the
 * one action that moves it along. Every figure — including the step bar — is
 * read off the payment the server last returned, so a payment whose submit or
 * allocation failed halfway shows its *real* status with a CONTINUE that
 * re-drives the step from there.
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
          <Skeleton width="100%" height={110} />
          <Skeleton width="100%" height={60} />
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
    // The number lives in the header card, not the title bar: it is one of
    // the facts the card is *for*, and duplicating it reads as a stutter.
    <Screen title="Payment" back={() => navigation.goBack()} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card style={styles.header}>
          <HeaderRow>
            <Text variant="h4">{data.number ?? 'Draft'}</Text>
            <StatusChip tone={paymentDocStatusTone(data.status)} label={paymentDocStatusLabel(data.status)} />
          </HeaderRow>
          <Pressable
            onPress={() => navigation.navigate('CustomerDetail', { id: data.customer_id })}
            accessibilityRole="button"
          >
            <Text variant="bodySm" color="textMuted">{data.customer_name}</Text>
          </Pressable>
          {data.sales_order_id && data.so_number ? (
            <Pressable
              onPress={() => navigation.navigate('OrderDetail', { id: data.sales_order_id! })}
              accessibilityRole="button"
            >
              <Text variant="bodySm">{data.so_number}</Text>
            </Pressable>
          ) : null}
          <Text variant="bodySm" color="textMuted">{modeLine}</Text>
          <Text variant="money">{formatMoney(data.amount)}</Text>
          <Text variant="bodySm" color="textMuted">
            {`Allocated ${formatMoney(data.allocated)} · Unallocated ${formatMoney(data.unallocated)}`}
          </Text>
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
          <View style={styles.allocations}>
            <Text variant="label" color="textMuted">Settles</Text>
            {data.allocations.map((allocation) => (
              <View key={allocation.id} style={styles.allocationRow}>
                <View style={styles.allocationMain}>
                  <Text variant="body">
                    {`${allocation.invoice_number ?? 'Draft invoice'} · ${allocation.so_number}`}
                  </Text>
                  <Text variant="bodySm" color="textMuted">
                    {`Due ${formatDate(allocation.due_date)} · ${formatMoney(allocation.outstanding)} outstanding`}
                  </Text>
                </View>
                <Text variant="bodySm">{formatMoney(allocation.amount)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {data.remarks ? (
          <Text variant="bodySm" color="textMuted" style={styles.remarks}>{data.remarks}</Text>
        ) : null}

        {data.cancel_reason ? (
          <Text variant="bodySm" color="textMuted" style={styles.remarks}>{`Cancelled — ${data.cancel_reason}`}</Text>
        ) : null}
      </ScrollView>

      {/* Cancelling reverses money that has already been counted, so it is a
          head-of-department action (`payment.cancel`) — a rep never sees it. */}
      {can('payment.cancel') && data.status !== 'cancelled' ? (
        <View style={styles.footer}>
          <Button label="Cancel payment" variant="outline" fullWidth onPress={() => reasonRef.current?.open()} />
        </View>
      ) : null}

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
  scroll: { paddingBottom: space[6], gap: space[3] },
  skeletonGap: { gap: space[3] },
  header: { gap: space[1] },
  allocations: { gap: space[2] },
  allocationRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  allocationMain: { flex: 1 },
  remarks: { marginTop: space[2] },
  footer: { paddingVertical: space[3] },
});
