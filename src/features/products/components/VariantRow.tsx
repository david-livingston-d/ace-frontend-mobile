import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Stepper, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { controlRadius } from '@/ui/tokens/radius';
import { CONTROL } from '@/ui/tokens/layout';
import { formatMoney } from '@/lib/format/money';

export type VariantRowProps = {
  sku: string;
  /** The axis value this row *is* — the size, the colour, whatever the
   * product's own attributes call it. Rendered as the leading badge so a row
   * is identifiable without reading the SKU (canvas edit #4); a product with
   * no attributes at all has no badge, since there is nothing to name. */
  size?: string | null;
  /** Already tax-exclusive (`exclusiveRate(...)`) — this row never re-derives it. */
  price: number | null;
  qty: number;
  /** Hairline under the row — every row but the last one in the card. */
  divided?: boolean;
  onChange: (qty: number) => void;
};

/**
 * One selected combination inside `VariantPickerSheet`: its size badge, `sku ·
 * price`, and the quantity `Stepper` (min 0 — dropping to 0 is how a
 * combination is removed again, see the sheet's own qty handling).
 *
 * **No stock hint at rest** (canvas edit #5, superseding spec D3): availability
 * is not information the rep has to act on while the quantity still fits, and
 * a green/amber chip on every row read as a judgement on the product. Stock
 * only surfaces when a quantity actually *exceeds* it — as the sheet's own
 * non-blocking warning — and in the product info sheet, where it is the point.
 */
export function VariantRow({ sku, size, price, qty, divided, onChange }: VariantRowProps) {
  const theme = useTheme();
  return (
    <View style={[styles.row, divided ? { borderBottomColor: theme.colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth } : null]}>
      {size ? (
        <View style={[styles.badge, { backgroundColor: theme.colors.jet, borderRadius: controlRadius.badge }]}>
          <Text variant="sizeBadge" color={theme.colors.onJet} numberOfLines={1}>{size}</Text>
        </View>
      ) : null}
      <View style={styles.info}>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {`${sku} · ${price != null ? formatMoney(price) : '—'}`}
        </Text>
      </View>
      <Stepper value={qty} min={0} onChange={onChange} label={sku} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space[3] - 1, gap: space[3] },
  // Canvas edit #4: 52 x 38, radius 12, `sizeBadge` type (11/600, no tracking
  // — a size is a value, not a label) — wide enough for "XXL" or "32/34"
  // without the row's SKU losing its line.
  badge: {
    minWidth: CONTROL.variantSizeBadgeWidth,
    height: CONTROL.variantSizeBadgeHeight,
    paddingHorizontal: space[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
});
