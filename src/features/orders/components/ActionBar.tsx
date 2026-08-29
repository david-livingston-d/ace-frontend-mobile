import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FileDown } from 'lucide-react-native';
import { Button, IconButton, useTheme } from '@/ui';
import { gapInline, gutter, space } from '@/ui/tokens/spacing';
import { shadow } from '@/ui/tokens/elevation';
import type { Action } from '../actions';

export type ActionBarProps = {
  actions: Action[];
  onEdit: () => void;
  onVerify: () => void;
  onCancel: () => void;
  onRecordDelivery: () => void;
  onCreateInvoice: () => void;
  onRecordPayment: () => void;
  onPdf: () => void;
  pdfLoading?: boolean;
};

const LABELS: Record<Exclude<Action, 'pdf'>, string> = {
  edit: 'Edit',
  verify: 'Send to stock check',
  cancel: 'Cancel',
  recordDelivery: 'Record delivery',
  createInvoice: 'Create invoice',
  recordPayment: 'Record payment',
};

// The bar has exactly **one** solid button: the first of these that the order
// actually offers. An open order can offer both "Record delivery" and "Create
// invoice" (partly shipped, partly delivered) — two solid pills side by side
// would say neither is the thing to do, so shipping the goods stays the
// primary and invoicing them falls back to outline. Everything else (edit,
// cancel, record payment) is outline always.
const PRIMARY_ORDER: Action[] = ['verify', 'recordDelivery', 'createInvoice'];

/**
 * Which action gets squeezed off the first row, most important first.
 *
 * Explicit, because the alternative is *declaration* order — and `visibleActions`
 * builds its list phase by phase, so what happened to be last in a phase's block
 * decided what got demoted. The order below is the rep's: the action that moves
 * the order along outranks a correction, which outranks the destructive one.
 * Every button the phase offers is still in the bar; this only says which row.
 */
const PRIORITY: Exclude<Action, 'pdf'>[] = [
  'verify',
  'recordDelivery',
  'createInvoice',
  'recordPayment',
  'edit',
  'cancel',
];

/** Canvas edit #7: the bar is **one row** — the primary at `flex: 1.5` and up
 * to two outline actions at `flex: 1` each, none of them wrapping. A second
 * row only appears when an order genuinely offers more than three actions
 * (draft: edit + verify + cancel + PDF), because four pills in one row leave
 * no button wide enough to read. */
const PRIMARY_FLEX = 1.5;
const MAX_PER_ROW = 3;

export function ActionBar({
  actions,
  onEdit,
  onVerify,
  onCancel,
  onRecordDelivery,
  onCreateInvoice,
  onRecordPayment,
  onPdf,
  pdfLoading,
}: ActionBarProps) {
  const theme = useTheme();
  const handlers: Record<Exclude<Action, 'pdf'>, () => void> = {
    edit: onEdit,
    verify: onVerify,
    cancel: onCancel,
    recordDelivery: onRecordDelivery,
    createInvoice: onCreateInvoice,
    recordPayment: onRecordPayment,
  };
  const buttons = actions.filter((a): a is Exclude<Action, 'pdf'> => a !== 'pdf');
  if (actions.length === 0) return null;

  const primary = PRIMARY_ORDER.find((a) => actions.includes(a)) ?? null;

  const hasPdf = actions.includes('pdf');
  // The PDF glyph counts as one of the row's three slots.
  const perRow = hasPdf ? MAX_PER_ROW - 1 : MAX_PER_ROW;
  // Demote by *priority*, then render each row back in declaration order, so
  // the bar still reads left to right the way the phase describes itself.
  const rank = (a: Exclude<Action, 'pdf'>) => {
    const i = PRIORITY.indexOf(a);
    return i === -1 ? PRIORITY.length : i;
  };
  const demoted = new Set([...buttons].sort((a, b) => rank(a) - rank(b)).slice(perRow));
  const firstRow = buttons.filter((a) => !demoted.has(a));
  const overflow = buttons.filter((a) => demoted.has(a));

  function renderButton(a: Exclude<Action, 'pdf'>) {
    const isPrimary = a === primary;
    return (
      <View key={a} style={isPrimary ? styles.primarySlot : styles.slot}>
        <Button label={LABELS[a]} variant={isPrimary ? 'solid' : 'outline'} size="sm" onPress={handlers[a]} fullWidth />
      </View>
    );
  }

  /** The demoted row sizes to its labels and sits at the trailing edge — a
   * full-width outline "Cancel" under a solid primary reads as a second
   * primary, which is the one thing the single-solid rule exists to prevent. */
  function renderOverflowButton(a: Exclude<Action, 'pdf'>) {
    return <Button key={a} label={LABELS[a]} variant="outline" size="sm" onPress={handlers[a]} />;
  }

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: theme.colors.chrome, borderTopColor: theme.colors.hairline },
        shadow('overlay', theme.mode),
      ]}
    >
      <View style={styles.row}>
        {firstRow.map(renderButton)}
        {hasPdf ? (
          <IconButton
            icon={FileDown}
            label="Download PDF"
            variant="surface"
            size="lg"
            onPress={onPdf}
            disabled={pdfLoading}
          />
        ) : null}
      </View>
      {overflow.length ? (
        <View style={[styles.row, styles.overflowRow]}>{overflow.map(renderOverflowButton)}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: space[2],
    paddingHorizontal: gutter,
    paddingTop: space[3],
    paddingBottom: space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: gapInline },
  overflowRow: { justifyContent: 'flex-end' },
  slot: { flex: 1 },
  primarySlot: { flex: PRIMARY_FLEX },
});
