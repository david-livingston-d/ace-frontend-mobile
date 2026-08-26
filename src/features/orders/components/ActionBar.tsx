import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FileDown } from 'lucide-react-native';
import { Button, IconButton, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
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

  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
      {buttons.map((a) => (
        <View key={a} style={styles.button}>
          <Button label={LABELS[a]} variant={PRIMARY.includes(a) ? 'solid' : 'outline'} onPress={handlers[a]} fullWidth />
        </View>
      ))}
      {actions.includes('pdf') ? (
        <IconButton icon={FileDown} label="Download PDF" onPress={onPdf} disabled={pdfLoading} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: { flex: 1 },
});
