import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Sheet, useSheet, Text, Chip, Button, Divider, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import { formatMoney } from '@/lib/format/money';
import { exclusiveRate, computeDocument, type CalcLineInput } from '@/lib/sales/calc';
import { VariantRow } from './VariantRow';
import { ProductInfoSheet } from './ProductInfoSheet';
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

/**
 * C1/C2: pick one or more of a product's active variants and their
 * quantities. Two attributes render as colour chips (axis 1, single-select)
 * over size chips (axis 2, multi-select toggle + "Select all"); one attribute
 * is chips alone; no attributes is just the single default variant. A
 * variant's row (sku · price, stock, qty stepper) appears once its
 * combination is toggled on; dropping its qty back to 0 removes the row.
 */
export function VariantPickerSheet({ product, initial, onAdd, onClose }: VariantPickerSheetProps) {
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
  const [axis1Value, setAxis1Value] = useState<string | null>(axis1?.values[0]?.valueId ?? null);

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

  const calcLines: CalcLineInput[] = rowsToShow.map((v) => ({
    qty: qtyOf(v.id),
    rate: v.price ? exclusiveRate(v.price.selling_price, v.price.tax_inclusive, taxRate) : 0,
    discountPct: '0',
    taxRate,
  }));
  const totals = computeDocument(calcLines);
  const totalUnits = calcLines.reduce((sum, l) => sum + Number(l.qty), 0);

  function handleAdd() {
    const lines: PickedLine[] = rowsToShow
      .filter((v) => qtyOf(v.id) > 0)
      .map((v) => ({ variantId: v.id, qty: qtyOf(v.id), snapshot: lineSnapshotFor(product, v) }));
    onAdd(lines);
    close();
  }

  return (
    <Sheet
      ref={sheetRef}
      scroll
      onDismiss={onClose}
      footer={
        <View style={styles.footer}>
          <View>
            <Text variant="bodySm">{`${totalUnits} units · ${formatMoney(totals.taxable)}`}</Text>
            <Text variant="caption" color="textSubtle">Excl. GST</Text>
          </View>
          <Button label="Add to order" onPress={handleAdd} disabled={totalUnits === 0} />
        </View>
      }
    >
      <ProductInfoSheet product={product} />
      <Divider style={styles.divider} />

      {axis1 ? (
        <View style={styles.axisSection}>
          <Text variant="label" color="textMuted">{axis1.name}</Text>
          <View style={styles.chipsRow}>
            {axis1.values.map((v) => (
              <AxisChip
                key={v.valueId}
                label={v.value}
                colorHex={axis1.displayType === 'color' ? v.display : null}
                selected={axis1Value === v.valueId}
                onPress={() => setAxis1Value(v.valueId)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {axis2 ? (
        <View style={styles.axisSection}>
          <View style={styles.axisHeader}>
            <Text variant="label" color="textMuted">{axis2.name}</Text>
            <Pressable onPress={selectAll} accessibilityRole="button">
              <Text variant="label" color="textMuted">Select all</Text>
            </Pressable>
          </View>
          <View style={styles.chipsRow}>
            {axis2Options.map((opt) => (
              <Chip key={opt.valueId} label={opt.value} selected={qtyOf(opt.variant.id) > 0} onPress={() => toggleVariant(opt.variant.id)} />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.rows}>
        {rowsToShow.map((v) => (
          <VariantRow
            key={v.id}
            sku={v.sku}
            price={v.price ? exclusiveRate(v.price.selling_price, v.price.tax_inclusive, taxRate) : null}
            stock={v.stock}
            qty={qtyOf(v.id)}
            onChange={(next) => setVariantQty(v.id, next)}
          />
        ))}
      </View>
    </Sheet>
  );
}

function AxisChip({ label, colorHex, selected, onPress }: { label: string; colorHex?: string | null; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.axisChip,
        {
          borderColor: theme.colors.border,
          backgroundColor: selected ? theme.colors.inverseBg : theme.colors.surfaceSunken,
          borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {colorHex ? <View style={[styles.colorDot, { backgroundColor: colorHex, borderColor: theme.colors.border }]} /> : null}
      <Text variant="caption" color={selected ? theme.colors.inverseText : theme.colors.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  divider: { marginVertical: space[3] },
  axisSection: { marginBottom: space[3] },
  axisHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] },
  axisChip: { flexDirection: 'row', alignItems: 'center', gap: space[1], borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: space[1] },
  colorDot: { width: 12, height: 12, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  rows: { marginTop: space[2] },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
});
