import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pencil, PackageSearch } from 'lucide-react-native';
import { Card, EmptyState, ErrorState, IconButton, ListFooter, ListRow, OfflineBanner, Screen, SearchBar, Skeleton, Text, useBottomClearance } from '@/ui';
import { gapGrid, space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import { MEDIA_RATIO } from '@/ui/tokens/layout';
import { getErrorMessage } from '@/lib/api/errors';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import type { RootStackParamList } from '@/navigation/types';
import { useDraftStore, selectLineCount, selectUnitCount, selectTotals, type DraftLine } from '@/features/orders/store/draft';
import { useCategories, useProducts, useProduct, useVariantSearch } from '../hooks';
import { CategoryChips } from '../components/CategoryChips';
import { ProductCard } from '../components/ProductCard';
import { CartBadge, CART_BADGE_HEIGHT } from '../components/CartBadge';
import { VariantPickerSheet } from '../components/VariantPickerSheet';
import type { PickedLine, VariantSearchItem } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ProductBrowse'>;

// A query this shape ("WH-TEE-BLK-M", "TSH001") reads as a SKU rather than a
// product name — worth also checking `/variants` for a direct hit, shown as
// its own "SKU matches" section above the grid.
const SKU_LIKE = /[A-Z0-9-]{3,}/i;

function initialForProduct(lines: Record<string, DraftLine>, productId: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const line of Object.values(lines)) {
    if (line.snapshot.productId === productId) result[line.variantId] = line.qty;
  }
  return result;
}

export type ProductBrowseScreenProps = {
  /** Where the floating cart badge goes. Defaults to the root `NewOrder`
   * route (the screen's standalone use); the order wizard passes its own Cart
   * step instead, so browsing inside the wizard never leaves it. */
  onOpenCart?: () => void;
  /** Shown when the screen is a wizard step rather than a root route. */
  onBack?: () => void;
  /** Rendered above the search box — the wizard's `StepHeader`. */
  header?: React.ReactNode;
};

