import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Stepper, SwipeToDelete, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { shadow } from '@/ui/tokens/elevation';
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

/**
 * One line of the cart (`wizard-3-cart`): a lifted `row-pad` card with the
 * product over its `sku · variant` and the line total on the head row, then the
 * quantity stepper, the rate and the discount underneath — swipe it left to
 * delete.
 *
 * The card carries no shadow of its own: `SwipeToDelete` clips the whole row to
 * the card radius (so the red action never shows a square corner) and RN clips
 * a child's shadow inside an `overflow: 'hidden'` parent, so the *wrapper*
 * carries the lift.
 */
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
      <Card
        padding="row"
        testID={`cart-line-${line.variantId}`}
        style={
          flagged
            ? [{ backgroundColor: theme.colors.tone.danger.bg }, shadow('note', theme.mode, { color: theme.colors.errRing })]
            : undefined
        }
      >
        <View style={styles.head}>
          <View style={styles.title}>
            <Text variant="rowTitle" numberOfLines={1}>{line.snapshot.productName}</Text>
            <Text variant="caption" color="muted" numberOfLines={1}>
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
      </Card>
    </SwipeToDelete>
  );
}

const styles = StyleSheet.create({
  // No margin anywhere: `SwipeToDelete`'s red action panel is laid out behind
  // the *whole* swipeable row, so any margin inside it would show up as a
  // stripe of danger-red in the gap between cards. The cart's own list gap
  // spaces them.
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  title: { flex: 1, gap: space[1] - 2 },
  controls: { flexDirection: 'row', alignItems: 'center', marginTop: space[3], gap: space[2] },
  pricing: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space[2] },
  error: { marginTop: space[2] },
});
