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
  onRecordPayment: () => void;
  onPdf: () => void;
  pdfLoading?: boolean;
};

const LABELS: Record<Exclude<Action, 'pdf'>, string> = {
  edit: 'Edit',
  verify: 'Send to stock check',
  cancel: 'Cancel',
  recordDelivery: 'Record delivery',
  recordPayment: 'Record payment',
};

// Verify/Record delivery are the action bar's one "primary" button (solid) —
// every other action in the row (edit, cancel, record payment) stays outline.
const PRIMARY: Action[] = ['verify', 'recordDelivery'];

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
    recordPayment: onRecordPayment,
  };
  const buttons = actions.filter((a): a is Exclude<Action, 'pdf'> => a !== 'pdf');
  if (actions.length === 0) return null;

  const hasPdf = actions.includes('pdf');
  // The PDF glyph counts as one of the row's three slots.
  const perRow = hasPdf ? MAX_PER_ROW - 1 : MAX_PER_ROW;
  const firstRow = buttons.slice(0, perRow);
  const overflow = buttons.slice(perRow);

  function renderButton(a: Exclude<Action, 'pdf'>) {
    const primary = PRIMARY.includes(a);
    return (
      <View key={a} style={primary ? styles.primarySlot : styles.slot}>
        <Button label={LABELS[a]} variant={primary ? 'solid' : 'outline'} size="sm" onPress={handlers[a]} fullWidth />
      </View>
    );
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
      {overflow.length ? <View style={styles.row}>{overflow.map(renderButton)}</View> : null}
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
  slot: { flex: 1 },
  primarySlot: { flex: PRIMARY_FLEX },
});
