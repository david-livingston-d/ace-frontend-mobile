import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { Button, Chip, DateField, IconButton, ListRow, SearchBar, SectionLabel, Sheet, useSheet } from '@/ui';
import { gapChips, gapInline, space } from '@/ui/tokens/spacing';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { CustomerOut } from '@/lib/api/types';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useScope } from '@/lib/permissions';
import { useDashboard } from '@/features/dashboard/hooks';
import { PRESET_LABELS, type OrderFilters, type OrderPreset } from '../filters';

// The status row offers every phase/status preset except `stockShortage`,
// which this sheet exposes as its own "Stock shortage" toggle chip (bound to
// `openShortage`) rather than as a mutually-exclusive status.
const STATUS_PRESETS = (Object.keys(PRESET_LABELS) as OrderPreset[]).filter((p) => p !== 'stockShortage');

export type FilterSheetProps = {
  filters: OrderFilters;
  onApply: (next: OrderFilters) => void;
  onReset: () => void;
};

/** Imperative handle the screen uses to present the sheet — mirrors `Select`'s
 * own `useSheet()` pattern (the sheet stays mounted for the screen's whole
 * lifetime; opening/closing is the real `BottomSheetModal` animation, not a
 * mount/unmount). */
export type FilterSheetHandle = { open: () => void };

// The search box (outside this sheet) owns `q` — the sheet's own draft never
// carries it, so applying the sheet's filters can never stomp on whatever the
// user has typed into search in the meantime.
function withoutQuery(f: OrderFilters): OrderFilters {
  const rest = { ...f };
  delete rest.q;
  return rest;
}

// Mounted for the screen's whole lifetime (like `Select`'s sheet) — the
// screen presents it via the `open()` handle below rather than mounting it on
// demand. That keeps the real `BottomSheetModal` close animation intact in
// production; a previous revision unmounted this component to close it
// (working around a Jest-only limitation — the reanimated mock's
// `useAnimatedReaction`/`useDerivedValue` evaluate once, not reactively, so a
// dismissed sheet's content never actually left the render tree under test),
// which killed the slide-down animation on device. The Jest-side gap is fixed
// instead, with a `__mocks__/@gorhom/bottom-sheet.tsx` that actually
// mounts/unmounts children around `present()`/`dismiss()`.
export const FilterSheet = forwardRef<FilterSheetHandle, FilterSheetProps>(function FilterSheetImpl(
  { filters, onApply, onReset },
  ref,
) {
  const showSalesUser = useScope('sales_order.read') !== 'own';
  const { ref: sheetRef, open: openSheet, close: closeSheet } = useSheet();
  const [draft, setDraft] = useState<OrderFilters>(() => withoutQuery(filters));

  useImperativeHandle(
    ref,
    () => ({
      // Re-seed the draft from the committed filters every time the sheet is
      // opened, so a previous session's abandoned edits (dismissed without
      // Apply) never resurface on the next open.
      open: () => {
        setDraft(withoutQuery(filters));
        openSheet();
      },
    }),
    [filters, openSheet],
  );

  function patch(next: Partial<OrderFilters>) {
    setDraft((d) => ({ ...d, ...next }));
  }

  function handleApply() {
    onApply(draft);
    closeSheet();
  }

  function handleReset() {
    onReset();
    closeSheet();
  }

  // Swiping the sheet down (no Apply/Reset press) dismisses it without
  // committing `draft` — re-sync the draft back to the last-applied filters
  // so a stray in-progress edit doesn't linger for the next open.
  function handleDismiss() {
    setDraft(withoutQuery(filters));
  }

  return (
    <Sheet
      ref={sheetRef}
      title="Filters"
      scroll
      onDismiss={handleDismiss}
      // `orders-filter` frame: an outline Reset sharing the row with a primary
      // Apply at twice its width — the sheet's own measured footer clearance
      // (M4-T1) is what keeps the last section scrollable above it.
      footer={
        <>
          <View style={styles.resetButton}>
            <Button label="Reset" variant="outline" onPress={handleReset} fullWidth />
          </View>
          <View style={styles.applyButton}>
            <Button label="Apply filters" onPress={handleApply} fullWidth />
          </View>
        </>
      }
    >
      <SectionLabel>Status</SectionLabel>
      <View style={styles.chipsRow}>
        {STATUS_PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={PRESET_LABELS[preset]}
            size="sm"
            selected={(draft.preset ?? 'open') === preset}
            onPress={() => patch({ preset })}
          />
        ))}
      </View>

      <SectionLabel>Date range</SectionLabel>
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <DateField label="From" value={draft.dateFrom} onChange={(v) => patch({ dateFrom: v ?? undefined })} clearable />
        </View>
        <View style={styles.dateField}>
          <DateField label="To" value={draft.dateTo} onChange={(v) => patch({ dateTo: v ?? undefined })} clearable />
        </View>
      </View>

      <SectionLabel>Customer</SectionLabel>
      <CustomerPicker
        customerId={draft.customerId}
        customerName={draft.customerName}
        onSelect={(id, name) => patch({ customerId: id, customerName: name })}
        onClear={() => patch({ customerId: undefined, customerName: undefined })}
      />

      {showSalesUser ? (
        <SalesUserSection
          selectedId={draft.salesUserId}
          onSelect={(id, name) =>
            patch({
              salesUserId: id === draft.salesUserId ? undefined : id,
              salesUserName: id === draft.salesUserId ? undefined : name,
            })
          }
        />
      ) : null}

      <SectionLabel>Stock</SectionLabel>
      <View style={styles.chipsRow}>
        <Chip label="Stock shortage" size="sm" selected={!!draft.openShortage} onPress={() => patch({ openShortage: !draft.openShortage })} />
      </View>
    </Sheet>
  );
});

