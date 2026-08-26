import React, { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import { Sheet, useSheet, Text, Button } from '@/ui';

export type ConfirmSheetHandle = { open: () => void; close: () => void };

export type ConfirmSheetProps = {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  loading?: boolean;
};

/** A generic "are you sure" sheet — used for Verify today, reusable for any
 * later confirm-only action that needs no free-text reason (see `ReasonSheet`
 * for the cancel/short-close case, which does). */
export const ConfirmSheet = forwardRef<ConfirmSheetHandle, ConfirmSheetProps>(function ConfirmSheetImpl(
  { title, body, confirmLabel, onConfirm, loading },
  ref,
) {
  const { ref: sheetRef, open, close } = useSheet();
  useImperativeHandle(ref, () => ({ open, close }), [open, close]);

  return (
    <Sheet
      ref={sheetRef}
      title={title}
      footer={
        <>
          <View style={styles.footerButton}>
            <Button label="Back" variant="outline" onPress={close} fullWidth />
          </View>
          <View style={styles.footerButton}>
            <Button label={confirmLabel} variant="solid" loading={loading} onPress={onConfirm} fullWidth />
          </View>
        </>
      }
    >
      <Text variant="bodySm" color="textMuted">{body}</Text>
    </Sheet>
  );
});

const styles = StyleSheet.create({ footerButton: { flex: 1 } });
