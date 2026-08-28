import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Chip, DateField, SectionLabel, Select, Sheet, useSheet } from '@/ui';
import { gapChips, space } from '@/ui/tokens/spacing';
import { usePaymentModes } from '../hooks';
import { PAYMENT_STATUS_LABELS, type PaymentFilters, type PaymentStatus } from '../filters';

const STATUSES = Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[];

export type PaymentFilterSheetProps = {
  filters: PaymentFilters;
  onApply: (next: PaymentFilters) => void;
  onReset: () => void;
};

/** Imperative handle the History view presents this sheet with — same
 * always-mounted pattern as Orders' own `FilterSheet` (see that component's
 * comment for why: it keeps the real `BottomSheetModal` close animation
 * intact rather than unmounting/remounting the sheet's content). */
export type PaymentFilterSheetHandle = { open: () => void };

// The search box (outside this sheet) owns `q` — same convention as Orders'
// `FilterSheet.withoutQuery`, so applying the sheet's draft can never stomp
// on whatever the rep has typed into search in the meantime.
function withoutQuery(f: PaymentFilters): PaymentFilters {
  const rest = { ...f };
  delete rest.q;
  return rest;
}

export const PaymentFilterSheet = forwardRef<PaymentFilterSheetHandle, PaymentFilterSheetProps>(
  function PaymentFilterSheetImpl({ filters, onApply, onReset }, ref) {
    const { ref: sheetRef, open: openSheet, close: closeSheet } = useSheet();
    const [draft, setDraft] = useState<PaymentFilters>(() => withoutQuery(filters));
    const modes = usePaymentModes();
    const activeModes = (modes.data ?? []).filter((m) => m.is_active);

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setDraft(withoutQuery(filters));
          openSheet();
        },
      }),
      [filters, openSheet],
    );

    function patch(next: Partial<PaymentFilters>) {
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

    // Swiping the sheet closed without Apply/Reset re-syncs the draft to the
    // last-applied filters, same as Orders' `FilterSheet.handleDismiss`.
    function handleDismiss() {
      setDraft(withoutQuery(filters));
    }

    return (
      <Sheet
        ref={sheetRef}
        title="Filters"
        scroll
        onDismiss={handleDismiss}
        footer={
          <>
            <Button label="Reset" variant="ghost" onPress={handleReset} />
            <View style={styles.applyButton}>
              <Button label="Apply filters" onPress={handleApply} fullWidth />
            </View>
          </>
        }
      >
        {/* Section order follows the `payments-filter` frame: mode, status,
            date range, then this register's own allocation flag last. */}
        <View style={styles.section}>
          <Select
            label="Mode"
            value={draft.paymentModeId ?? null}
            options={activeModes.map((m) => ({ label: m.name, value: m.id }))}
            onChange={(value) => {
              const mode = activeModes.find((m) => m.id === value);
              patch({ paymentModeId: value ?? undefined, paymentModeName: mode?.name });
            }}
            placeholder="Any mode"
            clearable
          />
        </View>

        <SectionLabel>Status</SectionLabel>
        <View style={styles.chipsRow}>
          {STATUSES.map((status) => (
            <Chip
              key={status}
              label={PAYMENT_STATUS_LABELS[status]}
              size="sm"
              selected={draft.status === status}
              onPress={() => patch({ status: draft.status === status ? undefined : status })}
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

        {/* Last section — it scrolls clear of the pinned Apply/Reset row
            because `Sheet` reserves that row's *measured* height (M4-T1). */}
        <SectionLabel>Allocation</SectionLabel>
        <View style={styles.chipsRow}>
          <Chip
            label="Unallocated only"
            size="sm"
            selected={!!draft.unallocatedOnly}
            onPress={() => patch({ unallocatedOnly: !draft.unallocatedOnly })}
          />
        </View>
      </Sheet>
    );
  },
);

const styles = StyleSheet.create({
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: gapChips },
  section: { marginBottom: space[2] },
  dateRow: { flexDirection: 'row', gap: space[3] },
  dateField: { flex: 1 },
  applyButton: { flex: 1 },
});
