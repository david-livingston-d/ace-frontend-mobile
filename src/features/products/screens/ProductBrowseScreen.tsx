import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pencil, PackageSearch } from 'lucide-react-native';
import { Screen, SearchBar, Text, EmptyState, ErrorState, Skeleton, IconButton, ListRow } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { getErrorMessage } from '@/lib/api/errors';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import type { RootStackParamList } from '@/navigation/types';
import { useDraftStore, selectLineCount, selectUnitCount, selectTotals, type DraftLine } from '@/features/orders/store/draft';
import { useCategories, useProducts, useProduct, useVariantSearch } from '../hooks';
import { CategoryChips } from '../components/CategoryChips';
import { ProductCard } from '../components/ProductCard';
import { CartBadge } from '../components/CartBadge';
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

  const { data: categories } = useCategories();
  const { items, isPending, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useProducts({ q, categoryId });

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

  function handleAdd(picked: PickedLine[]) {
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
          <Text variant="label" color="textMuted">{`In this order · ${lineCount} lines`}</Text>
          {productsInOrder.map(([productId, info]) => (
            <ListRow
              key={productId}
              title={`${info.name} · ${info.count}`}
              right={<IconButton icon={Pencil} label={`Edit ${info.name}`} size="sm" onPress={() => openPicker(productId)} />}
            />
          ))}
        </View>
      ) : null}

      {skuQ && skuMatches && skuMatches.length > 0 ? (
        <View style={styles.section}>
          <Text variant="label" color="textMuted">SKU matches</Text>
          {skuMatches.map((item) => (
            <ListRow
              key={item.variant_id}
              title={item.sku}
              subtitle={item.variant_label ? `${item.product_name} · ${item.variant_label}` : item.product_name}
              onPress={() => openFromSkuMatch(item)}
              chevron
            />
          ))}
        </View>
      ) : null}

      {isPending ? (
        <View style={styles.skeletonGrid}>
          <Skeleton width="48%" height={160} />
          <Skeleton width="48%" height={160} />
        </View>
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={q ? `No products found for "${q}"` : 'No products'}
          hint={q ? undefined : 'Try a different category.'}
          action={q ? { label: 'Clear search', onPress: () => setQ('') } : undefined}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          renderItem={({ item }) => <ProductCard product={item} onPress={() => openPicker(item.id)} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footerSpinner} /> : null}
        />
      )}

      <CartBadge
        unitCount={unitCount}
        amount={totals.net}
        onPress={onOpenCart ?? (() => navigation.navigate('NewOrder', undefined))}
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

const styles = StyleSheet.create({
  section: { marginVertical: space[2] },
  skeletonGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3] },
  column: { justifyContent: 'space-between' },
  footerSpinner: { paddingVertical: space[4] },
});
