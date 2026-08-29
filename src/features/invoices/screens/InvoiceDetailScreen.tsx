import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Share2, FileDown } from 'lucide-react-native';
import { Banner, Button, Card, Chip, Divider, ErrorState, FactRow, HeaderRow, IconButton, Screen, Skeleton, StatusChip, StepBar, Text, useBottomClearance } from '@/ui';
import { gapChips, gapList, space } from '@/ui/tokens/spacing';
import { hit } from '@/ui/tokens/layout';
import { toast } from '@/ui/Toast';
import { formatDate } from '@/lib/format/date';
import { formatMoney } from '@/lib/format/money';
import { formatQty } from '@/lib/format/qty';
import { cmpMoney } from '@/lib/sales/calc';
import { invoiceStatusLabel, invoiceStatusTone } from '@/lib/sales/status';
import { getBillingErrorMessage } from '@/lib/billing/errors';
import { permissionHint } from '@/lib/permissions/copy';
import { useMe } from '@/features/auth/hooks';
import { hasPermission } from '@/lib/permissions';
import { openPdf, sharePdf } from '@/native/pdf';
import { ReasonSheet, type ReasonSheetHandle } from '@/features/orders/components/ReasonSheet';
import type { RootStackParamList } from '@/navigation/types';
import { useInvoice, useSubmitInvoice, useCancelInvoice } from '../hooks';
import { invoicesApi } from '../api';
import { INVOICE_STEPS, invoiceStep, invoiceNextAction } from '../steps';
import { InvoiceLines, invoiceTaxLabel } from '../components/InvoiceLines';

type Nav = NativeStackNavigationProp<RootStackParamList, 'InvoiceDetail'>;

/**
 * The invoice's own page (`invoice-detail` frame): which order and notes it
 * bills, what it charges, and the one action that moves it along — read off
 * the invoice's real `status`, never guessed forward.
 *
 * Three actions, each gated by its own permission code (never a role):
 * SUBMIT while it is a draft (`invoice.submit`), RECORD PAYMENT once it is
 * submitted and therefore owes something (`payment.create`), and CANCEL while
 * it is still a draft (`invoice.cancel`). The PDF is offered to anyone who can
 * read the invoice at all.
 */