export function ProductBrowseScreen({ onOpenCart, onBack, header }: ProductBrowseScreenProps) {
  const navigation = useNavigation<Nav>();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const debouncedQ = useDebouncedValue(q, 300);
  // No tab bar here (this is a root route, and a wizard step): the grid only
  // has to clear the system navigation, the floating cart badge that hangs
  // over its bottom-right corner, and leave a gutter.
  const clearance = useBottomClearance({ extra: CART_BADGE_HEIGHT + space[4] });

  const { data: categories } = useCategories();
  const { items, isPending, isError, error, refetch, refresh, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage, dataUpdatedAt } =
    useProducts({ q, categoryId });

  const skuQ = SKU_LIKE.test(debouncedQ.trim()) ? debouncedQ.trim() : '';
  const { data: skuMatchesRaw } = useVariantSearch(skuQ);
  // The backend's `/variants?q=` deliberately also returns inactive variants
  // (sorted last, for historical lookups) — never offer one here: tapping it
  // would open a picker that silently can't add it (an inactive combination
  // never renders as a chip or row in `VariantPickerSheet`).
  const skuMatches = useMemo(
    () => skuMatchesRaw?.filter((item) => item.is_active && item.inventory_enabled !== false),
    [skuMatchesRaw],
  );

  const lines = useDraftStore((s) => s.lines);
  const addLines = useDraftStore((s) => s.addLines);
  const removeLine = useDraftStore((s) => s.remove);
  const lineCount = useDraftStore(selectLineCount);
  const unitCount = useDraftStore(selectUnitCount);
  const totals = useDraftStore(selectTotals);

  const [pickerProductId, setPickerProductId] = useState<string | null>(null);
  const [pickerInitial, setPickerInitial] = useState<Record<string, number>>({});
  const { data: pickerProduct } = useProduct(pickerProductId ?? '');

  function openPicker(productId: string) {
    setPickerInitial(initialForProduct(lines, productId));
    setPickerProductId(productId);
  }

  function openFromSkuMatch(item: VariantSearchItem) {
    setPickerInitial({
      ...initialForProduct(lines, item.product_id),
      [item.variant_id]: lines[item.variant_id]?.qty || 1,
    });
    setPickerProductId(item.product_id);
  }

  // Re-opening a product's picker edits that product's *whole* set of lines, so
  // "Add to order" has to be able to subtract: a size taken back to 0 is a
  // removal, not a no-op that silently leaves the old quantity in the cart.
  // Only variants the sheet could actually offer are eligible — it renders
  // active variants only, so an inactive one sitting in the draft was never on
  // screen and the picker's result says nothing about it.
  function handleAdd(picked: PickedLine[]) {
    const kept = new Set(picked.map((p) => p.variantId));
    const offered = new Set((pickerProduct?.variants ?? []).filter((v) => v.is_active).map((v) => v.id));
    for (const variantId of Object.keys(pickerInitial)) {
      if (!kept.has(variantId) && offered.has(variantId)) removeLine(variantId);
    }
    addLines(picked);
    setPickerProductId(null);
  }

  // Distinct products currently in the draft, with how many of their variants
  // are picked — the "in this order" summary edits a whole product's picker
  // at once (via the pencil), not a single line.
  const productsInOrder = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const line of Object.values(lines)) {
      const cur = map.get(line.snapshot.productId) ?? { name: line.snapshot.productName, count: 0 };
      cur.count += 1;
      map.set(line.snapshot.productId, cur);
    }
    return [...map.entries()];
  }, [lines]);

  return (
    <Screen title="Products" back={onBack}>
      {header}
      <SearchBar value={q} onChangeText={setQ} placeholder="Search products or SKU" />
      <CategoryChips categories={categories ?? []} selected={categoryId} onSelect={setCategoryId} />

      {lineCount > 0 ? (
        <View style={styles.section}>
          <Text variant="label" color="muted">{`In this order · ${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`}</Text>
          <Card padding={0} style={styles.sectionCard}>
            {productsInOrder.map(([productId, info]) => (
              <ListRow
                key={productId}
                title={`${info.name} · ${info.count}`}
                right={<IconButton icon={Pencil} label={`Edit ${info.name}`} size="sm" onPress={() => openPicker(productId)} />}
              />
            ))}
          </Card>
        </View>
      ) : null}

      {skuQ && skuMatches && skuMatches.length > 0 ? (
        <View style={styles.section}>
          <Text variant="label" color="muted">SKU matches</Text>
          <Card padding={0} style={styles.sectionCard}>
            {skuMatches.map((item) => (
              <ListRow
                key={item.variant_id}
                title={item.sku}
                subtitle={item.variant_label ? `${item.product_name} · ${item.variant_label}` : item.product_name}
                onPress={() => openFromSkuMatch(item)}
                chevron
              />
            ))}
          </Card>
        </View>
      ) : null}

      <OfflineBanner dataUpdatedAt={dataUpdatedAt} />

      {isPending ? (
        <ProductGridSkeleton />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={q ? `No products found for "${q}"` : 'No products'}
          hint={q ? 'Try a different spelling, or clear the search.' : 'Try a different category.'}
          action={q ? { label: 'Clear search', onPress: () => setQ('') } : undefined}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          contentContainerStyle={[styles.grid, { paddingBottom: clearance }]}
          columnWrapperStyle={styles.column}
          renderItem={({ item }) => <ProductCard product={item} onPress={() => openPicker(item.id)} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refresh()} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          ListFooterComponent={<ListFooter loading={isFetchingNextPage} />}
        />
      )}

      <CartBadge
        unitCount={unitCount}
        amount={totals.net}
        onPress={onOpenCart ?? (() => navigation.navigate('NewOrder', {}))}
      />

      {pickerProduct ? (
        <VariantPickerSheet
          key={pickerProduct.id}
          product={pickerProduct}
          initial={pickerInitial}
          onAdd={handleAdd}
          onClose={() => setPickerProductId(null)}
        />
      ) : null}
    </Screen>
  );
}

/** Four tiles at the real cards' geometry — a 5:4 media block over two text
 * bars — so the grid does not jump as the products land (`products-loading`). */
function ProductGridSkeleton() {
  return (
    <View testID="product-grid-skeleton" style={styles.skeletonGrid}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCell}>
          <Card padding={3}>
            <Skeleton width="100%" height={SKELETON_TILE_HEIGHT} radius={radius.md} />
            <View style={styles.skeletonText}>
              <Skeleton width="70%" height={12} />
              <Skeleton width="45%" height={10} />
            </View>
          </Card>
        </View>
      ))}
    </View>
  );
}

/** The media block's height at a phone's half-gutter column width — close
 * enough that the real 5:4 frame lands where the placeholder was. */
const SKELETON_TILE_HEIGHT = Math.round(150 / MEDIA_RATIO);

const styles = StyleSheet.create({
  section: { marginVertical: space[2], gap: space[2] },
  sectionCard: { paddingHorizontal: space[4] },
  grid: { gap: gapGrid },
  column: { gap: gapGrid },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: gapGrid, marginTop: space[2] },
  skeletonCell: { width: '48%' },
  skeletonText: { marginTop: space[2] + 1, gap: space[1] + 2 },
});
