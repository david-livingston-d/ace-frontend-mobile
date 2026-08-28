import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Screen,
  FormScreen,
  Card,
  Text,
  Button,
  Banner,
  Input,
  Select,
  DateField,
  MoneyInput,
  SegmentedControl,
  ErrorState,
  OfflineBanner,
  Skeleton,
  useIsOnline,
} from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { toast } from '@/ui/Toast';
import { todayIso, todayLocalDate } from '@/lib/format/date';
import { keys } from '@/lib/query/keys';
import { getErrorMessage } from '@/lib/api/errors';
import { PAYMENT_ERRORS } from '@/lib/sales/errors';
import { useMe } from '@/features/auth/hooks';
import { hasPermission } from '@/lib/permissions';
import { useOrder } from '@/features/orders/hooks';
import { useCustomer } from '@/features/customers/hooks';
import type { RootStackParamList } from '@/navigation/types';
import { usePaymentModes, useCreatePayment, useSubmitPayment } from '../hooks';
import { paymentsApi } from '../api';
import { paymentSchema, toPaymentIn, type PaymentForm } from '../schema';
import { AgainstSelector } from '../components/AgainstSelector';
import { ExcessInfo } from '../components/ExcessInfo';
import type { PaymentAgainst, PaymentDetail } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'RecordPayment'>;

/** Above this many active modes the chips stop being a row and become a
 * `Select` — four is what fits on a phone without wrapping into a grid. */
const MAX_MODE_CHIPS = 4;

/**
 * Mockup D1 — record money received. Three ways in: an order (its detail's
 * action bar, or the order-created success screen), a customer (their detail
 * page, or the payments tab), or neither, in which case the customer is
 * picked here first.
 *
 * The screen drives the server's own multi-step flow as far as the rep's
 * permissions reach — create (draft) → submit (numbers it) → allocate — and
 * stops honestly wherever that runs out or fails, leaving the payment at the
 * status the server actually reports and the detail screen's own CONTINUE to
 * pick it up. Nothing here guesses a step forward.
 */
