import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FileDown } from 'lucide-react-native';
import { Button, Card, Divider, HeaderRow, IconButton, StatusChip, Text } from '@/ui';
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
    <Card>
      <Text variant="label" color="muted">Invoices</Text>
      {invoices.map((inv, index) => (
        <View key={inv.id}>
          {index > 0 ? <Divider style={styles.rule} /> : null}
          <View style={styles.row}>
            <View style={styles.main}>
              <HeaderRow>
                <Text variant="rowStrong" numberOfLines={1}>{inv.number ?? 'Draft'}</Text>
                <StatusChip tone={invoiceStatusTone(inv.status)} label={invoiceStatusLabel(inv.status)} size="sm" />
              </HeaderRow>
              <Text variant="caption" color="muted">
                {formatMoney(inv.net)} · due {formatDate(inv.due_date)}
              </Text>
            </View>
            {onPay && inv.status === 'submitted' ? (
              <Button label="Pay" variant="outline" size="sm" onPress={() => onPay(inv)} />
            ) : null}
            <IconButton
              icon={FileDown}
              label={`Download ${inv.number ?? 'invoice'} PDF`}
              variant="surface"
              onPress={() => onDownloadPdf(inv)}
            />
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[3] },
  main: { flex: 1, gap: space[1] - 2 },
  rule: { marginTop: space[3] },
});
