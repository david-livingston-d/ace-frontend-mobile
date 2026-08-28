import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type DimensionValue, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from './useTheme';
import { radius as radiusToken } from './tokens/radius';
import { easeStandard, shimmer } from './tokens/motion';

export type SkeletonProps = {
  width: DimensionValue;
  height: DimensionValue;
  radius?: number;
};

/**
 * A loading placeholder that *sweeps* rather than blinks (`.skl`): a soft
 * highlight band travelling across a sunken bar, drawn with `react-native-svg`
 * (RN has no gradients) and driven by one reanimated loop.
 */
export function Skeleton({ width, height, radius = radiusToken.sm }: SkeletonProps) {
  const theme = useTheme();
  const [boxWidth, setBoxWidth] = useState(0);
  const offset = useSharedValue(-shimmer.bandWidth);

  useEffect(() => {
    const travel = boxWidth > 0 ? boxWidth : shimmer.bandWidth;
    offset.value = -shimmer.bandWidth;
    offset.value = withRepeat(
      withTiming(travel, { duration: shimmer.duration, easing: easeStandard }),
      -1,
      false,
    );
  }, [boxWidth, offset]);

  const bandStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  function measure(e: LayoutChangeEvent) {
    setBoxWidth(e.nativeEvent.layout.width);
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={measure}
      style={[styles.box, { width, height, borderRadius: radius, backgroundColor: theme.colors.skeletonBase }]}
    >
      <Animated.View style={[styles.band, { width: shimmer.bandWidth }, bandStyle]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="gradShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={theme.colors.skeletonBase} />
              <Stop offset="50%" stopColor={theme.colors.skeletonHighlight} />
              <Stop offset="100%" stopColor={theme.colors.skeletonBase} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#gradShimmer)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0, left: 0 },
});