export function RecordPaymentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'RecordPayment'>>();
  const { orderId, customerId: customerIdParam, invoiceId } = route.params ?? {};

  const { data: me } = useMe();
  const qc = useQueryClient();
  const order = useOrder(orderId ?? '', !!orderId);
  // Only fetched when there is no order to read the customer off — the order
  // detail already carries `customer_id`/`customer_name`.
  const customer = useCustomer(customerIdParam ?? '', !!customerIdParam && !orderId);
  const modes = usePaymentModes();
  const create = useCreatePayment();
  const submit = useSubmitPayment();

  const [against, setAgainst] = useState<PaymentAgainst>(invoiceId ? 'invoice' : orderId ? 'order' : 'customer');
  const [error, setError] = useState<string | null>(null);
  const [chaining, setChaining] = useState(false);
  // Money writes fail fast offline (`queryClient`'s `networkMode: 'always'`)
  // rather than hanging, but a rep should not have to discover that by
  // tapping: the button is out of reach and the banner says why.
  const online = useIsOnline();

  const customerId = order.data?.customer_id ?? customerIdParam ?? null;
  const customerName = order.data?.customer_name ?? customer.data?.name ?? null;
  const activeModes = (modes.data ?? []).filter((mode) => mode.is_active);

  const { control, handleSubmit, watch, setValue } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: '', payment_mode_id: '', payment_date: todayIso(), reference: '', remarks: '' },
  });

  // The modes arrive after the first render, so the default can only be set
  // once they're here — and only while the rep hasn't already chosen one.
  const selectedModeId = watch('payment_mode_id');
  useEffect(() => {
    if (!selectedModeId && activeModes.length > 0) {
      setValue('payment_mode_id', activeModes[0]!.id);
    }
  }, [selectedModeId, activeModes, setValue]);

  function can(code: string) {
    return hasPermission(me, code);
  }

  async function onSubmit(form: PaymentForm) {
    if (!customerId) return;
    setError(null);
    setChaining(true);

    let payment: PaymentDetail;
    try {
      payment = await create.mutateAsync(toPaymentIn(form, { customerId, orderId, against }));
    } catch (e) {
      setChaining(false);
      setError(getErrorMessage(e, PAYMENT_ERRORS));
      return;
    }

    // Submitting is what numbers the payment and makes its money count. A rep
    // without `payment.submit` legitimately stops at a draft — that's not a
    // failure, and the detail screen says so.
    let current = payment;
    if (can('payment.submit')) {
      try {
        current = await submit.mutateAsync(payment.id);
      } catch (e) {
        setChaining(false);
        toast.show(getErrorMessage(e, PAYMENT_ERRORS));
        navigation.navigate('PaymentDetail', { id: payment.id });
        return;
      }
    }

    // A customer advance settles nothing by definition, so it is never routed
    // through allocation. Everything else gets the server's FIFO proposal —
    // but only if there is actually something open to propose against.
    if (current.status === 'submitted' && against !== 'customer' && can('payment.allocate')) {
      try {
        const suggestion = await paymentsApi.suggest(current.id);
        // The allocation screen asks for this same suggestion the moment it
        // mounts; handing it the one already in hand is the difference
        // between the rows being there and a skeleton the rep watches.
        qc.setQueryData([...keys.payment(current.id), 'suggest-allocation'], suggestion);
        if (suggestion.allocations.length > 0) {
          setChaining(false);
          navigation.navigate('Allocation', { paymentId: current.id, invoiceId });
          return;
        }
      } catch (e) {
        // The money is recorded either way — a suggestion that can't be
        // fetched is not a reason to hide that from the rep.
        toast.show(getErrorMessage(e, PAYMENT_ERRORS));
      }
    }

    setChaining(false);
    navigation.navigate('PaymentDetail', { id: current.id });
  }

  if (orderId && order.isPending) {
    return (
      <Screen title="Record payment" back={() => navigation.goBack()}>
        <OfflineBanner />
        <View style={styles.skeletonGap}>
          <Skeleton width="100%" height={80} />
          <Skeleton width="100%" height={110} />
        </View>
      </Screen>
    );
  }

  if (orderId && (order.isError || !order.data)) {
    return (
      <Screen title="Record payment" back={() => navigation.goBack()}>
        <ErrorState message={getErrorMessage(order.error, PAYMENT_ERRORS)} onRetry={() => order.refetch()} />
      </Screen>
    );
  }

  const amount = watch('amount');

  return (
    <FormScreen
      title="Record payment"
      back={() => navigation.goBack()}
      footer={
        <Button
          label="Save payment"
          size="lg"
          fullWidth
          disabled={!customerId || !online}
          loading={chaining}
          onPress={handleSubmit(onSubmit)}
        />
      }
    >
      <OfflineBanner />

      {error ? <Banner tone="danger" title={error} /> : null}

      {customerId ? (
        <Card style={styles.header}>
          {order.data ? <Text variant="h4">{order.data.number}</Text> : null}
          <Text variant={order.data ? 'bodySm' : 'h4'} color={order.data ? 'textMuted' : 'text'}>
            {customerName ?? '—'}
          </Text>
        </Card>
      ) : (
        <Card style={styles.header}>
          <Text variant="bodySm" color="textMuted">Pick who this money came from.</Text>
          <Button
            label="Choose customer"
            variant="outline"
            onPress={() => navigation.navigate('CustomerSearch', { onPick: 'payment' })}
          />
        </Card>
      )}

      <AgainstSelector value={against} onChange={setAgainst} hasOrder={!!orderId} />

      <Controller
        control={control}
        name="amount"
        render={({ field, fieldState }) => (
          <MoneyInput
            label="Amount"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            autoFocus
          />
        )}
      />

      {/* Both order-tagged choices overshoot the same receivable — "against
          invoice" is still money against this order, so the excess lands
          on the customer's account exactly the same way. */}
      {against !== 'customer' && order.data ? (
        <ExcessInfo amount={amount} receivable={order.data.summary.receivable} />
      ) : null}

      <Controller
        control={control}
        name="payment_mode_id"
        render={({ field, fieldState }) =>
          // `Select` renders its own "MODE" label and its own error line;
          // the chip row has neither, so only that branch gets them here
          // (rendering both around a `Select` reads as a stutter — caught
          // on-device, where this DB has more than four active modes).
          activeModes.length > MAX_MODE_CHIPS ? (
            <Select
              label="Mode"
              value={field.value || null}
              options={activeModes.map((mode) => ({ label: mode.name, value: mode.id }))}
              onChange={(v) => field.onChange(v ?? '')}
              error={fieldState.error?.message}
            />
          ) : (
            <View style={styles.modes}>
              <Text variant="label" color="textMuted">Mode</Text>
              <SegmentedControl
                options={activeModes.map((mode) => ({ label: mode.name, value: mode.id }))}
                value={field.value}
                onChange={field.onChange}
              />
              {fieldState.error ? (
                <Text variant="caption" color="textMuted">{fieldState.error.message}</Text>
              ) : null}
            </View>
          )
        }
      />

      <Controller
        control={control}
        name="payment_date"
        render={({ field, fieldState }) => (
          <View>
            <DateField
              label="Payment date"
              value={field.value}
              onChange={(v) => field.onChange(v ?? todayIso())}
              maximumDate={todayLocalDate()}
            />
            {/* `DateField` has no `error` slot of its own, and the picker's
                `maximumDate` already makes a future date unpickable — but a
                silently rejected form is worse than a redundant line, so
                the backstop rule still gets somewhere to speak. */}
            {fieldState.error ? (
              <Text variant="caption" color="textMuted">{fieldState.error.message}</Text>
            ) : null}
          </View>
        )}
      />

      <Controller
        control={control}
        name="reference"
        render={({ field, fieldState }) => (
          <Input
            label="Reference"
            accessibilityLabel="Reference"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="UTR / cheque no."
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="remarks"
        render={({ field, fieldState }) => (
          <Input
            label="Remarks"
            accessibilityLabel="Remarks"
            value={field.value}
            onChangeText={field.onChange}
            multiline
            error={fieldState.error?.message}
          />
        )}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  skeletonGap: { gap: space[3] },
  header: { gap: space[2] },
  modes: { gap: space[2] },
});
