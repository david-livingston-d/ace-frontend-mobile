import React, { forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import { Sheet, useSheet, Text, Button, Banner, Card } from '@/ui';
import { gapList, space } from '@/ui/tokens/spacing';
import type { DuplicateMatch } from '../types';

export type DuplicateWarningSheetHandle = { open: () => void; close: () => void };

export type DuplicateWarningSheetProps = {
  matches: DuplicateMatch[];
  onUseExisting: (customerId: string) => void;
  onCreateAnyway: () => void;
  loading?: boolean;
};

/**
 * The `duplicate-warning` frame. Shown after `POST /customers/duplicate-check`
 * comes back with at least one match, before anything is actually created.
 *
 * It **warns, never blocks** (PRD customer rule 9): each match carries its own
 * "Use existing" — there can legitimately be more than one candidate, so the
 * choice belongs on the row rather than in the footer — while "Create anyway"
 * is the one footer action, re-running the create with `force: true`.
 */
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
        <Banner
          tone="warning"
          title={matches.length === 1 ? 'A customer already looks like this one' : `${matches.length} customers already look like this one`}
          body="Use an existing customer wherever you can — customers are reused across orders, never recreated per order."
        />

        <View style={styles.matches}>
          {matches.map((m) => (
            <Card key={m.id} padding="row">
              {/* Name and reason on one line: what the rep is deciding between
                  is "this customer, because of *that*" — splitting them made
                  the reason read as a second, unrelated fact. */}
              <Text variant="rowTitle" numberOfLines={3}>
                {m.name} · matched on {m.matched_on.join(', ')}
              </Text>
              <View style={styles.matchAction}>
                <Button label="Use existing" variant="outline" size="sm" onPress={() => onUseExisting(m.id)} />
              </View>
            </Card>
          ))}
        </View>
      </Sheet>
    );
  },
);

const styles = StyleSheet.create({
  matches: { gap: gapList, marginTop: space[3] },
  matchAction: { marginTop: space[3], alignSelf: 'flex-start' },
  footerButton: { flex: 1 },
});
