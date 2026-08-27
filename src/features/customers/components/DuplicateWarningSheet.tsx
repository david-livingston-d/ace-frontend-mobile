import React, { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import { Sheet, useSheet, Text, Button } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import type { DuplicateMatch } from '../types';

export type DuplicateWarningSheetHandle = { open: () => void; close: () => void };

export type DuplicateWarningSheetProps = {
  matches: DuplicateMatch[];
  onUseExisting: (customerId: string) => void;
  onCreateAnyway: () => void;
  loading?: boolean;
};

/** Shown after `POST /customers/duplicate-check` comes back with at least one
 * match, before anything is actually created — each match gets its own "use
 * existing" (there can be more than one possible match), while "create
 * anyway" is one footer action that re-runs the create with `force: true`. */
export const DuplicateWarningSheet = forwardRef<DuplicateWarningSheetHandle, DuplicateWarningSheetProps>(
  function DuplicateWarningSheetImpl({ matches, onUseExisting, onCreateAnyway, loading }, ref) {
    const { ref: sheetRef, open, close } = useSheet();
    useImperativeHandle(ref, () => ({ open, close }), [open, close]);

    return (
      <Sheet
        ref={sheetRef}
        title="Possible duplicate"
        scroll
        footer={
          <View style={styles.footerButton}>
            <Button label="Create anyway" variant="solid" loading={loading} onPress={onCreateAnyway} fullWidth />
          </View>
        }
      >
        <Text variant="bodySm" color="textMuted" style={styles.hint}>
          A customer matching some of these details already exists.
        </Text>
        {matches.map((m) => (
          <View key={m.id} style={styles.matchRow}>
            <Text variant="body">
              {m.name} · matched on {m.matched_on.join(', ')}
            </Text>
            <Button label="Use existing" variant="outline" onPress={() => onUseExisting(m.id)} />
          </View>
        ))}
      </Sheet>
    );
  },
);

const styles = StyleSheet.create({
  hint: { marginBottom: space[3] },
  matchRow: { gap: space[2], paddingVertical: space[2] },
  footerButton: { flex: 1 },
});
