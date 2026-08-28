import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Info } from 'lucide-react-native';
import { Sheet, useSheet, Text, Button, Banner, Card, ColorSwatch, SizeChip, MediaFrame, useTheme } from '@/ui';
import { gapChips, space } from '@/ui/tokens/spacing';
import { CONTROL, hit } from '@/ui/tokens/layout';
import { formatMoney } from '@/lib/format/money';
import { authedImageSource } from '@/native/images';
import { exclusiveRate, computeDocument, type CalcLineInput } from '@/lib/sales/calc';
import { VariantRow } from './VariantRow';
import { ProductInfoSheet, fromPrice } from './ProductInfoSheet';
import { initialsOf } from './ProductCard';
import type { ProductDetail, ProductAttribute, VariantDetail, PickedLine, LineSnapshot } from '../types';

export type VariantPickerSheetProps = {
  product: ProductDetail;
  initial: Record<string, number>;
  onAdd: (lines: PickedLine[]) => void;
  /** Fired once the sheet has actually closed (swipe-dismiss or after
   * "Add to order") — the browse screen uses this to drop the product it's
   * showing a picker for. Additive to the brief's three-prop interface: the
   * sheet is mounted only while there's a product to show (`product` is
   * required, not nullable), so *something* has to tell the parent when to
   * stop rendering it again. */
  onClose?: () => void;
};

/**
 * MVP runs one warehouse (PRD §Repository/Core domain), and the variant
 * payload's `StockSummaryOut` is warehouse-agnostic — it is *the* balance.
 * The name is the mockup's own approved copy (canvas edit #5) rather than
 * anything the API tells us, and lives here as one constant so it is a single
 * edit the day a second warehouse exists.
 */
const STOCK_LOCATION = 'Main Warehouse';

/** The two snap points the picker offers (D3): the first shows the header,
 * both axes and the first stepper rows without a drag; the second is for a
 * product with many sizes picked at once. Fixed rather than dynamic — a sheet
 * that resizes as rows appear moved the footer out from under the thumb. */
const SNAP_POINTS = ['62%', '92%'];

type AxisValue = { valueId: string; value: string; display: string | null };
type Axis = { id: string; name: string; displayType: ProductAttribute['display_type']; values: AxisValue[] };

/** One axis per `product.attributes` (ordered by `position`), its offered
 * values taken only from *active* variants — an attribute value whose only
 * variant is inactive simply never appears as a chip. */
function buildAxes(attributes: ProductAttribute[], activeVariants: VariantDetail[]): Axis[] {
  const sorted = [...attributes].sort((a, b) => a.position - b.position);
  return sorted.map((attr) => {
    const seen = new Map<string, AxisValue>();
    for (const v of activeVariants) {
      const av = v.attribute_values.find((x) => x.attribute_id === attr.id);
      if (av && !seen.has(av.value_id)) seen.set(av.value_id, { valueId: av.value_id, value: av.value, display: av.display_value });
    }
    return { id: attr.id, name: attr.name, displayType: attr.display_type, values: [...seen.values()] };
  });
}

function findVariant(activeVariants: VariantDetail[], selections: [string, string][]): VariantDetail | undefined {
  return activeVariants.find((v) =>
    selections.every(([axisId, valueId]) => v.attribute_values.some((av) => av.attribute_id === axisId && av.value_id === valueId)),
  );
}

/** The axis-1 chip (colour) the sheet opens on: when `initial` prefills one or
 * more rows, seed it from the *first* such variant's own axis-1 value so the
 * highlighted colour (and, transitively, the size chips/rows below it — their
 * "selected" state is just `qty > 0`) match what's actually prefilled, rather
 * than always defaulting to axis1's first value regardless of `initial`. */
function seedAxis1Value(initial: Record<string, number>, activeVariants: VariantDetail[], axis1: Axis | null): string | null {
  if (!axis1) return null;
  const [firstVariantId] = Object.entries(initial).find(([, qty]) => qty > 0) ?? [];
  const initialVariant = firstVariantId ? activeVariants.find((v) => v.id === firstVariantId) : undefined;
  const seededValue = initialVariant?.attribute_values.find((av) => av.attribute_id === axis1.id)?.value_id;
  return seededValue ?? axis1.values[0]?.valueId ?? null;
}

