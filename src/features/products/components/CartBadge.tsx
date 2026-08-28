import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text, useBottomClearance, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import { formatMoney } from '@/lib/format/money';

export type CartBadgeProps = {
  unitCount: number;
  amount: number;
  onPress: () => void;
};

/** Floating bottom-right summary of the order draft — hidden entirely while
 * the draft is empty (nothing to review yet). It floats over the screen rather
 * than inside its safe-area padding, so it carries its own bottom clearance:
 * on a gesture-navigation device the pill otherwise sits under the home
 * indicator. `tabBar: false` — the product browser is a root route and a
 * wizard step, never a tab, so there is no bar beneath it to clear. */
export function CartBadge({ unitCount, amount, onPress }: CartBadgeProps) {
  const theme = useTheme();
  const bottom = useBottomClearance({ tabBar: false });
  if (unitCount <= 0) return null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="View order draft"
      style={[styles.badge, { backgroundColor: theme.colors.solidBg, bottom }]}
    >
      <Text variant="label" color="solidFg">{`${unitCount} items · ${formatMoney(amount)}`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: space[4],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.pill,
    elevation: 4,
  },
});
