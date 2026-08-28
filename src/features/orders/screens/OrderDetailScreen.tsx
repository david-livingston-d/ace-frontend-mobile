import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Share2 } from 'lucide-react-native';
import { Banner, Card, ErrorState, Expander, HeaderRow, IconButton, Screen, Skeleton, StatusChip, Text, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { toast } from '@/ui/Toast';
import { formatMoney } from '@/lib/format/money';
import { formatDate, dueTone, todayIso } from '@/lib/format/date';
import { phaseLabel, phaseTone } from '@/lib/sales/status';
import { getErrorMessage } from '@/lib/api/errors';
import { SALES_ERRORS } from '@/lib/sales/errors';
import { useMe } from '@/features/auth/hooks';
import { hasPermission } from '@/lib/permissions';
import { openPdf, sharePdf } from '@/native/pdf';
import type { RootStackParamList } from '@/navigation/types';
import { useOrder, useVerifyOrder, useCancelOrder } from '../hooks';
import { ordersApi } from '../api';
import { invoicesApi } from '@/features/invoices/api';
import { visibleActions } from '../actions';
import { PhaseProgress } from '../components/PhaseProgress';
import { LineItemCard } from '../components/LineItemCard';
import { TaxBreakdown } from '../components/TaxBreakdown';
import { DeliverySection } from '../components/DeliverySection';
import { InvoicesSection } from '../components/InvoicesSection';
import { PaymentsSection } from '../components/PaymentsSection';
import { ActionBar } from '../components/ActionBar';
import { ConfirmSheet, type ConfirmSheetHandle } from '../components/ConfirmSheet';
import { ReasonSheet, type ReasonSheetHandle } from '../components/ReasonSheet';
import type { InvoiceSummary } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OrderDetail'>;

export function OrderDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'OrderDetail'>>();
  const { id } = route.params;
  const theme = useTheme();

  const { data: me } = useMe();
  const { data: order, isPending, isError, error, refetch } = useOrder(id);
  const verify = useVerifyOrder();
  const cancel = useCancelOrder();
  const [pdfLoading, setPdfLoading] = useState(false);
  const confirmRef = useRef<ConfirmSheetHandle>(null);
  const reasonRef = useRef<ReasonSheetHandle>(null);

  function can(code: string) {
    return hasPermission(me, code);
  }

  // `pdfLoading` only guards the *download* — once the file is on disk the
  // buttons re-enable immediately, and opening/sharing it happens as a
  // separate, uncoupled step. `Share.open()` on Android is known to resolve
  // only once a share target is actually chosen (never on a plain cancel),
  // so tying the loading flag to it as well would leave the PDF buttons
  // disabled indefinitely whenever the user backs out of the chooser.
  async function handlePdf() {
    if (!order) return;
    setPdfLoading(true);
    let fileUrl: string;
    try {
      fileUrl = await ordersApi.pdf(order.id, order.number);
    } catch (e) {
      setPdfLoading(false);
      toast.show(getErrorMessage(e, SALES_ERRORS));
      return;
    }
    setPdfLoading(false);
    openPdf(fileUrl, order.number).catch((e) => toast.show(getErrorMessage(e, SALES_ERRORS)));
  }

  async function handleShare() {
    if (!order) return;
    setPdfLoading(true);
    let fileUrl: string;
    try {
      fileUrl = await ordersApi.pdf(order.id, order.number);
    } catch (e) {
      setPdfLoading(false);
      toast.show(getErrorMessage(e, SALES_ERRORS));
      return;
    }
    setPdfLoading(false);
    sharePdf(fileUrl, order.number).catch((e) => toast.show(getErrorMessage(e, SALES_ERRORS)));
  }

  async function handleInvoicePdf(invoice: InvoiceSummary) {
    try {
      const fileUrl = await invoicesApi.pdf(invoice.id, invoice.number);
      openPdf(fileUrl, invoice.number ?? 'Invoice').catch((e) => toast.show(getErrorMessage(e, SALES_ERRORS)));
    } catch (e) {
      toast.show(getErrorMessage(e, SALES_ERRORS));
    }
  }

  function handleVerify() {
    verify.mutate(id, {
      onSuccess: () => confirmRef.current?.close(),
      onError: (e) => toast.show(getErrorMessage(e, SALES_ERRORS)),
    });
  }

  function handleCancel(reason: string) {
    cancel.mutate(
      { id, reason },
      {
        onSuccess: () => reasonRef.current?.close(),
        onError: (e) => toast.show(getErrorMessage(e, SALES_ERRORS)),
      },
    );
  }

  if (isPending) {
    return (
      <Screen title="Order" back={() => navigation.goBack()}>
        <View style={styles.skeletonGap}>
          <Skeleton width="100%" height={110} />
          <Skeleton width="100%" height={24} />
          <Skeleton width="100%" height={90} />
        </View>
      </Screen>
    );
  }

  if (isError || !order) {
    return (
      <Screen title="Order" back={() => navigation.goBack()}>
        <ErrorState message={getErrorMessage(error, SALES_ERRORS)} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const actions = visibleActions({ phase: order.phase, lines: order.lines, can });
  const committedTone = order.expected_delivery_date ? dueTone(order.expected_delivery_date, todayIso()) : 'neutral';
  const failReason = order.cancel_reason ?? order.close_reason;

  return (
    <Screen
      title={order.number}
      back={() => navigation.goBack()}
      // The action bar is the screen's footer rather than a row inside its
      // body: `Screen` pays the bottom safe-area inset for it (which is why
      // `edges` still leaves `bottom` out) and its top border spans the full
      // width instead of stopping at the body gutter.
      footer={
        <ActionBar
          actions={actions}
          onEdit={() => navigation.navigate('NewOrder', { editOrderId: id })}
          onVerify={() => confirmRef.current?.open()}
          onCancel={() => reasonRef.current?.open()}
          onRecordDelivery={() => navigation.navigate('RecordDelivery', { orderId: id })}
          onRecordPayment={() => navigation.navigate('RecordPayment', { orderId: id, customerId: order.customer_id })}
          onPdf={handlePdf}
          pdfLoading={pdfLoading}
        />
      }
      right={
        actions.includes('pdf') ? (
          <IconButton icon={Share2} label="Share PDF" onPress={handleShare} disabled={pdfLoading} />
        ) : null
      }
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Card style={styles.headerCard}>
          <HeaderRow>
            <Pressable
              onPress={() => navigation.navigate('CustomerDetail', { id: order.customer_id })}
              accessibilityRole="button"
              style={styles.customerLink}
            >
              <Text variant="h4">{order.customer_name}</Text>
            </Pressable>
            <StatusChip tone={phaseTone(order.phase)} label={phaseLabel(order.phase)} />
          </HeaderRow>
          <Text variant="money" style={styles.net}>{formatMoney(order.net)}</Text>
          <Text variant="bodySm" color="textMuted">Order date {formatDate(order.order_date)}</Text>
          {order.expected_delivery_date ? (
            <Text variant="bodySm" color={theme.colors.tone[committedTone].fg}>
              Committed {formatDate(order.expected_delivery_date)}
            </Text>
          ) : null}
        </Card>

        <PhaseProgress
          phase={order.phase}
          invoiceStatus={order.invoice_status}
          paymentStatus={order.payment_status}
          reason={failReason}
        />

        {order.warnings.map((w) => (
          <Banner key={w.code} tone="warning" title={w.message} />
        ))}

        <View style={styles.lines}>
          {order.lines.map((line) => (
            <LineItemCard key={line.id} line={line} />
          ))}
        </View>

        <Expander title="VIEW TAX BREAKDOWN">
          <TaxBreakdown order={order} />
        </Expander>

        <DeliverySection
          deliveryNotes={order.delivery_notes}
          shortages={order.shortages}
          onOpenDn={(dnId) => navigation.navigate('DeliveryNoteDetail', { id: dnId })}
        />

        <InvoicesSection
          invoices={order.invoices}
          onDownloadPdf={handleInvoicePdf}
          onPay={
            can('payment.create')
              ? (invoice) =>
                  navigation.navigate('RecordPayment', {
                    orderId: id,
                    customerId: order.customer_id,
                    invoiceId: invoice.id,
                  })
              : undefined
          }
        />

        <PaymentsSection
          summary={order.summary}
          payments={order.payments}
          onOpenPayment={(payId) => navigation.navigate('PaymentDetail', { id: payId })}
        />

        <Pressable onPress={() => navigation.navigate('OrderTimeline', { id })} style={styles.timelineLink}>
          <Text variant="bodySm" color="textMuted">View full timeline →</Text>
        </Pressable>
      </ScrollView>

      <ConfirmSheet
        ref={confirmRef}
        title="Send to stock check?"
        body="Items will freeze once verified"
        confirmLabel="Confirm"
        loading={verify.isPending}
        onConfirm={handleVerify}
      />
      <ReasonSheet
        ref={reasonRef}
        title="Cancel order"
        placeholder="Why is this order being cancelled?"
        confirmLabel="Cancel order"
        loading={cancel.isPending}
        onConfirm={handleCancel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space[6] },
  skeletonGap: { gap: space[3] },
  headerCard: { marginBottom: space[3] },
  customerLink: { flexShrink: 1 },
  net: { marginTop: space[2] },
  lines: { marginTop: space[4] },
  timelineLink: { marginTop: space[5], alignSelf: 'flex-start' },
});