function lineSnapshotFor(product: ProductDetail, variant: VariantDetail): LineSnapshot {
  return {
    sku: variant.sku,
    productId: product.id,
    productName: product.name,
    variantLabel: variant.attribute_values.length ? variant.attribute_values.map((av) => av.value).join(' / ') : null,
    attributeValues: variant.attribute_values.map((av) => ({
      name: av.attribute_name,
      value: av.value,
      display: av.display_value ?? av.value,
    })),
    taxRate: product.hsn.active_rate,
    price: variant.price ? { sellingPrice: variant.price.selling_price, taxInclusive: variant.price.tax_inclusive } : null,
    stock: variant.stock,
  };
}

/** The note shown when a quantity has gone past what is on hand — the exact
 * copy the canvas approved (edit #5), with the singular case spelled out
 * because "1 units" is the kind of thing a rep quotes back at you. */
function exceedTitle(rows: { variant: { sku: string }; qty: number; available: number }[], location: string): string {
  if (rows.length === 1) {
    const row = rows[0]!;
    return `${row.qty} ${row.qty === 1 ? 'unit' : 'units'} of ${row.variant.sku} exceed the ${row.available} available in ${location}.`;
  }
  return `${rows.length} of these sizes exceed what is available in ${location}.`;
}

const EXCEED_BODY = 'The order can still be placed — a shortage is raised for Production.';

/** What a variant has to give: `null` (no `stock_balances` row has ever
 * existed) reads the same as zero, exactly as `stockHint` treats it. */
function availableOf(variant: VariantDetail): number {
  return variant.stock ? Number(variant.stock.available) : 0;
}

/**
 * C1/C2: pick one or more of a product's active variants and their
 * quantities. Two attributes render as colour swatches (axis 1, single-select)
 * over size chips (axis 2, multi-select toggle + "Select all"); one attribute
 * is chips alone; no attributes is just the single default variant. A
 * variant's row (its size badge, sku · price, qty stepper) appears once its
 * combination is toggled on; dropping its qty back to 0 removes the row.
 *
 * Stock is **not** shown at rest (canvas edit #5): a quantity above what is
 * available raises a non-blocking warning instead, and the footer stays
 * enabled — the order still goes through and a shortage is raised for
 * Production.
 */
