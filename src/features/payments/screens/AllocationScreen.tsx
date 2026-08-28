import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen, FormScreen, Card, HeaderRow, Text, Button, Banner, ErrorState, OfflineBanner, Skeleton, useIsOnline, useTheme } from '@/ui';
import { gapList, space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { cmpMoney } from '@/lib/sales/calc';
import { getErrorMessage } from '@/lib/api/errors';
import { PAYMENT_ERRORS } from '@/lib/sales/errors';
import { useInvoice } from '@/features/invoices/hooks';
import type { RootStackParamList } from '@/navigation/types';
import { usePayment, useSuggestAllocation, useSetAllocations } from '../hooks';
import {
  initAllocations,
  setRowAmount,
  toAllocationsIn,
  totals,
  type AllocationRowState,
  type EnsureInvoice,
} from '../allocation';
import { AllocationRow } from '../components/AllocationRow';
import { PaymentsSkeleton } from '../components/PaymentsSkeleton';

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
 *
 * Two things the suggestion cannot be trusted to do on its own:
 *
 * 1. It **drops any invoice it would fill with zero**
 *    (`payments.service.suggest_allocation`). So the invoice the rep tapped
 *    "Pay" on — a later one, or one FIFO already spent the payment before
 *    reaching — can be missing entirely, and focusing "its" row would focus
 *    nothing while SAVE quietly paid a different invoice. When that happens
 *    the invoice is fetched (`GET /invoices/{id}`, the only source of its real
 *    `outstanding`) and appended as a zero row, said out loud in a banner.
 *    If *that* fetch fails there is no honest row for it and SAVE is
 *    blocked outright — paying whatever FIFO happened to propose while the
 *    rep believes they are paying the invoice they tapped is worse than
 *    refusing.
 * 2. It **must never re-seed over the rep's own edits.** The rows are seeded
 *    once, and afterwards only by SUGGEST (FIFO) — an explicit request. Any
 *    other refetch (the invalidation every payment mutation fires, a
 *    remount's background refresh) leaves what was typed alone; otherwise a
 *    deliberately zeroed row would come back and the next SAVE would pay it.
 */
export function AllocationScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Allocation'>>();
  const { paymentId, invoiceId } = route.params;
  const theme = useTheme();
  const online = useIsOnline();

  const payment = usePayment(paymentId);
  // A draft has nothing to allocate and the server answers `not_submitted` —
  // so the suggestion waits until the payment's real status says otherwise.
  const suggest = useSuggestAllocation(paymentId, payment.data?.status === 'submitted');
  const save = useSetAllocations();

  // The invoice the rep came from, but only when the suggestion left it out:
  // in the normal case this request never fires.
  const missingFromSuggestion =
    !!invoiceId && !!suggest.data && !suggest.data.allocations.some((row) => row.invoice_id === invoiceId);
  const invoice = useInvoice(invoiceId ?? '', missingFromSuggestion);
  const ensureInvoice: EnsureInvoice | undefined =
    missingFromSuggestion && invoice.data
      ? {
          invoice_id: invoice.data.id,
          invoice_number: invoice.data.number,
          so_id: invoice.data.so_id,
          so_number: invoice.data.so_number,
          due_date: invoice.data.due_date,
          outstanding: invoice.data.outstanding,
        }
      : undefined;

  const [rows, setRows] = useState<AllocationRowState[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amount = payment.data?.amount ?? '0.00';

  // Seeded once, then only on an explicit SUGGEST (FIFO). `reseedRef` is that
  // request; `seededAtRef` is the suggestion snapshot already spent on the
  // rows, so a refetch returning identical data still counts as a new
  // snapshot (`dataUpdatedAt` moves) and the button never looks inert.
  const reseedRef = useRef(false);
  const seededAtRef = useRef<number | null>(null);
  const suggestedAt = suggest.dataUpdatedAt;
  useEffect(() => {
    if (!suggest.data || !payment.data) return;
    if (rows !== null && !reseedRef.current) return;
    if (seededAtRef.current === suggestedAt) return;
    // The appended row's figures are worth waiting for; an outright failure
    // to fetch the invoice is not worth blocking the whole screen on, so a
    // settled-but-empty query seeds without it.
    if (missingFromSuggestion && invoice.isPending) return;
    seededAtRef.current = suggestedAt;
    reseedRef.current = false;
    setRows(initAllocations(suggest.data.allocations, payment.data.amount, { ensureInvoice }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedAt, rows, missingFromSuggestion, invoice.isPending, invoice.data]);

  function handleSuggest() {
    reseedRef.current = true;
    suggest.refetch();
  }

  function handleSave() {
    if (!rows) return;
    setError(null);
    save.mutate(
      { id: paymentId, body: toAllocationsIn(rows) },
      {
        onSuccess: () => {
          // Always leave. A `different_order` warning is not a failure — the
          // allocation is saved — and the payment detail is where it belongs:
          // the mutation's own response seeds `keys.payment(id)` warnings and
          // all (`afterPaymentMutation` deliberately does not invalidate that
          // line), so the detail renders them. Staying here would leave rows
          // seeded from a now-stale suggestion sitting over a payment that
          // has already been allocated, one SAVE away from paying twice.
          navigation.navigate('PaymentDetail', { id: paymentId });
        },
        onError: (e) => setError(getErrorMessage(e, PAYMENT_ERRORS)),
      },
    );
  }

  // The appended invoice's figures are part of the first paint too, so its
  // fetch holds the skeleton rather than flashing a row-less screen.
  if (
    payment.isPending ||
    (suggest.isPending && payment.data?.status === 'submitted') ||
    (missingFromSuggestion && invoice.isPending)
  ) {
    return (
      <Screen title="Allocate payment" back={() => navigation.goBack()}>
        <OfflineBanner />
        <View style={styles.skeletonGap}>
          <Skeleton width="100%" height={92} />
          <PaymentsSkeleton count={3} />
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
  // The invoice the rep came here to pay could not be loaded, so it has no row
  // — and every row that *is* on screen belongs to some other invoice. Saving
  // now would pay the wrong thing under the rep's nose, so it is refused
  // outright rather than merely warned about.
  const invoiceUnavailable = missingFromSuggestion && !ensureInvoice;
  const blocked =
    t.overAllocated || Object.keys(t.rowErrors).length > 0 || invoiceUnavailable || !online;

  return (
    <FormScreen
      title="Allocate payment"
      back={() => navigation.goBack()}
      footer={
        <View style={styles.footerRows}>
          <Text variant="rowStrong" color={t.overAllocated ? theme.colors.tone.danger.fg : theme.colors.text}>
            {`Allocated ${formatMoney(t.allocated)} · Unallocated ${formatMoney(t.unallocated)}`}
          </Text>
          <View style={styles.buttons}>
            <View style={styles.button}>
              <Button
                label="Suggest (FIFO)"
                variant="outline"
                fullWidth
                loading={suggest.isFetching}
                onPress={handleSuggest}
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
      }
    >
      {/* One wrapper so the rows keep their own tighter rhythm than
          `FormScreen`'s default gap between fields. */}
      <View style={styles.rows}>
        {/* The payment itself, as the jet hero card the frame gives it: what
            came in on the left, what is still unspent on the right. */}
        <Card variant="hero" style={styles.header}>
          <HeaderRow>
            <View>
              <Text variant="label" color={theme.colors.heroLabel}>{payment.data.number ?? 'Draft'}</Text>
              <Text variant="kpi" color={theme.colors.heroText}>{formatMoney(amount)}</Text>
            </View>
            <View style={styles.headerRight}>
              <Text variant="label" color={theme.colors.heroLabel}>Unallocated</Text>
              <Text variant="statMoney" color={theme.colors.heroText}>{formatMoney(t.unallocated)}</Text>
            </View>
          </HeaderRow>
          <Text variant="caption" color={theme.colors.heroLabel}>{payment.data.customer_name}</Text>
        </Card>

        <OfflineBanner />

        {error ? <Banner tone="danger" title={error} /> : null}
        {/* The Σ guard, said once and loudly: the rows currently add up to
            more than the payment, so nothing can be saved. */}
        {t.overAllocated ? (
          <Banner
            tone="danger"
            title={`Over-allocated by ${formatMoney(t.unallocated.replace('-', ''))}`}
            body="Reduce a row until the allocation fits the payment."
          />
        ) : null}
        {invoiceUnavailable ? (
          <Banner
            tone="danger"
            title="Couldn't load that invoice — allocate it from the payment detail instead"
          />
        ) : null}
        {ensureInvoice ? (
          <Banner
            tone="warning"
            title={`FIFO suggestion doesn't cover ${ensureInvoice.invoice_number ?? 'this invoice'}; enter the amount to allocate to it`}
          />
        ) : null}

        {current.length === 0 ? (
          <Banner
            tone="info"
            title="Nothing open to settle"
            body="This payment stays on the customer's account as an advance."
          />
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

        {/* PRD §26: an over-payment is allowed and lands on the customer —
            said before SAVE rather than discovered on the detail afterwards. */}
        {current.length > 0 && !t.overAllocated && cmpMoney(t.unallocated, '0') > 0 ? (
          <Banner
            tone="info"
            title={`Excess ${formatMoney(t.unallocated)} becomes an advance on the customer`}
          />
        ) : null}
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  rows: { gap: gapList },
  footerRows: { gap: space[2] },
  skeletonGap: { gap: space[3] },
  header: { gap: space[2] },
  headerRight: { alignItems: 'flex-end' },
  buttons: { flexDirection: 'row', gap: space[2] },
  button: { flex: 1 },
});
