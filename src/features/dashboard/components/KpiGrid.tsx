import React from 'react';
import { View, StyleSheet } from 'react-native';
import { KpiTile } from '@/ui';
import { space } from '@/ui/tokens/spacing';
import { formatMoneyShort } from '@/lib/format/money';
import type { OrderPreset } from '@/features/orders/filters';
import type { DashboardSalesOut } from '../types';

export type KpiGridProps = {
  tiles: DashboardSalesOut['tiles'];
  onNavigate: (preset: OrderPreset) => void;
};

export function KpiGrid({ tiles, onNavigate }: KpiGridProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.cell}>
        {/* The register has no exact filter for "today's orders" — the backend tile
            excludes cancelled orders, a distinction the register's own filters can't
            express yet — so this tile opens the closest useful view instead. */}
        <KpiTile label="TODAY'S ORDERS" value={String(tiles.today_orders)} onPress={() => onNavigate('open')} />
      </View>
      <View style={styles.cell}>
        <KpiTile label="OPEN ORDERS" value={String(tiles.open_orders)} onPress={() => onNavigate('open')} />
      </View>
      <View style={styles.cell}>
        <KpiTile label="PENDING DELIVERIES" value={String(tiles.pending_deliveries)} onPress={() => onNavigate('pendingDelivery')} />
      </View>
      <View style={styles.cell}>
        <KpiTile
          label="PAYMENT PENDING"
          value={formatMoneyShort(tiles.payment_pending_amount)}
          hint={`${tiles.payment_pending_count} orders`}
          onPress={() => onNavigate('pendingPayment')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  cell: { flexBasis: '47%', flexGrow: 1 },
});
