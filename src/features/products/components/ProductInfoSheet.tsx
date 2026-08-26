import React from 'react';
import { Image, Pressable, View, StyleSheet } from 'react-native';
import { Sheet, useSheet, Text, StatusChip, Expander, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import { formatMoney } from '@/lib/format/money';
import { authedImageSource } from '@/native/images';
import { StockHint } from './StockHint';
import { initialsOf } from './ProductCard';
import type { ProductDetail } from '../types';

export type ProductInfoSheetProps = { product: ProductDetail };

/** The (C3) info sheet a shopper reaches by tapping the product name in the
 * variant picker's header — image, code, price range across variants, and
 * every variant's active/inactive state + stock, plus specs. Owns its own
 * trigger + `Sheet` (same self-contained pattern as `Select`), so the parent
 * just renders `<ProductInfoSheet product={...} />` where the pressable title
 * should go. */
export function ProductInfoSheet({ product }: ProductInfoSheetProps) {
  const theme = useTheme();
  const { ref, open } = useSheet();
  const primary = product.images.find((i) => i.is_primary) ?? product.images[0] ?? null;

  const prices = product.variants
    .map((v) => (v.price ? Number(v.price.selling_price) : null))
    .filter((n): n is number => n != null);
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;

  return (
    <>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${product.name} details`}>
        <Text variant="h4">{product.name}</Text>
      </Pressable>
      <Sheet ref={ref} scroll title={product.name}>
        {primary ? (
          <Image source={authedImageSource(primary.key)} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder, { backgroundColor: theme.colors.surfaceSunken, borderColor: theme.colors.border }]}>
            <Text variant="h3" color="textMuted">{initialsOf(product.name)}</Text>
          </View>
        )}
        <Text variant="bodySm" color="textMuted" style={styles.code}>{product.code}</Text>
        {min != null ? (
          <Text variant="h4">{min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`}</Text>
        ) : null}

        <View style={styles.variants}>
          {product.variants.map((v) => (
            <View key={v.id} style={styles.variantRow}>
              <Text variant="bodySm" style={styles.variantSku} numberOfLines={1}>{v.sku}</Text>
              <StatusChip tone={v.is_active ? 'success' : 'neutral'} label={v.is_active ? 'Active' : 'Inactive'} size="sm" />
              <StockHint stock={v.stock} />
            </View>
          ))}
        </View>

        {product.specifications.length ? (
          <Expander title="Specifications">
            {product.specifications.map((s) => (
              <Text key={s.id} variant="bodySm" style={styles.spec}>{`${s.name}: ${s.value}`}</Text>
            ))}
          </Expander>
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 200, borderRadius: radius.control, borderWidth: StyleSheet.hairlineWidth },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  code: { marginTop: space[2] },
  variants: { marginTop: space[3], gap: space[2] },
  variantRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  variantSku: { flex: 1 },
  spec: { paddingVertical: space[1] },
});
