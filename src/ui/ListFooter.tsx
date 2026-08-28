import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { space } from './tokens/spacing';

export type ListFooterProps = {
  /** `isFetchingNextPage` — the next page is on its way. */
  loading?: boolean;
};

/**
 * The "loading more" spinner every infinite list ends with. One component
 * rather than the five identical `ListFooterComponent={isFetchingNextPage ?
 * <ActivityIndicator style={styles.footerSpinner}/> : null}` blocks the M4
 * audit found.
 */
export function ListFooter({ loading }: ListFooterProps) {
  const theme = useTheme();
  if (!loading) return null;
  return <ActivityIndicator color={theme.colors.muted} style={styles.spinner} />;
}

const styles = StyleSheet.create({ spinner: { paddingVertical: space[4] } });
