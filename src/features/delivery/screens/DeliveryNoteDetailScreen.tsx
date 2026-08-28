import React, { useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Share2, FileDown } from 'lucide-react-native';
import { Banner, Button, Card, Divider, ErrorState, HeaderRow, IconButton, Screen, Skeleton, StatusChip, Text, useBottomClearance } from '@/ui';
import { gapList, space } from '@/ui/tokens/spacing';
import { hit } from '@/ui/tokens/layout';
import { toast } from '@/ui/Toast';
import { formatDate } from '@/lib/format/date';
import { formatMoney } from '@/lib/format/money';
import { formatQty } from '@/lib/format/qty';
import { dnStatusLabel, dnStatusTone, invoiceStatusLabel, invoiceStatusTone } from '@/lib/sales/status';
import { getErrorMessage } from '@/lib/api/errors';
import { DELIVERY_ERRORS } from '@/lib/sales/errors';
import { useMe } from '@/features/auth/hooks';
import { hasPermission } from '@/lib/permissions';
import { openPdf, sharePdf } from '@/native/pdf';
import type { RootStackParamList } from '@/navigation/types';
import { useDeliveryNote, useSubmitDeliveryNote, useMarkDelivered } from '../hooks';
import { deliveryNextAction } from '../steps';
import { deliveryApi } from '../api';
import { DeliveryStepBar } from '../components/DeliveryStepBar';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DeliveryNoteDetail'>;

/** One label/value line of the header card (`dn-detail` frame). */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text variant="caption" color="muted">{label}</Text>
      <Text variant="rowStrong">{value}</Text>
    </View>
  );
}

/**
 * The delivery note's own page (`dn-detail` frame): which order it ships
 * against and where from, the lines it carries, and the one action that moves
 * it along — read off the note's real `status`, never guessed forward.
 */
