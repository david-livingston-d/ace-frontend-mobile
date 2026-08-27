import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FileDown } from 'lucide-react-native';
import { Text, StatusChip, IconButton, Button } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatDate } from '@/lib/format/date';
import { invoiceStatusLabel, invoiceStatusTone } from '@/lib/sales/status';
import type { InvoiceSummary } from '../types';

export type InvoicesSectionProps = {
  invoices: InvoiceSummary[];
  onDownloadPdf: (invoice: InvoiceSummary) => void;
  /** Recording money against this specific invoice. Omitted (and the action
   * hidden) when the viewer lacks `payment.create` — the caller decides, so
   * this component stays permission-agnostic. Offered only on *submitted*
   * invoices: a draft has no number and owes nothing yet, and a cancelled one
   * is not payable at all — the server refuses both (`invoice_not_submitted`),
   * so offering the action would only ever end in a 422. */
  onPay?: (invoice: InvoiceSummary) => void;
};

export function InvoicesSection({ invoices, onDownloadPdf, onPay }: InvoicesSectionProps) {
  if (invoices.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text variant="h4">Invoices</Text>
      {invoices.map((inv) => (
        <View key={inv.id} style={styles.row}>
          <View style={styles.main}>
            <View style={styles.headerLine}>
              <Text variant="body">{inv.number ?? 'Draft'}</Text>
              <StatusChip tone={invoiceStatusTone(inv.status)} label={invoiceStatusLabel(inv.status)} size="sm" />
            </View>
            <Text variant="bodySm" color="textMuted">
              {formatMoney(inv.net)} · due {formatDate(inv.due_date)}
            </Text>
          </View>
          {onPay && inv.status === 'submitted' ? (
            <Button label="Pay" variant="outline" onPress={() => onPay(inv)} />
          ) : null}
          <IconButton icon={FileDown} label={`Download ${inv.number ?? 'invoice'} PDF`} onPress={() => onDownloadPdf(inv)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: space[4], gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  main: { flex: 1, gap: space[1] },
  headerLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
});
