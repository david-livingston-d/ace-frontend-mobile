import React from 'react';
import { Image, Pressable, View, StyleSheet } from 'react-native';
import { Text, Card, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import { authedImageSource } from '@/native/images';
import type { ProductListItem } from '../types';

export function initialsOf(name: string): string {
  const letters = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]);
  return letters.join('').toUpperCase() || '?';
}

export type MediaThumbProps = { imageKey: string | null; name: string; size?: number };

/** A `MediaFrame`-style square: the real image when there's an `imageKey`
 * (authenticated via `authedImageSource`), otherwise a bordered placeholder
 * showing the product's initials — never a broken-image icon. */
export function MediaThumb({ imageKey, name, size = 72 }: MediaThumbProps) {
  const theme = useTheme();
  const frame = [styles.thumb, { width: size, height: size, borderColor: theme.colors.border, borderRadius: radius.control }];
  if (imageKey) {
    return <Image source={authedImageSource(imageKey)} style={frame} resizeMode="cover" />;
  }
  return (
    <View style={[...frame, styles.placeholder, { backgroundColor: theme.colors.surfaceSunken }]}>
      <Text variant="label" color="textMuted">{initialsOf(name)}</Text>
    </View>
  );
}

export type ProductCardProps = { product: ProductListItem; onPress: () => void };

// `ProductListItemOut` (the `/products` list) carries no image key at all —
// only the product detail and its variants do (see `ProductDetailOut`). So
// every card here renders the initials placeholder; a real thumbnail only
// ever appears once a product's full detail is fetched (`ProductInfoSheet`).
// Same reason there's no per-variant "from ₹price" here: the list endpoint
// doesn't return price either, only `/products/{id}` does.
export function ProductCard({ product, onPress }: ProductCardProps) {
  const subtitle = product.has_variants ? `${product.code} · ${product.variant_count} variants` : product.code;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.card}>
      <Card padding={2}>
        <MediaThumb imageKey={null} name={product.name} size={96} />
        <Text variant="body" numberOfLines={1} style={styles.name}>{product.name}</Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>{subtitle}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, margin: space[1] },
  thumb: { borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  placeholder: {},
  name: { marginTop: space[2] },
});
