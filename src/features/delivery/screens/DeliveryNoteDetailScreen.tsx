import React, { useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Share2, FileDown } from 'lucide-react-native';
import { Screen, Card, Text, StatusChip, IconButton, ErrorState, Skeleton } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { toast } from '@/ui/Toast';
import { formatDate } from '@/lib/format/date';
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

export function DeliveryNoteDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'DeliveryNoteDetail'>>();
  const { id } = route.params;

  const { data: me } = useMe();
  const { data, isPending, isError, error, refetch } = useDeliveryNote(id);
  const submit = useSubmitDeliveryNote();
  const markDelivered = useMarkDelivered();
  const [pdfLoading, setPdfLoading] = useState(false);

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
          <Skeleton width="100%" height={110} />
          <Skeleton width="100%" height={60} />
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

  return (
    <Screen
      title={data.number}
      back={() => navigation.goBack()}
      edges={['top', 'left', 'right', 'bottom']}
      right={<IconButton icon={Share2} label="Share PDF" onPress={handleShare} disabled={pdfLoading} />}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => navigation.navigate('OrderDetail', { id: data.so_id })}
              accessibilityRole="button"
            >
              <Text variant="h4">{data.so_number}</Text>
            </Pressable>
            <StatusChip tone={dnStatusTone(data.status)} label={dnStatusLabel(data.status)} />
          </View>
          <Text variant="bodySm" color="textMuted">{data.customer_name}</Text>
          <Text variant="bodySm" color="textMuted">{formatDate(data.dn_date)}</Text>
        </Card>

        <DeliveryStepBar status={data.status} canContinue={canContinue} continueLoading={submit.isPending || markDelivered.isPending} onContinue={handleContinue} />

        <View style={styles.lines}>
          {data.lines.map((line) => (
            <View key={line.id} style={styles.lineRow}>
              <Text variant="body">
                {line.sku}
                {line.variant_label ? ` · ${line.variant_label}` : ''}
              </Text>
              <Text variant="bodySm" color="textMuted">
                {line.qty} of {line.so_qty ?? line.qty}
              </Text>
            </View>
          ))}
        </View>

        {data.remarks ? (
          <Text variant="bodySm" color="textMuted" style={styles.remarks}>{data.remarks}</Text>
        ) : null}

        {data.invoice ? (
          <View style={styles.invoiceRow}>
            <Text variant="label" color="textMuted">Invoice</Text>
            <StatusChip tone={invoiceStatusTone(data.invoice.status)} label={data.invoice.number ?? invoiceStatusLabel(data.invoice.status)} size="sm" />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <IconButton icon={FileDown} label="Download PDF" onPress={handlePdf} disabled={pdfLoading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space[6] },
  skeletonGap: { gap: space[3] },
  headerCard: { marginBottom: space[3], gap: space[1] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  lines: { marginTop: space[4], gap: space[2] },
  lineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remarks: { marginTop: space[4] },
  invoiceRow: { marginTop: space[4], flexDirection: 'row', alignItems: 'center', gap: space[2] },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: space[4], paddingVertical: space[3] },
});
