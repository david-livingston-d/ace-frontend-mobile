import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, MediaFrame } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import type { ProductListItem } from '../types';

export function initialsOf(name: string): string {
  const letters = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]);
  return letters.join('').toUpperCase() || '?';
}

export type ProductCardProps = {
  product: ProductListItem;
  /** `₹499.00` under the name, when the caller knows it. The `/products` list
   * endpoint returns no price (only `/products/{id}` does), so the grid leaves
   * this out rather than firing a detail request per tile. */
  fromPrice?: string | null;
  onPress: () => void;
};

/**
 * One tile of the 2-column product grid (`wizard-2-products`): a lifted card
 * whose whole width is a 5:4 `MediaFrame`, then the name and `code · N
 * variants`.
 *
 * `ProductListItemOut` carries no image key at all — only the product detail
 * and its variants do — so every tile shows the frame's initials placeholder;
 * a real photograph appears once a product's detail is fetched
 * (`ProductInfoSheet`, and the variant picker's own header).
 */
export function ProductCard({ product, fromPrice, onPress }: ProductCardProps) {
  const subtitle = product.has_variants ? `${product.code} · ${product.variant_count} variants` : product.code;
  return (
    <View style={styles.cell}>
      <Card padding={3} onPress={onPress}>
        <MediaFrame initials={initialsOf(product.name)} />
        <View style={styles.text}>
          <Text variant="rowTitle" numberOfLines={1}>{product.name}</Text>
          <Text variant="caption" color="muted" numberOfLines={1}>{subtitle}</Text>
          {fromPrice ? (
            <Text variant="rowStrong" numberOfLines={1}>{`from ${formatMoney(fromPrice)}`}</Text>
          ) : null}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  // The grid's own `columnWrapperStyle` carries the gap; the cell claims its
  // half of the row. `maxWidth` matters for the *last* row of an odd-length
  // list: a lone `flex: 1` cell stretches to the full width, and the last
  // product was rendering as a double-wide tile.
  cell: { flex: 1, maxWidth: '50%' },
  text: { marginTop: space[2] + 1, gap: space[1] - 3 },
});
