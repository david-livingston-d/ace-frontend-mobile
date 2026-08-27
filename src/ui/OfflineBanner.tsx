import React, { useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';

/**
 * Whether the device currently has a connection, read straight off TanStack's
 * `onlineManager` — which `src/lib/query/client.ts` already wires to NetInfo,
 * so this is the same signal that decides whether a query may fetch. Subscribed
 * through `useSyncExternalStore` rather than a `useState` + `useEffect` pair so
 * a render never reads a value the store has already moved past.
 */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => onlineManager.subscribe(onStoreChange),
    () => onlineManager.isOnline(),
    () => true,
  );
}

export type OfflineBannerProps = {
  /** A query's `dataUpdatedAt` (ms epoch). When given — and non-zero — the
   * banner says *when* the rows on screen were last true, which is the
   * difference between "this might be stale" and "this is from 09:14". */
  dataUpdatedAt?: number;
};

/**
 * Rendered above a register (or a write screen's form) while the device is
 * offline. Reads keep their default `networkMode: 'online'`, so what is on
 * screen is whatever the cache last held — correct behaviour for a rep in a
 * basement, but only if the app says so out loud instead of passing stale rows
 * off as live ones. Renders nothing at all while online.
 */
export function OfflineBanner({ dataUpdatedAt }: OfflineBannerProps) {
  const theme = useTheme();
  const online = useIsOnline();
  if (online) return null;

  const pair = theme.colors.tone.warning;
  const at = dataUpdatedAt ? ` from ${formatClock(dataUpdatedAt)}` : '';

  return (
    <View
      testID="offline-banner"
      style={[styles.container, { backgroundColor: pair.bg, borderRadius: radius.control }]}
    >
      <Text variant="bodySm" color={pair.fg}>{`Offline — showing saved data${at}`}</Text>
    </View>
  );
}

/** `HH:MM` in the device's own local time — the rep reads it against the clock
 * on their own phone, not against IST. Hermes ships without ICU, so this is
 * done by hand rather than through `toLocaleTimeString`. */
function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: space[3], paddingVertical: space[2], marginBottom: space[2] },
});