export function InvoiceDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'InvoiceDetail'>>();
  const { id } = route.params;

  const { data: me } = useMe();
  const { data, isPending, isError, error, refetch } = useInvoice(id);
  const submit = useSubmitInvoice();
  const cancel = useCancelInvoice();
  const reasonRef = useRef<ReasonSheetHandle>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const clearance = useBottomClearance();

  function can(code: string) {
    return hasPermission(me, code);
  }

  /** Downloads once, then opens or shares — `pdfLoading` guards only the
   * download (see `OrderDetailScreen`'s note on why it is not tied to the
   * share sheet, which never resolves on a plain cancel). */
  async function withPdf(then: (fileUrl: string, name: string) => Promise<void>) {
    if (!data) return;
    const name = data.number ?? 'Invoice';
    setPdfLoading(true);
    let fileUrl: string;
    try {
      fileUrl = await invoicesApi.pdf(data.id, data.number);
    } catch (e) {
      setPdfLoading(false);
      toast.show(getBillingErrorMessage(e));
      return;
    }
    setPdfLoading(false);
    then(fileUrl, name).catch((e) => toast.show(getBillingErrorMessage(e)));
  }

  function handleSubmit() {
    if (!data) return;
    submit.mutate(data.id, { onError: (e) => toast.show(getBillingErrorMessage(e)) });
  }

  function handleCancel(reason: string) {
    cancel.mutate(
      { id, reason },
      {
        onSuccess: () => reasonRef.current?.close(),
        onError: (e) => toast.show(getBillingErrorMessage(e)),
      },
    );
  }

  if (isPending) {
    return (
      <Screen title="Invoice" back={() => navigation.goBack()}>
        <View style={styles.skeletonGap}>
          <Skeleton width="100%" height={200} />
          <Skeleton width="100%" height={90} />
        </View>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen title="Invoice" back={() => navigation.goBack()}>
        <ErrorState message={getBillingErrorMessage(error)} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const step = invoiceStep(data.status);
  const next = invoiceNextAction(data, can);
  const taxLabel = invoiceTaxLabel(data);
  const payable = data.status === 'submitted' && can('payment.create');
  const canReadPdf = can('invoice.read');

  return (
    <Screen
      title={data.number ?? 'Draft invoice'}
      back={() => navigation.goBack()}
      edges={['top', 'left', 'right', 'bottom']}
      right={
        canReadPdf ? (
          <IconButton
            icon={Share2}
            label="Share PDF"
            onPress={() => withPdf((url, name) => sharePdf(url, name))}
            disabled={pdfLoading}
          />
        ) : null
      }
    >
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: clearance }]}>
        <Card>
          <HeaderRow>
            <Pressable
              onPress={() => navigation.navigate('OrderDetail', { id: data.so_id })}
              accessibilityRole="button"
              hitSlop={hit.link}
              style={styles.headerMain}
            >
              <Text variant="caption" color="muted" numberOfLines={1}>
                {`${data.so_number} · ${data.customer_name}`}
              </Text>
              <Text variant="cardTitle">{data.number ?? 'Draft invoice'}</Text>
            </Pressable>
            <StatusChip tone={invoiceStatusTone(data.status)} label={invoiceStatusLabel(data.status)} />
          </HeaderRow>

          <Divider style={styles.rule} />

          <FactRow label="Invoice date" value={formatDate(data.invoice_date)} />
          <FactRow label="Due date" value={formatDate(data.due_date)} />
          <FactRow label="Taxable" value={formatMoney(data.taxable)} />
          {/* The rate is the document's own, read off its lines — PRD
              non-negotiable #5: never a hard-coded assumption about GST. */}
          {taxLabel ? <FactRow label={taxLabel} value={formatMoney(data.tax)} /> : null}

          <Divider style={styles.rule} />

          <HeaderRow>
            <Text variant="label" color="muted">Net</Text>
            <Text variant="statMoney">{formatMoney(data.net)}</Text>
          </HeaderRow>
        </Card>

        {/* Only a draft has a step left to drive; a submitted invoice's track
            is finished, and paying it is a different document. */}
        {next ? (
          <StepBar
            steps={INVOICE_STEPS}
            current={step.current}
            failed={step.failed}
            continueLabel={next.label}
            continueDisabled={!next.enabled}
            continueHint={permissionHint(next.permission)}
            continueLoading={submit.isPending}
            onContinue={next.enabled ? handleSubmit : undefined}
          />
        ) : null}

        <Card padding="row">
          <Text variant="label" color="muted">Delivery notes</Text>
          {/* Whole-DN invoicing (PRD §21): each of these is billed entire, so
              there is a note list here rather than a second lines table. */}
          {data.delivery_notes.map((note) => (
            <View key={note.dn_id} style={styles.noteRow}>
              <Text variant="rowStrong" numberOfLines={1}>{note.number}</Text>
              <Text variant="caption" color="muted">
                {`${formatDate(note.delivered_on ?? note.dn_date)} · ${formatQty(note.qty_total)} units`}
              </Text>
            </View>
          ))}
        </Card>

        <InvoiceLines invoice={data} />

        {data.status === 'submitted' ? (
          <Card padding="row">
            <Text variant="label" color="muted">Payment</Text>
            <View style={styles.chips}>
              <Chip label={`Paid ${formatMoney(data.paid_amount)}`} tone="success" size="sm" />
              <Chip
                label={`Outstanding ${formatMoney(data.outstanding)}`}
                /* Compared as money, never as a `Number`: `cmpMoney` reads
                   both sides as exact paise, so `'0.00'`, `'0'` and `''` are
                   all "nothing owed" and a fraction of a paisa is not rounded
                   into one. */
                tone={cmpMoney(data.outstanding, '0') > 0 ? 'danger' : 'neutral'}
                size="sm"
              />
            </View>
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

        {data.status === 'draft' ? (
          <Banner
            tone="info"
            title="Draft — not numbered yet"
            body="Submitting it assigns the invoice number and makes it payable."
          />
        ) : null}

        {/* Only while it is a draft: a submitted invoice has been numbered and
            may already be paid, so cancelling it is a back-office correction
            rather than a mobile action. */}
        {can('invoice.cancel') && data.status === 'draft' ? (
          <Button
            label="Cancel invoice"
            variant="outline"
            fullWidth
            destructive
            onPress={() => reasonRef.current?.open()}
          />
        ) : null}
      </ScrollView>

      {canReadPdf || payable ? (
        <View style={styles.footer}>
          {canReadPdf ? (
            <View style={styles.footerButton}>
              <Button
                label="PDF"
                accessibilityLabel="Download PDF"
                variant="outline"
                icon={FileDown}
                fullWidth
                disabled={pdfLoading}
                loading={pdfLoading}
                onPress={() => withPdf((url, name) => openPdf(url, name))}
              />
            </View>
          ) : null}
          {payable ? (
            <View style={styles.footerPrimary}>
              <Button
                label="Record payment"
                fullWidth
                onPress={() =>
                  navigation.navigate('RecordPayment', {
                    orderId: data.so_id,
                    customerId: data.customer_id,
                    invoiceId: data.id,
                  })
                }
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <ReasonSheet
        ref={reasonRef}
        title="Cancel invoice"
        placeholder="Why is this invoice being cancelled?"
        confirmLabel="Cancel invoice"
        loading={cancel.isPending}
        onConfirm={handleCancel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: gapList },
  skeletonGap: { gap: space[3] },
  headerMain: { flexShrink: 1, gap: space[1] },
  rule: { marginVertical: space[3] },
  noteRow: { gap: space[1], marginTop: space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: gapChips, marginTop: space[3] },
  footer: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3] },
  footerButton: { flex: 1 },
  footerPrimary: { flex: 2 },
});
