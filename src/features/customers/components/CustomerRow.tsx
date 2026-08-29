import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { RowCard, StatusChip, Text, useTheme } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoney } from '@/lib/format/money';
import type { CustomerOut } from '../types';

export type CustomerRowProps = {
  customer: CustomerOut;
  /** Resolved from `useCustomerTypes()` by the caller — the row itself has no
   * opinion on where the name for `customer_type_id` comes from. */
  typeName?: string;
  /**
   * What this customer owes / has on account, when the caller happens to know
   * it. `/customers` returns neither (nor a city — only the state), and there
   * is no bulk endpoint for them, so the register deliberately leaves these
   * out rather than firing a `financial-summary` request per row. They are
   * shown where they *are* known: the wizard's picked-customer card and the
   * customer detail screen, both of which fetch one customer's summary.
   */
  outstanding?: string | null;
  advance?: string | null;
  onPress?: () => void;
};

/**
 * One customer in any list (`customer-picker`, `wizard-1-empty`): the name with
 * its customer-type badge, `code · location` underneath, and — where the caller
 * knows them — the outstanding (red) / advance (green) hints.
 */
export function CustomerRow({ customer, typeName, outstanding, advance, onPress }: CustomerRowProps) {
  const theme = useTheme();
  const owed = outstanding != null && Number(outstanding) > 0;
  const onAccount = advance != null && Number(advance) > 0;

  return (
    <RowCard
      onPress={onPress}
      title={customer.name}
      badges={typeName ? <StatusChip tone="neutral" label={typeName} size="sm" /> : undefined}
      meta={
        <View style={styles.meta}>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {[customer.code, customer.state].filter(Boolean).join(' · ')}
          </Text>
          {owed || onAccount ? (
            <View style={styles.money}>
              {owed ? (
                <Text variant="caption" color={theme.colors.tone.danger.fg}>
                  {`Outstanding ${formatMoney(outstanding!)}`}
                </Text>
              ) : null}
              {onAccount ? (
                <Text variant="caption" color={theme.colors.tone.success.fg}>
                  {`Advance ${formatMoney(advance!)}`}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      }
      trailing={<ChevronRight size={18} color={theme.colors.subtle} />}
    />
  );
}

const styles = StyleSheet.create({
  meta: { gap: space[1] },
  money: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
});
