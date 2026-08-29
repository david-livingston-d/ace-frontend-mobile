import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { FileDown } from 'lucide-react-native';
import { Button, Card, Divider, HeaderRow, IconButton, StatusChip, Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { hit } from '@/ui/tokens/layout';
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
  /** Opening the invoice's own page. Omitted (and the row inert) when the
   * viewer lacks `invoice.read` — the caller decides. */
  onOpen?: (invoice: InvoiceSummary) => void;
  /** Picking a *draft* back up: a create whose submit failed halfway leaves a
   * real, numberless invoice behind, and this is how it is finished rather
   * than abandoned. Offered on drafts only, and only when the caller says the
   * viewer can submit one. */
  onContinue?: (invoice: InvoiceSummary) => void;
};

export function InvoicesSection({ invoices, onDownloadPdf, onPay, onOpen, onContinue }: InvoicesSectionProps) {
  if (invoices.length === 0) return null;

  return (
    <Card>
      <Text variant="label" color="muted">Invoices</Text>
      {invoices.map((inv, index) => (
        <View key={inv.id}>
          {index > 0 ? <Divider style={styles.rule} /> : null}
          <View style={styles.row}>
            <Pressable
              onPress={onOpen ? () => onOpen(inv) : undefined}
              accessibilityRole={onOpen ? 'button' : undefined}
              accessibilityLabel={onOpen ? `Open ${inv.number ?? 'draft invoice'}` : undefined}
              hitSlop={hit.link}
              style={styles.main}
            >
              <HeaderRow>
                <Text variant="rowStrong" numberOfLines={1}>{inv.number ?? 'Draft'}</Text>
                <StatusChip tone={invoiceStatusTone(inv.status)} label={invoiceStatusLabel(inv.status)} size="sm" />
              </HeaderRow>
              <Text variant="caption" color="muted">
                {formatMoney(inv.net)} · due {formatDate(inv.due_date)}
              </Text>
            </Pressable>
            {onContinue && inv.status === 'draft' ? (
              <Button label="Continue" variant="outline" size="sm" onPress={() => onContinue(inv)} />
            ) : null}
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
