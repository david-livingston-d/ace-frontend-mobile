import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FileDown } from 'lucide-react-native';
import { Button, IconButton, useTheme } from '@/ui';
import { gapInline, gutter, space } from '@/ui/tokens/spacing';
import { shadow } from '@/ui/tokens/elevation';
import { splitRows, type Action, type TextAction } from '../actions';

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

/** What the button says out loud — to a screen reader, and in the overflow row
 * where there is room for the whole sentence. */
const LABELS: Record<TextAction, string> = {
  edit: 'Edit',
  verify: 'Send to stock check',
  cancel: 'Cancel',
  recordDelivery: 'Record delivery',
  createInvoice: 'Create invoice',
  recordPayment: 'Record payment',
};

/**
 * What it says *in the row* (canvas edit #7). Three buttons across a phone
 * leave roughly ten characters each: "Record payment" wrapped onto two lines on
 * device, so the two outline actions are named by their noun and keep the verb
 * in `LABELS` as the accessibility label. The primary is the widest slot
 * (`flex: 1.5`) and keeps its full label.
 */
const BAR_LABELS: Partial<Record<TextAction, string>> = {
  createInvoice: 'Invoice',
  recordPayment: 'Payment',
};

/** Canvas edit #7: the primary is half again as wide as an outline action. */
const PRIMARY_FLEX = 1.5;

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
  const handlers: Record<TextAction, () => void> = {
    edit: onEdit,
    verify: onVerify,
    cancel: onCancel,
    recordDelivery: onRecordDelivery,
    createInvoice: onCreateInvoice,
    recordPayment: onRecordPayment,
  };
  if (actions.length === 0) return null;

  const { firstRow, overflow, primary, hasPdf } = splitRows(actions);

  function renderButton(a: TextAction) {
    const isPrimary = a === primary;
    return (
      <View key={a} style={isPrimary ? styles.primarySlot : styles.slot}>
        <Button
          label={BAR_LABELS[a] ?? LABELS[a]}
          accessibilityLabel={LABELS[a]}
          variant={isPrimary ? 'solid' : 'outline'}
          size="sm"
          onPress={handlers[a]}
          fullWidth
        />
      </View>
    );
  }

  /** The demoted row sizes to its labels and sits at the trailing edge — a
   * full-width outline "Cancel" under a solid primary reads as a second
   * primary, which is the one thing the single-solid rule exists to prevent. */
  function renderOverflowButton(a: TextAction) {
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
