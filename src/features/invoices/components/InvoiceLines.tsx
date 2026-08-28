import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Divider, Expander, Text } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import { formatQty } from '@/lib/format/qty';
import type { InvoiceDetail } from '../types';

export type InvoiceLinesProps = { invoice: InvoiceDetail };

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text variant={strong ? 'label' : 'bodySm'} color={strong ? 'text' : 'textMuted'}>{label}</Text>
      <Text variant={strong ? 'statMoney' : 'bodySm'}>{formatMoney(value)}</Text>
    </View>
  );
}

/**
 * Whether this invoice is inter-state, straight off the document's own
 * `supply_type` (`'intra' | 'inter'`, decided server-side by comparing the
 * seller's state code to the place of supply — `billing/service.py`).
 *
 * Deliberately *not* inferred from which half of the split is non-zero: a
 * zero-rated inter-state invoice has `igst = '0.00'` and would read as
 * intra-state, and a `Number()` on a money string is exactly the comparison
 * the money rules forbid. The payload already says which it is.
 */
function isInterState(invoice: InvoiceDetail): boolean {
  return invoice.supply_type === 'inter';
}

/**
 * Every distinct GST rate on the invoice's lines, and the label the header
 * card names the tax by. One HSN per line, so an invoice can legitimately mix
 * rates — the label is read off the document (PRD non-negotiable #5: an
 * invoice stores the rate it actually used; nothing here is hard-coded).
 */
export function invoiceTaxLabel(invoice: InvoiceDetail): string | null {
  const interState = isInterState(invoice);
  // Rates are percentages, not money — `'0'`/`'0.00'` here means "this line is
  // exempt", and dropping it keeps a mixed-rate invoice's label honest.
  const rates = [...new Set(invoice.lines.map((l) => (interState ? l.igst_rate : l.cgst_rate)))].filter(
    (r) => Number(r) > 0,
  );
  if (!rates.length) return null;
  const joined = rates.join(' + ');
  return interState ? `IGST ${joined}%` : `CGST ${joined}% + SGST ${joined}%`;
}

/**
 * What the invoice bills, summed over the notes it took (`invoice-detail`
 * frame's lines table). Quantities and money are the sum over the selected
 * notes' lines for each order line — there is nothing to edit here, because an
 * invoice takes each note entire (PRD §21).
 *
 * The full `Qty × Rate → Gross → Discount → Taxable → Tax → Net` chain the
 * shared calculation engine produced sits one tap away in the Expander, so the
 * card leads with what the customer is billed rather than with arithmetic.
 */
export function InvoiceLines({ invoice }: InvoiceLinesProps) {
  return (
    <Card>
      <Text variant="label" color="muted">Lines</Text>
      {/* `caption`, not `label`: four em-spaced uppercase column heads do not
          fit a phone-width card (the same call `DeliveryNoteDetailScreen`'s
          lines table made). */}
      <View style={[styles.lineRow, styles.lineHead]}>
        <Text variant="caption" color="subtle" style={styles.itemCol} numberOfLines={1}>Item</Text>
        <Text variant="caption" color="subtle" style={styles.qtyCol} align="right" numberOfLines={1}>Qty</Text>
        <Text variant="caption" color="subtle" style={styles.rateCol} align="right" numberOfLines={1}>Rate</Text>
        <Text variant="caption" color="subtle" style={styles.amountCol} align="right" numberOfLines={1}>Amount</Text>
      </View>
      {invoice.lines.map((line) => (
        <View key={line.id} style={styles.lineRow}>
          <View style={styles.itemCol}>
            <Text variant="row" numberOfLines={1}>{line.product_name}</Text>
            <Text variant="caption" color="muted" numberOfLines={1}>
              {line.sku}
              {line.variant_label ? ` · ${line.variant_label}` : ''}
            </Text>
          </View>
          <Text variant="row" style={styles.qtyCol} align="right">{formatQty(line.qty)}</Text>
          <Text variant="rowStrong" style={styles.rateCol} align="right">{formatMoney(line.rate)}</Text>
          {/* Pre-tax, so the column adds up to the invoice's own Taxable — the
              tax is a document-level split, shown once on the header card. */}
          <Text variant="rowStrong" style={styles.amountCol} align="right">{formatMoney(line.taxable_amount)}</Text>
        </View>
      ))}

      <Divider style={styles.rule} />

      <Expander title="View tax breakdown">
        <Row label="Gross" value={invoice.gross} />
        <Row label="Line discount" value={invoice.line_discount} />
        <Row label="Order discount" value={invoice.order_discount} />
        <Row label="Taxable" value={invoice.taxable} />
        {/* The half the document actually used (PRD non-negotiable #5:
            intra-state = CGST+SGST, inter-state = IGST). The other half is
            always zero, and a row of zeroes reads as a charge that was waived
            rather than one that never applied. */}
        {isInterState(invoice) ? (
          <Row label="IGST" value={invoice.igst} />
        ) : (
          <>
            <Row label="CGST" value={invoice.cgst} />
            <Row label="SGST" value={invoice.sgst} />
          </>
        )}
        <Row label="Round off" value={invoice.round_off} />
        <Row label="Net" value={invoice.net} strong />
      </Expander>
    </Card>
  );
}

const styles = StyleSheet.create({
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[2] },
  lineHead: { marginTop: space[3] },
  itemCol: { flex: 1 },
  qtyCol: { flexBasis: '12%' },
  rateCol: { flexBasis: '25%' },
  amountCol: { flexBasis: '27%' },
  rule: { marginVertical: space[3] },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space[1] },
});