function CustomerPicker({
  customerId,
  customerName,
  onSelect,
  onClear,
}: {
  customerId: string | undefined;
  customerName: string | undefined;
  onSelect: (id: string, name: string) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 300);
  // Only searches once the user types something — an unguarded fetch on every
  // sheet open would fire a `/customers` request this task's own screen tests
  // never expect (they mock `/sales-orders` and `/dashboard/sales` only).
  const enabled = debouncedQ.trim().length > 0;
  const query = useQuery({
    queryKey: keys.customers({ q: debouncedQ, is_active: true, limit: 20 }),
    queryFn: () =>
      api
        .get<{ items: CustomerOut[]; total: number }>('/customers', { params: { q: debouncedQ, is_active: true, limit: 20 } })
        .then((r) => r.data),
    enabled,
  });

  if (customerId) {
    return (
      <ListRow
        title={customerName ?? 'Customer'}
        right={<IconButton icon={X} label="Clear customer" size="sm" onPress={onClear} />}
      />
    );
  }

  return (
    <View>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search customer" />
      {query.data?.items.map((c) => (
        <ListRow key={c.id} title={c.name} onPress={() => onSelect(c.id, c.name)} />
      ))}
    </View>
  );
}

function SalesUserSection({
  selectedId,
  onSelect,
}: {
  selectedId: string | undefined;
  onSelect: (id: string, name: string) => void;
}) {
  const { data } = useDashboard(null);
  const salesUsers = data?.sales_users ?? [];
  if (!salesUsers.length) return null;
  return (
    <>
      <SectionLabel>Sales user</SectionLabel>
      <View style={styles.chipsRow}>
        {salesUsers.map((u) => (
          <Chip key={u.id} label={u.name} size="sm" selected={u.id === selectedId} onPress={() => onSelect(u.id, u.name)} />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // The vertical padding gives each chip's drop shadow somewhere to land.
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: gapChips - 1, paddingVertical: space[1] },
  dateRow: { flexDirection: 'row', gap: gapInline },
  dateField: { flex: 1 },
  resetButton: { flex: 1 },
  applyButton: { flex: 2 },
});
