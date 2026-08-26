import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FileDown } from 'lucide-react-native';
import { Text, StatusChip, IconButton } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatDate } from '@/lib/format/date';
import type { InvoiceSummary } from '../types';

export type InvoicesSectionProps = {
  invoices: InvoiceSummary[];
  onDownloadPdf: (invoice: InvoiceSummary) => void;
};

// Invoice status has no dedicated tone table in `lib/sales/status.ts` (that
// file is the sales-order vocabulary) — `submitted`/`paid` read as done,
// `cancelled` as danger, anything else (draft) as neutral.
function invoiceStatusTone(status: string) {
  if (status === 'cancelled') return 'danger' as const;
  if (status === 'submitted' || status === 'paid') return 'success' as const;
  return 'neutral' as const;
}

export function InvoicesSection({ invoices, onDownloadPdf }: InvoicesSectionProps) {
  if (invoices.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text variant="h4">Invoices</Text>
      {invoices.map((inv) => (
        <View key={inv.id} style={styles.row}>
          <View style={styles.main}>
            <View style={styles.headerLine}>
              <Text variant="body">{inv.number ?? 'Draft'}</Text>
              <StatusChip tone={invoiceStatusTone(inv.status)} label={inv.status} size="sm" />
            </View>
            <Text variant="bodySm" color="textMuted">
              {formatMoney(inv.net)} · due {formatDate(inv.due_date)}
            </Text>
          </View>
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
