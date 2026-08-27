import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Text, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { radius } from '@/ui/tokens/radius';
import type { CustomerOut } from '../types';

export type CustomerRowProps = {
  customer: CustomerOut;
  /** Resolved from `useCustomerTypes()` by the caller — the row itself has no
   * opinion on where the name for `customer_type_id` comes from. */
  typeName?: string;
  onPress?: () => void;
};

function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]);
  return letters.join('').toUpperCase() || '?';
}

export function CustomerRow({ customer, typeName, onPress }: CustomerRowProps) {
  const theme = useTheme();
  const subtitle = [customer.code, typeName, customer.state].filter(Boolean).join(' · ');

  const content = (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceSunken, borderRadius: radius.pill }]}>
        <Text variant="label" color="textMuted">{initials(customer.name)}</Text>
      </View>
      <View style={styles.main}>
        <Text variant="body" numberOfLines={1}>{customer.name}</Text>
        <Text variant="bodySm" color="textMuted" numberOfLines={1}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color={theme.colors.textSubtle} />
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: space[3],
  },
  avatar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, gap: 2 },
});