export function VariantPickerSheet({ product, initial, onAdd, onClose }: VariantPickerSheetProps) {
  const theme = useTheme();
  const { ref: sheetRef, open, close } = useSheet();
  // The sheet's only "trigger" is being mounted at all — the browse screen
  // renders this component precisely when there's a product to show a picker
  // for, so it opens itself rather than waiting on an external ref call.
  useEffect(() => {
    open();
  }, [open]);

  const activeVariants = useMemo(() => product.variants.filter((v) => v.is_active), [product.variants]);
  const axes = useMemo(() => buildAxes(product.attributes, activeVariants), [product.attributes, activeVariants]);
  const defaultVariant = activeVariants.find((v) => v.is_default) ?? activeVariants[0];
  const taxRate = product.hsn.active_rate ?? '0';

  const [qty, setQty] = useState<Record<string, number>>(() => ({ ...initial }));
  const axis1 = axes.length === 2 ? axes[0]! : null;
  const axis2 = axes.length === 2 ? axes[1]! : axes.length === 1 ? axes[0]! : null;
  const [axis1Value, setAxis1Value] = useState<string | null>(() => seedAxis1Value(initial, activeVariants, axis1));

  function qtyOf(variantId: string): number {
    return qty[variantId] ?? 0;
  }
  function setVariantQty(variantId: string, next: number) {
    setQty((q) => ({ ...q, [variantId]: Math.max(0, next) }));
  }
  function toggleVariant(variantId: string) {
    setVariantQty(variantId, qtyOf(variantId) > 0 ? 0 : 1);
  }

  const axis2Options = useMemo(() => {
    if (!axis2) return [];
    return axis2.values
      .map((v) => {
        const selections: [string, string][] = [[axis2.id, v.valueId]];
        if (axis1 && axis1Value) selections.push([axis1.id, axis1Value]);
        return { ...v, variant: findVariant(activeVariants, selections) };
      })
      .filter((v): v is AxisValue & { variant: VariantDetail } => !!v.variant);
  }, [axis2, axis1, axis1Value, activeVariants]);

  function selectAll() {
    setQty((q) => {
      const next = { ...q };
      for (const opt of axis2Options) {
        if ((next[opt.variant.id] ?? 0) <= 0) next[opt.variant.id] = 1;
      }
      return next;
    });
  }

  // Rows shown below the chips: every active variant currently at qty > 0,
  // across *every* axis1 value — switching colour must not hide sizes already
  // picked under another one. With no axes at all, the single default variant
  // always shows (its own qty may still be 0; that's just "not added yet").
  const rowsToShow = useMemo(
    () => (axes.length === 0 ? (defaultVariant ? [defaultVariant] : []) : activeVariants.filter((v) => qtyOf(v.id) > 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [axes.length, defaultVariant, activeVariants, qty],
  );

  /** The badge a row wears: the *last* axis's value for that variant — the
   * size on a colour x size product, the only attribute on a one-axis one. */
  function badgeFor(variant: VariantDetail): string | null {
    const axis = axis2 ?? axis1;
    if (!axis) return null;
    return variant.attribute_values.find((av) => av.attribute_id === axis.id)?.value ?? null;
  }

  const calcLines: CalcLineInput[] = rowsToShow.map((v) => ({
    qty: qtyOf(v.id),
    rate: v.price ? exclusiveRate(v.price.selling_price, v.price.tax_inclusive, taxRate) : 0,
    discountPct: '0',
    taxRate,
  }));
  const totals = computeDocument(calcLines);
  const totalUnits = calcLines.reduce((sum, l) => sum + Number(l.qty), 0);

  // Canvas edit #5: the only place stock is spoken about, and only once a
  // quantity has actually gone past it. Never a block — `handleAdd` and the
  // footer button are untouched by this.
  const exceeding = rowsToShow
    .map((v) => ({ variant: v, qty: qtyOf(v.id), available: availableOf(v) }))
    .filter((row) => row.qty > 0 && row.qty > row.available);

  function handleAdd() {
    const lines: PickedLine[] = rowsToShow
      .filter((v) => qtyOf(v.id) > 0)
      .map((v) => ({ variantId: v.id, qty: qtyOf(v.id), snapshot: lineSnapshotFor(product, v) }));
    onAdd(lines);
    close();
  }

  const primaryImage = product.images.find((i) => i.is_primary) ?? product.images[0] ?? null;
  const from = fromPrice(product);
  const caption = [product.code, from ? formatMoney(from) : null, taxRate ? `GST ${taxRate}%` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Sheet
      ref={sheetRef}
      scroll
      snapPoints={SNAP_POINTS}
      onDismiss={onClose}
      footer={
        <View style={styles.footer}>
          <View style={styles.footerTotals}>
            <Text variant="rowStrong">{`${totalUnits} units · ${formatMoney(totals.taxable)}`}</Text>
            <Text variant="caption" color="muted">Excl. GST</Text>
          </View>
          <Button label="Add to order" onPress={handleAdd} disabled={totalUnits === 0} />
        </View>
      }
    >
      {/* The header *is* the info-sheet trigger (C3): the media frame, the
          name and the info glyph are one tap target, so "tap the name for
          details" needs no instruction line under it. */}
      <ProductInfoSheet
        product={product}
        trigger={
          <View style={styles.header}>
            <View style={styles.headerThumb}>
              <MediaFrame
                {...(primaryImage ? authedImageSource(primaryImage.key) : {})}
                initials={initialsOf(product.name)}
                ratio={1}
              />
            </View>
            <View style={styles.headerText}>
              <View style={styles.headerTitleRow}>
                <Text variant="cardTitle" numberOfLines={1} style={styles.headerTitle}>{product.name}</Text>
                <Info size={16} color={theme.colors.muted} />
              </View>
              <Text variant="caption" color="muted" numberOfLines={1}>{caption}</Text>
            </View>
          </View>
        }
      />

      {axis1 ? (
        <View style={styles.axisSection}>
          <Text variant="label" color="muted">{axis1.name}</Text>
          <View style={styles.chipsRow}>
            {axis1.values.map((v) =>
              // Which control an axis wears follows its *display type*, not its
              // position: a colour axis is a swatch, everything else is a size
              // chip. (A product whose first attribute is the size and whose
              // second is the colour is perfectly legal — see `buildAxes`.)
              axis1.displayType === 'color' ? (
                <ColorSwatch
                  key={v.valueId}
                  label={v.value}
                  color={v.display ?? undefined}
                  selected={axis1Value === v.valueId}
                  onPress={() => setAxis1Value(v.valueId)}
                />
              ) : (
                <SizeChip
                  key={v.valueId}
                  label={v.value}
                  selected={axis1Value === v.valueId}
                  onPress={() => setAxis1Value(v.valueId)}
                />
              ),
            )}
          </View>
        </View>
      ) : null}

      {axis2 ? (
        <View style={styles.axisSection}>
          <View style={styles.axisHeader}>
            <Text variant="label" color="muted">{`${axis2.name} — tap to include`}</Text>
            <Pressable onPress={selectAll} accessibilityRole="button" hitSlop={hit.link}>
              <Text variant="label" color="text">Select all</Text>
            </Pressable>
          </View>
          <View style={styles.chipsRow}>
            {axis2Options.map((opt) =>
              axis2.displayType === 'color' ? (
                <ColorSwatch
                  key={opt.valueId}
                  label={opt.value}
                  color={opt.display ?? undefined}
                  selected={qtyOf(opt.variant.id) > 0}
                  onPress={() => toggleVariant(opt.variant.id)}
                />
              ) : (
              <SizeChip
                key={opt.valueId}
                label={opt.value}
                selected={qtyOf(opt.variant.id) > 0}
                // Only an *inactive* variant is sold out — a low stock level is
                // information, not a block: the order still goes through and a
                // shortage is raised for Production (canvas edit #5). Inactive
                // variants never reach this list at all (see `buildAxes`).
                soldOut={!opt.variant.is_active}
                onPress={() => toggleVariant(opt.variant.id)}
              />
              ),
            )}
          </View>
        </View>
      ) : null}

      {rowsToShow.length ? (
        <View style={styles.axisSection}>
          <Text variant="label" color="muted">Quantities</Text>
          <Card padding="row" style={styles.rowsCard}>
            {rowsToShow.map((v, index) => (
              <VariantRow
                key={v.id}
                sku={v.sku}
                size={badgeFor(v)}
                price={v.price ? exclusiveRate(v.price.selling_price, v.price.tax_inclusive, taxRate) : null}
                qty={qtyOf(v.id)}
                divided={index < rowsToShow.length - 1}
                onChange={(next) => setVariantQty(v.id, next)}
              />
            ))}
          </Card>
          <Text variant="caption" color="muted" style={styles.rowsHint}>
            Reducing a quantity to 0 removes that size from the order
          </Text>
        </View>
      ) : null}

      {/* One note, not one per row: a product picked in six sizes with no
          stock would otherwise bury the sheet under six identical warnings. */}
      {exceeding.length ? (
        <View style={styles.warning}>
          <Banner tone="warning" title={exceedTitle(exceeding, STOCK_LOCATION)} body={EXCEED_BODY} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3] + 2, marginBottom: space[4] },
  headerThumb: { width: CONTROL.avatarLg + space[1] + 2 },
  headerText: { flex: 1, gap: space[1] - 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] - 1 },
  headerTitle: { flexShrink: 1 },
  axisSection: { marginBottom: space[4] },
  axisHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: gapChips, marginTop: space[2] },
  rowsCard: { marginTop: space[2] },
  rowsHint: { marginTop: space[2] },
  warning: { marginBottom: space[3] },
  footer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  footerTotals: { flexShrink: 1 },
});
