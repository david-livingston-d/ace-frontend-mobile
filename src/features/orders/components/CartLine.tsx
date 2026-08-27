import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Stepper, SwipeToDelete, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import { formatMoney } from '@/lib/format/money';
import type { DraftLine } from '../store/draft';
import { RateField } from './RateField';
import { DiscountField } from './DiscountField';

export type CartLineProps = {
  line: DraftLine;
  /** This line's share of the document total, from the same `computeDocument`
   * run that produced the cart's totals — never recomputed per row. */
  lineTotal: number;
  error?: string;
  /** Set when the server rejected this row (`row_index`) — a tinted card, so
   * arriving back on the cart from the review step points somewhere. */
  highlighted?: boolean;
  canOverrideRate: boolean;
  canOverrideDiscount: boolean;
  onQty: (qty: number) => void;
  onRate: (rate: string) => void;
  onDiscount: (pct: string) => void;
  onRemove: () => void;
};

export function CartLine({
  line,
  lineTotal,
  error,
  highlighted,
  canOverrideRate,
  canOverrideDiscount,
  onQty,
  onRate,
  onDiscount,
  onRemove,
}: CartLineProps) {
  const theme = useTheme();
  const flagged = !!error || !!highlighted;

  return (
    <SwipeToDelete onDelete={onRemove}>
      <View
        testID={`cart-line-${line.variantId}`}
        style={[
          styles.card,
          {
            backgroundColor: flagged ? theme.colors.tone.danger.bg : theme.colors.surface,
            borderColor: flagged ? theme.colors.tone.danger.fg : theme.colors.border,
            borderRadius: radius.control,
          },
        ]}
      >
        <View style={styles.head}>
          <View style={styles.title}>
            <Text variant="body" numberOfLines={1}>{line.snapshot.productName}</Text>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {line.snapshot.variantLabel ? `${line.snapshot.sku} · ${line.snapshot.variantLabel}` : line.snapshot.sku}
            </Text>
          </View>
          <Text variant="money">{formatMoney(lineTotal)}</Text>
        </View>

        <View style={styles.controls}>
          <Stepper label={`Quantity for ${line.snapshot.sku}`} value={line.qty} min={0} onChange={onQty} />
          <View style={styles.pricing}>
            <RateField
              sku={line.snapshot.sku}
              value={line.rate}
              touched={line.rateTouched}
              editable={canOverrideRate}
              onChange={onRate}
            />
            {canOverrideDiscount ? <DiscountField label={line.snapshot.sku} value={line.discountPct} onChange={onDiscount} /> : null}
          </View>
        </View>

        {error ? (
          <Text
            testID={`cart-line-error-${line.variantId}`}
            variant="caption"
            color={theme.colors.tone.danger.fg}
            style={styles.error}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </SwipeToDelete>
  );
}

const styles = StyleSheet.create({
  // No vertical margin: `SwipeToDelete`'s red action panel is laid out behind
  // the *whole* swipeable row, so any margin inside it shows up as a stripe of
  // danger-red in the gap between cards. The cart's own list gap spaces them.
  card: { borderWidth: StyleSheet.hairlineWidth, padding: space[3] },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  title: { flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[3], gap: space[3] },
  pricing: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  error: { marginTop: space[2] },
});
