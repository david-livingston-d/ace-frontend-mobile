import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Sheet, useSheet, Input, Button } from '@/ui';

export type ReasonSheetHandle = { open: () => void; close: () => void };

export type ReasonSheetProps = {
  title: string;
  placeholder: string;
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  loading?: boolean;
};

const MIN_REASON_LENGTH = 3;

/** Cancel (and, later, short-close) both need a free-text reason before the
 * confirm button will even accept a press — the sheet owns that validation
 * so every caller gets the same "at least 3 characters" rule for free. */
export const ReasonSheet = forwardRef<ReasonSheetHandle, ReasonSheetProps>(function ReasonSheetImpl(
  { title, placeholder, confirmLabel, onConfirm, loading },
  ref,
) {
  const { ref: sheetRef, open, close } = useSheet();
  const [reason, setReason] = useState('');

  useImperativeHandle(
    ref,
    () => ({
      // Re-seeded blank every time it's opened, so a previous abandoned
      // attempt never resurfaces on the next open (same rule as `FilterSheet`).
      open: () => {
        setReason('');
        open();
      },
      close,
    }),
    [open, close],
  );

  const valid = reason.trim().length >= MIN_REASON_LENGTH;

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
            <Button
              label={confirmLabel}
              variant="solid"
              disabled={!valid}
              loading={loading}
              onPress={() => onConfirm(reason.trim())}
              fullWidth
            />
          </View>
        </>
      }
    >
      <Input label="Reason" value={reason} onChangeText={setReason} placeholder={placeholder} multiline sheetInput />
    </Sheet>
  );
});

const styles = StyleSheet.create({ footerButton: { flex: 1 } });
