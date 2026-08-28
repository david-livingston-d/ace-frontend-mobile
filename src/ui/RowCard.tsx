import React from 'react';
import { View, StyleSheet } from 'react-native';
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
export function RowCard({ title, meta, badges, metrics, trailing, onPress, testID }: RowCardProps) {
  return (
    <Card padding="row" onPress={onPress} testID={testID}>
      <View style={styles.row}>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <View style={styles.titleText}>{slot(title, 'rowTitle')}</View>
            {badges}
          </View>
          {meta ? slot(meta, 'caption', 'muted') : null}
          {metrics && metrics.length ? <MetricsStrip items={metrics} /> : null}
        </View>
        {trailing ? <View style={styles.trailing}>{slot(trailing, 'caption', 'muted')}</View> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  body: { flex: 1, gap: space[1] + 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  titleText: { flexShrink: 1 },
  trailing: { alignItems: 'flex-end' },
});