export function DeliveryNoteDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'DeliveryNoteDetail'>>();
  const { id } = route.params;

  const { data: me } = useMe();
  const { data, isPending, isError, error, refetch } = useDeliveryNote(id);
  const submit = useSubmitDeliveryNote();
  const markDelivered = useMarkDelivered();
  const [pdfLoading, setPdfLoading] = useState(false);
  const clearance = useBottomClearance();

  function can(code: string) {
    return hasPermission(me, code);
  }

  async function handlePdf() {
    if (!data) return;
    setPdfLoading(true);
    let fileUrl: string;
    try {
      fileUrl = await deliveryApi.pdf(data.id, data.number);
    } catch (e) {
      setPdfLoading(false);
      toast.show(getErrorMessage(e, DELIVERY_ERRORS));
      return;
    }
    setPdfLoading(false);
    openPdf(fileUrl, data.number).catch((e) => toast.show(getErrorMessage(e, DELIVERY_ERRORS)));
  }

  async function handleShare() {
    if (!data) return;
    setPdfLoading(true);
    let fileUrl: string;
    try {
      fileUrl = await deliveryApi.pdf(data.id, data.number);
    } catch (e) {
      setPdfLoading(false);
      toast.show(getErrorMessage(e, DELIVERY_ERRORS));
      return;
    }
    setPdfLoading(false);
    sharePdf(fileUrl, data.number).catch((e) => toast.show(getErrorMessage(e, DELIVERY_ERRORS)));
  }

  function handleContinue() {
    if (!data) return;
    if (data.status === 'draft') {
      submit.mutate(data.id, { onError: (e) => toast.show(getErrorMessage(e, DELIVERY_ERRORS)) });
    } else if (data.status === 'submitted') {
      markDelivered.mutate(
        { id: data.id, body: {} },
        { onError: (e) => toast.show(getErrorMessage(e, DELIVERY_ERRORS)) },
      );
    }
  }

  if (isPending) {
    return (
      <Screen title="Delivery note" back={() => navigation.goBack()}>
        <View style={styles.skeletonGap}>
          <Skeleton width="100%" height={160} />
          <Skeleton width="100%" height={90} />
        </View>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen title="Delivery note" back={() => navigation.goBack()}>
        <ErrorState message={getErrorMessage(error, DELIVERY_ERRORS)} onRetry={() => refetch()} />
      </Screen>
    );
  }

  const next = deliveryNextAction(data.status);
  const canContinue = !!next && can(next.permission);
  const dispatchFrom = data.dispatch_warehouse_name ?? data.warehouse_name;

  return (
    <Screen
      title={data.number}
      back={() => navigation.goBack()}
      edges={['top', 'left', 'right', 'bottom']}
      right={<IconButton icon={Share2} label="Share PDF" onPress={handleShare} disabled={pdfLoading} />}
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
              <Text variant="caption" color="muted">{data.customer_name}</Text>
              <Text variant="cardTitle">{data.so_number}</Text>
            </Pressable>
            <StatusChip tone={dnStatusTone(data.status)} label={dnStatusLabel(data.status)} />
          </HeaderRow>

          <Divider style={styles.rule} />

          <Fact label="Delivery date" value={formatDate(data.dn_date)} />
          {dispatchFrom ? <Fact label="Dispatched from" value={dispatchFrom} /> : null}
          <Fact label="Value" value={formatMoney(data.net)} />
        </Card>

        <DeliveryStepBar
          status={data.status}
          canContinue={canContinue}
          continueLoading={submit.isPending || markDelivered.isPending}
          onContinue={handleContinue}
        />

        <Card>
          <Text variant="label" color="muted">Lines</Text>
          {/* `caption`, not `label`: three em-spaced uppercase column heads do
              not fit a phone-width card (same call `DeliverySection` made). */}
          <View style={[styles.lineRow, styles.lineHead]}>
            <Text variant="caption" color="subtle" style={styles.itemCol} numberOfLines={1}>Item</Text>
            <Text variant="caption" color="subtle" style={styles.qtyCol} align="right" numberOfLines={1}>Qty</Text>
            <Text variant="caption" color="subtle" style={styles.amountCol} align="right" numberOfLines={1}>Amount</Text>
          </View>
          {data.lines.map((line) => (
            <View key={line.id} style={styles.lineRow}>
              <Text variant="row" style={styles.itemCol} numberOfLines={2}>
                {line.sku}
                {line.variant_label ? ` · ${line.variant_label}` : ''}
              </Text>
              {/* "8 of 40" — what this note ships, out of what the order line
                  asked for; the pair is the point of a partial delivery. */}
              <Text variant="row" style={styles.qtyCol} align="right">
                {formatQty(line.qty)} of {formatQty(line.so_qty ?? line.qty)}
              </Text>
              <Text variant="rowStrong" style={styles.amountCol} align="right">{formatMoney(line.line_total)}</Text>
            </View>
          ))}
        </Card>

        {data.remarks ? (
          <Card variant="note">
            <Text variant="caption" color="muted">{data.remarks}</Text>
          </Card>
        ) : null}

        {data.invoice ? (
          <Card padding="row">
            <View style={styles.invoiceRow}>
              <Text variant="label" color="muted">Invoice</Text>
              <StatusChip
                tone={invoiceStatusTone(data.invoice.status)}
                label={data.invoice.number ?? invoiceStatusLabel(data.invoice.status)}
                size="sm"
              />
            </View>
          </Card>
        ) : (
          <Banner
            tone="info"
            title="Not invoiced yet"
            body="Invoicing is whole-DN — the invoice takes every line on this note."
          />
        )}
      </ScrollView>

      {/* The action bar. Task 9 adds "Create invoice" as the primary beside
          this PDF action — the row is already the frame's two-slot shape. */}
      <View style={styles.footer}>
        <View style={styles.footerButton}>
          <Button
            label="Download PDF"
            accessibilityLabel="Download PDF"
            variant="outline"
            icon={FileDown}
            fullWidth
            disabled={pdfLoading}
            loading={pdfLoading}
            onPress={handlePdf}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: gapList },
  skeletonGap: { gap: space[3] },
  headerMain: { flexShrink: 1, gap: space[1] },
  rule: { marginVertical: space[3] },
  fact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3], paddingVertical: space[1] },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[2] },
  lineHead: { marginTop: space[3] },
  itemCol: { flex: 1 },
  qtyCol: { flexBasis: '24%' },
  amountCol: { flexBasis: '28%' },
  invoiceRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  footer: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[4], paddingVertical: space[3] },
  footerButton: { flex: 1 },
});
