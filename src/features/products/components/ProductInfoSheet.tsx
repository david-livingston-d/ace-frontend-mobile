import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Sheet, useSheet, Text, StatusChip, MediaFrame, SettingsGroup, SettingsRow, SectionLabel, Button } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { CONTROL } from '@/ui/tokens/layout';
import { formatMoney } from '@/lib/format/money';
import { formatRate } from '@/lib/format/rate';
import { authedImageSource } from '@/native/images';
import { StockHint } from './StockHint';
import { initialsOf } from './ProductCard';
import type { ProductDetail } from '../types';

export type ProductInfoSheetProps = {
  product: ProductDetail;
  /** What the caller wants the trigger to look like. The picker's header row
   * hands its own name + info glyph in here; without it the sheet falls back
   * to the product's name, which is what a bare `<ProductInfoSheet />` is. */
  trigger?: React.ReactNode;
};

/** The lowest `selling_price` across a product's variants, kept as the original
 * decimal *string* — `Number()` only ever picks the entry, so a price with more
 * precision than a JS number can hold is never silently reformatted through one. */
export function fromPrice(product: ProductDetail): string | null {
  const priced = product.variants
    .filter((v) => v.is_active && v.price)
    .map((v) => ({ raw: v.price!.selling_price, n: Number(v.price!.selling_price) }));
  if (!priced.length) return null;
  return priced.reduce((a, b) => (b.n < a.n ? b : a)).raw;
}

function priceRange(product: ProductDetail): string | null {
  const priced = product.variants
    .map((v) => (v.price ? { raw: v.price.selling_price, n: Number(v.price.selling_price) } : null))
    .filter((p): p is { raw: string; n: number } => p != null);
  if (!priced.length) return null;
  const min = priced.reduce((a, b) => (b.n < a.n ? b : a));
  const max = priced.reduce((a, b) => (b.n > a.n ? b : a));
  return min.n === max.n ? formatMoney(min.raw) : `${formatMoney(min.raw)} – ${formatMoney(max.raw)}`;
}

/**
 * The `product-info` frame — everything about a product that the picker itself
 * deliberately does not show: its image, the master facts (code, HSN, tax,
 * attributes, variant count, price range), every variant's active state and
 * stock, and its specifications.
 *
 * Owns its own trigger + `Sheet` (the same self-contained pattern as `Select`),
 * so a caller renders `<ProductInfoSheet product={...} trigger={...} />` where
 * the pressable should go.
 */
export function ProductInfoSheet({ product, trigger }: ProductInfoSheetProps) {
  const { ref, open, close } = useSheet();
  const primary = product.images.find((i) => i.is_primary) ?? product.images[0] ?? null;
  const range = priceRange(product);
  const attributeNames = product.attributes.map((a) => a.name).join(' · ');

  return (
    <>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${product.name} details`}>
        {trigger ?? <Text variant="cardTitle">{product.name}</Text>}
      </Pressable>

      {/* `stack="push"`: this sheet is presented from *inside* the variant
          picker's sheet, and the library's default `switch` behaviour would
          dismiss the picker — which unmounts this component before it can
          show. On device that read as "tapping the product name closes the
          picker" (seen on the Pixel_9 emulator). No pinned `footer` either:
          the outer sheet's own `BottomSheetFooter` sits over this one in the
          modal stack, so a "Close" rendered there was drawn but never took the
          tap. It rides at the end of the scroll instead. */}
      <Sheet ref={ref} scroll snapPoints={SNAP} stack="push">
        <View style={styles.header}>
          <View style={styles.thumb}>
            <MediaFrame {...(primary ? authedImageSource(primary.key) : {})} initials={initialsOf(product.name)} ratio={1} />
          </View>
          <View style={styles.headerText}>
            <Text variant="cardTitle" numberOfLines={2}>{product.name}</Text>
            <Text variant="caption" color="muted" numberOfLines={1}>
              {product.category_name ? `${product.code} · ${product.category_name}` : product.code}
            </Text>
          </View>
        </View>

        <SettingsGroup>
          <SettingsRow title="Code" right={<Text variant="rowStrong">{product.code}</Text>} />
          <SettingsRow title="HSN" right={<Text variant="rowStrong">{product.hsn.code}</Text>} />
          <SettingsRow
            title="Tax"
            right={<Text variant="rowStrong">{product.hsn.active_rate ? `GST ${formatRate(product.hsn.active_rate)}%` : '—'}</Text>}
          />
          {attributeNames ? (
            <SettingsRow title="Attributes" right={<Text variant="rowStrong">{attributeNames}</Text>} />
          ) : null}
          <SettingsRow title="Variants" right={<Text variant="rowStrong">{String(product.variants.length)}</Text>} />
          {range ? <SettingsRow title="Price" right={<Text variant="rowStrong">{range}</Text>} /> : null}
        </SettingsGroup>

        <SectionLabel>Variants &amp; stock</SectionLabel>
        <View style={styles.variants}>
          {product.variants.map((v) => (
            <View key={v.id} style={styles.variantRow}>
              <Text variant="row" style={styles.variantSku} numberOfLines={1}>{v.sku}</Text>
              <StatusChip tone={v.is_active ? 'success' : 'neutral'} label={v.is_active ? 'Active' : 'Inactive'} size="sm" />
              <StockHint stock={v.stock} />
            </View>
          ))}
        </View>

        {product.specifications.length ? (
          <>
            <SectionLabel>Specifications</SectionLabel>
            <SettingsGroup>
              {product.specifications.map((s) => (
                <SettingsRow key={s.id} title={s.name} right={<Text variant="rowStrong">{s.value}</Text>} />
              ))}
            </SettingsGroup>
          </>
        ) : null}

        <View style={styles.closeRow}>
          <Button label="Close" variant="outline" fullWidth onPress={close} />
        </View>
      </Sheet>
    </>
  );
}

/** Tall enough for the spec group and the variant list without a first drag,
 * and expandable to nearly full height for a product with many variants. */
const SNAP = ['70%', '92%'];

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3] + 2, marginBottom: space[4] },
  thumb: { width: CONTROL.avatarLg + space[1] + 2 },
  headerText: { flex: 1, gap: space[1] - 1 },
  variants: { gap: space[2], marginBottom: space[2] },
  variantRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  variantSku: { flex: 1 },
  closeRow: { marginTop: space[5] },
});
