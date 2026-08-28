import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';
import { hit } from './tokens/layout';
import { combine, shadow, toneShadow } from './tokens/elevation';
import type { StatusTone } from './tokens/colors';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Tints the label and the chip's drop shadow (an overdue chip glows faintly
   * red) — the chip surface itself stays card white. */
  tone?: StatusTone;
  size?: 'sm' | 'md';
  /** A bold count rendered before the label (`3 Overdue`) — the home due strip
   * (canvas edit #3). */
  count?: string | number;
  /** Stretches the chip to share a row equally with its siblings. */
  flex?: boolean;
};

/**
 * A pill that sits *on* the page rather than in it: card surface, a hairline
 * ring and a soft drop shadow; selected inverts to jet with a deeper shadow
 * (`redesign.css` §12 `.chip`).
 */
export function Chip({ label, selected, onPress, tone, size = 'md', count, flex }: ChipProps) {
  const theme = useTheme();
  const toneColors = tone ? theme.colors.tone[tone] : null;
  const fg = selected ? theme.colors.onJet : toneColors ? toneColors.fg : theme.colors.tone.neutral.fg;

  // A toned chip keeps its hairline ring but swaps the neutral drop shadow for
  // its own tint (an overdue chip glows faintly red). Both are one `boxShadow`
  // string, so the tint is composed in rather than layered on.
  const ring = { color: theme.colors.ringSoft };
  const depth = selected
    ? shadow('chipOn', theme.mode)
    : shadow('chip', theme.mode, ring);
  const toned =
    tone && !selected && depth.boxShadow
      ? { boxShadow: combine(toneShadow(tone, theme.mode), depth.boxShadow) }
      : null;

  const body = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.jet : theme.colors.card,
          paddingVertical: size === 'sm' ? space[2] - 1 : space[2] + 1,
          paddingHorizontal: size === 'sm' ? space[3] : space[4] - 1,
        },
        flex ? styles.flexChip : styles.hugChip,
        depth,
        toned,
      ]}
    >
      {count !== undefined ? <Text variant="rowStrong" color={fg}>{String(count)}</Text> : null}
      <Text variant="chip" color={fg}>{label}</Text>
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      hitSlop={size === 'sm' ? hit.chipSm : hit.chip}
      style={flex ? styles.flexPress : undefined}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2] - 2,
    borderRadius: radius.pill,
  },
  flexPress: { flex: 1 },
  flexChip: { flex: 1 },
  hugChip: { alignSelf: 'flex-start' },
});
