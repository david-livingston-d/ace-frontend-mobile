import React, { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from './useTheme';
import { n } from './tokens/colors';
import { radius as radiusToken } from './tokens/radius';

export type SkeletonProps = {
  width: DimensionValue;
  height: DimensionValue;
  radius?: number;
};

export function Skeleton({ width, height, radius = radiusToken.control }: SkeletonProps) {
  const theme = useTheme();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const base = theme.mode === 'dark' ? n[800] : n[200];

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: radius, backgroundColor: base }, animatedStyle]}
    />
  );
}
