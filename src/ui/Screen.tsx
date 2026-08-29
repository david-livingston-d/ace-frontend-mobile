import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { gutter, space } from './tokens/spacing';

export type ScreenProps = {
  title?: string;
  back?: () => void;
  /** A single header-right slot (e.g. order detail's PDF `IconButton`) — the
   * title takes `flex: 1` so this stays pinned to the trailing edge. */
  right?: React.ReactNode;
  children?: React.ReactNode;
  /** A bottom-anchored row outside the scrollable body — an order's action
   * bar, a form's submit row. It is full-bleed (so its top border spans the
   * screen) and pays the bottom safe-area inset itself, which is why `edges`
   * still leaves `bottom` out. */
  footer?: React.ReactNode;
  /** Sides to reserve safe-area inset for. Bottom is excluded by default since
   * most screens sit above a tab bar or other bottom-anchored control that
   * already accounts for its own inset — pass it explicitly where a screen
   * has no such control below it. */
  edges?: readonly Edge[];
};

export function Screen({ title, back, right, children, footer, edges = ['top', 'left', 'right'] }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={edges} style={[styles.container, { backgroundColor: theme.colors.page }]}>
      {title || back || right ? (
        <View style={styles.header}>
          {back ? <IconButton icon={ChevronLeft} label="Back" onPress={back} variant="circle" /> : null}
          {title ? (
            <Text variant="screenTitle" style={styles.title} numberOfLines={1}>{title}</Text>
          ) : null}
          {right}
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
      {footer ? (
        <View testID="screen-footer" style={{ paddingBottom: insets.bottom }}>
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // The gutter is the app's one left edge: a screen title and the content
  // under it always start at the same x, with or without a back button.
  header: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: gutter, paddingVertical: space[3] },
  title: { flex: 1 },
  body: { flex: 1, paddingHorizontal: gutter },
});
