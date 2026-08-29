import React from 'react';
import { Pressable, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from './useTheme';
import { RadialSurface } from './Gradient';
import { cardPad, rowPadH, rowPadV, space } from './tokens/spacing';
import { radius } from './tokens/radius';
import { shadow } from './tokens/elevation';

export type CardVariant = 'flat' | 'raised' | 'hero' | 'note';

export type CardProps = ViewProps & {
  /** `flat` = the everyday lifted card, `raised` = one level higher (a
   * selected/actionable card), `hero` = the glossy jet tile with inverse text,
   * `note` = the small hint card (smaller radius, softer shadow). */
  variant?: CardVariant;
  padding?: keyof typeof space | 'card' | 'row';
  /**
   * @deprecated Accepted and ignored. Pre-M4 this chose between "flat" and
   * "has a shadow"; every card has a shadow now, and which one it wears is
   * `variant`'s job. Kept only so pre-M4 call sites keep compiling — pass
   * `variant` instead, and drop this the day the last one is gone.
   */
  depth?: 'flat' | 'soft';
  onPress?: () => void;
  children?: React.ReactNode;
};

function paddingStyle(padding: CardProps['padding']): StyleProp<ViewStyle> {
  if (padding === 'card') return { padding: cardPad };
  if (padding === 'row') return { paddingVertical: rowPadV, paddingHorizontal: rowPadH };
  return { padding: space[padding ?? 0] };
}

export function Card({ variant = 'flat', padding = 'card', depth: _depth, onPress, style, children, ...rest }: CardProps) {
  const theme = useTheme();
  const isHero = variant === 'hero';
  const corner = variant === 'note' ? radius.md : radius.lg;
  const shadowName = isHero ? 'hero' : variant === 'raised' ? 'raised' : variant === 'note' ? 'note' : 'card';

  const content = (
    <View
      style={[
        {
          backgroundColor: isHero ? theme.colors.heroStops[2] : theme.colors.card,
          borderRadius: corner,
        },
        paddingStyle(variant === 'note' ? 'row' : padding),
        shadow(shadowName, theme.mode),
        style,
      ]}
      {...rest}
    >
      {isHero ? <RadialSurface stops={theme.colors.heroStops} radius={corner} cx="18%" cy="0%" r="150%" /> : null}
      {children}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
}
