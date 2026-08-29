import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Card } from './Card';
import { Text } from './Text';
import { MetricsStrip, type MetricsStripProps } from './MetricsStrip';
import { space } from './tokens/spacing';

export type RowCardProps = {
  title: React.ReactNode;
  /** The second line — "ABC Traders · ₹1,25,000.00". */
  meta?: React.ReactNode;
  /** Status badges, pinned to the title's trailing edge. */
  badges?: React.ReactNode;
  metrics?: MetricsStripProps['items'];
  /** A chevron, an amount, an action — whatever sits at the row's far edge. */
  trailing?: React.ReactNode;
  /** A full-width line *under* the metrics — a due date, a shortage note. It
   * has the card's whole width because the metrics strip needs the rest of it:
   * four uppercase labels and a trailing column in one row is what made
   * "To collect" wrap to two lines. */
  footer?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
};

/** Wraps a plain string in the row's own type role; anything else is the
 * caller's own node and is rendered as given. */
function slot(node: React.ReactNode, variant: 'rowTitle' | 'caption', color?: string) {
  if (typeof node === 'string' || typeof node === 'number') {
    return (
      <Text variant={variant} color={color} numberOfLines={1} maxFontSizeMultiplier={1.4}>
        {String(node)}
      </Text>
    );
  }
  return node;
}

/**
 * One row of any list in this app — an order, a customer, a payment, a
 * pending-by-order line. A lifted card rather than a divider-separated line,
 * with fixed slots (title + badges, meta, metrics, trailing) so five screens
 * that used to fork their own row layout now read as one list.
 */
export function RowCard({ title, meta, badges, metrics, trailing, footer, onPress, testID }: RowCardProps) {
  const theme = useTheme();
  return (
    <Card padding="row" onPress={onPress} testID={testID}>
      <View style={styles.row}>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.titleText}>{slot(title, 'rowTitle')}</View>
            {badges}
          </View>
          {meta ? slot(meta, 'caption', 'muted') : null}
        </View>
        {/* `testID` so a row's own test can assert *where* a figure sits —
            `PaymentRow`'s amount belongs here, never inline in the meta.
            Derived from the row's own `testID` so it stays unique in a list:
            a bare `row-trailing` matched every row at once, and
            `getByTestId` in a list test then threw on the second one. */}
        {trailing ? (
          <View testID={testID ? `${testID}-trailing` : 'row-trailing'} style={styles.trailing}>
            {slot(trailing, 'caption', 'muted')}
          </View>
        ) : null}
      </View>
      {metrics && metrics.length ? (
        <View style={[styles.metrics, { borderTopColor: theme.colors.hairline }]}>
          <MetricsStrip items={metrics} />
        </View>
      ) : null}
      {footer ? <View style={styles.footer}>{slot(footer, 'caption', 'muted')}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  body: { flex: 1, gap: space[1] + 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  titleText: { flexShrink: 1 },
  trailing: { alignItems: 'flex-end' },
  // Outside the title/trailing row, so the four quantities get the card's full
  // width — they are the row's payload, not a column beside it.
  metrics: { marginTop: space[2], paddingTop: space[2], borderTopWidth: StyleSheet.hairlineWidth },
  footer: { marginTop: space[2] - 2 },
});
