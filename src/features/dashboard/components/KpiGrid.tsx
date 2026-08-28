import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HeroTile, KpiTile } from '@/ui';
import { gapGrid } from '@/ui/tokens/spacing';
import { formatMoneyShort } from '@/lib/format/money';
import type { OrderPreset } from '@/features/orders/filters';
import type { DashboardSalesOut } from '../types';

export type KpiGridProps = {
  tiles: DashboardSalesOut['tiles'];
  onNavigate: (preset: OrderPreset) => void;
};

/**
 * The 2 x 2 board (`.gr2`), led by the one dark tile on the page — "Today's
 * orders" as a `HeroTile`, the other three as `KpiTile`s. Exactly one hero per
 * screen: it is what tells the eye where to start.
 */
export function KpiGrid({ tiles, onNavigate }: KpiGridProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.cell}>
        {/* The register has no exact filter for "today's orders" — the backend tile
            excludes cancelled orders, a distinction the register's own filters can't
            express yet — so this tile opens the closest useful view instead. */}
        <HeroTile
          testID="hero-tile"
          label="Today's orders"
          value={String(tiles.today_orders)}
          onPress={() => onNavigate('open')}
        />
      </View>
      <View style={styles.cell}>
        <KpiTile label="Open orders" value={String(tiles.open_orders)} onPress={() => onNavigate('open')} />
      </View>
      <View style={styles.cell}>
        <KpiTile label="Pending deliveries" value={String(tiles.pending_deliveries)} onPress={() => onNavigate('pendingDelivery')} />
      </View>
      <View style={styles.cell}>
        <KpiTile
          label="Payment pending"
          value={formatMoneyShort(tiles.payment_pending_amount)}
          hint={`${tiles.payment_pending_count} orders`}
          onPress={() => onNavigate('pendingPayment')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: gapGrid },
  // Two equal columns: `flexBasis` a hair under half so the gap has room, and
  // `flexGrow` so the pair fills the row exactly.
  cell: { flexBasis: '47%', flexGrow: 1 },
});
