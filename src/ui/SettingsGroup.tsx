import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Card } from './Card';
import { space } from './tokens/spacing';

export type SettingsRowProps = {
  /** A 16 px leading glyph (`.srow`'s icon in the `more` frame). */
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  /** A switch, a value, a segmented control. */
  right?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  /** Log out, delete — the title takes the danger tone. */
  destructive?: boolean;
};

/** One line of a `SettingsGroup`. Rendered inside the group's card, separated
 * from its neighbour by a hairline rather than by a gap. */
export function SettingsRow({ icon: Icon, title, subtitle, right, onPress, chevron, destructive }: SettingsRowProps) {
  const theme = useTheme();
  const content = (
    <View style={styles.row}>
      {Icon ? <Icon size={16} color={theme.colors.muted} /> : null}
      <View style={styles.text}>
        <Text variant="bodySm" color={destructive ? theme.colors.tone.danger.fg : undefined}>{title}</Text>
        {subtitle ? <Text variant="caption" color="muted">{subtitle}</Text> : null}
      </View>
      {right}
      {chevron ? <ChevronRight size={18} color={theme.colors.subtle} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      {content}
    </Pressable>
  );
}

export type SettingsGroupProps = {
  /** An optional uppercase caption above the card. */
  title?: string;
  children: React.ReactNode;
};

/**
 * A card of settings rows (`.sgrp`): one surface, hairline-separated lines,
 * no padding of its own — which is what makes More read as a settings screen
 * rather than a stack of buttons.
 */
export function SettingsGroup({ title, children }: SettingsGroupProps) {
  const theme = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? <Text variant="label" color="muted">{title}</Text> : null}
      <Card padding={0}>
        {rows.map((row, index) => (
          <View
            key={index}
            style={index > 0 ? [styles.divided, { borderTopColor: theme.colors.hairline }] : undefined}
          >
            {row}
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], paddingVertical: space[3], minHeight: 48 },
  text: { flex: 1, gap: space[1] - 3 },
  divided: { borderTopWidth: StyleSheet.hairlineWidth },
});
