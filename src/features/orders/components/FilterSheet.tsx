import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { Text, Chip, Button, ListRow, IconButton, DateField, SearchBar, Sheet, useSheet } from '@/ui';
import { space } from '@/ui/tokens/spacing';
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
  /** The screen mounts this component only while the sheet should be open, and
   * unmounts it on apply/reset/dismiss — see the note below on why closing
   * means "unmount", not "animate away and stay mounted". */
  onRequestClose: () => void;
};

// The search box (outside this sheet) owns `q` — the sheet's own draft never
// carries it, so applying the sheet's filters can never stomp on whatever the
// user has typed into search in the meantime.
function withoutQuery(f: OrderFilters): OrderFilters {
  const rest = { ...f };
  delete rest.q;
  return rest;
}

// Being mounted *is* "the sheet is open" here — the screen conditionally
// renders this component rather than toggling an internal open flag. That's
// deliberate: `@gorhom/bottom-sheet`'s own close animation drives an eventual
// unmount through `useAnimatedReaction`/`useDerivedValue`-based completion
// detection, and the officially documented reanimated Jest mock makes both
// non-reactive (they evaluate once, not on every shared-value change) — so
// under test, dismissing the sheet never actually removes its portal content,
// no matter how long a test waits. Tying "closed" to a real unmount sidesteps
// that gap entirely via plain React reconciliation, which needs no animation
// completion signal to work.
export function FilterSheet({ filters, onApply, onReset, onRequestClose }: FilterSheetProps) {
  const showSalesUser = useScope('sales_order.read') !== 'own';
  const { ref: sheetRef, open: openSheet, close: closeSheet } = useSheet();
  const [draft, setDraft] = useState<OrderFilters>(() => withoutQuery(filters));

  useEffect(() => {
    openSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch(next: Partial<OrderFilters>) {
    setDraft((d) => ({ ...d, ...next }));
  }

  function handleApply() {
    onApply(draft);
    closeSheet();
    onRequestClose();
  }

  function handleReset() {
    onReset();
    closeSheet();
    onRequestClose();
  }

  return (
    <Sheet
      ref={sheetRef}
      title="Filters"
      scroll
      onDismiss={onRequestClose}
      footer={
        <>
          <Button label="Reset" variant="ghost" onPress={handleReset} />
          <View style={styles.applyButton}>
            <Button label="Apply filters" onPress={handleApply} fullWidth />
          </View>
        </>
      }
    >
      <Text variant="label" color="textMuted" style={styles.sectionLabel}>Status</Text>
      <View style={styles.chipsRow}>
        {STATUS_PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={PRESET_LABELS[preset]}
            selected={(draft.preset ?? 'open') === preset}
            onPress={() => patch({ preset })}
          />
        ))}
      </View>

      <Text variant="label" color="textMuted" style={styles.sectionLabel}>Date range</Text>
      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <DateField label="From" value={draft.dateFrom} onChange={(v) => patch({ dateFrom: v ?? undefined })} clearable />
        </View>
        <View style={styles.dateField}>
          <DateField label="To" value={draft.dateTo} onChange={(v) => patch({ dateTo: v ?? undefined })} clearable />
        </View>
      </View>

      <Text variant="label" color="textMuted" style={styles.sectionLabel}>Customer</Text>
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

      <Text variant="label" color="textMuted" style={styles.sectionLabel}>Stock</Text>
      <View style={styles.chipsRow}>
        <Chip label="Stock shortage" selected={!!draft.openShortage} onPress={() => patch({ openShortage: !draft.openShortage })} />
      </View>
    </Sheet>
  );
}

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
      <Text variant="label" color="textMuted" style={styles.sectionLabel}>Sales user</Text>
      <View style={styles.chipsRow}>
        {salesUsers.map((u) => (
          <Chip key={u.id} label={u.name} selected={u.id === selectedId} onPress={() => onSelect(u.id, u.name)} />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: space[4], marginBottom: space[2] },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  dateRow: { flexDirection: 'row', gap: space[3] },
  dateField: { flex: 1 },
  applyButton: { flex: 1 },
});
