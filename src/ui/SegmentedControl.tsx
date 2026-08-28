import React, { useEffect, useState } from 'react';
import { Pressable, View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { controlRadius } from './tokens/radius';
import { CONTROL, hit } from './tokens/layout';
import { shadow } from './tokens/elevation';
import { easeStandard, motion } from './tokens/motion';

export type SegmentedControlOption = { value: string; label: string };

export type SegmentedControlProps = {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
};

/**
 * A sunken track with one jet segment sliding under the labels
 * (`redesign.css` §11 `.seg`). The thumb animates rather than jumping, which
 * is the whole reason it is a real control instead of a row of chips.
 */
export function SegmentedControl({ options, value, onChange }: SegmentedControlProps) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const offset = useSharedValue(0);
  const segmentWidth = trackWidth > 0 ? trackWidth / Math.max(1, options.length) : 0;

  useEffect(() => {
    offset.value = withTiming(index * segmentWidth, { duration: motion.base, easing: easeStandard });
  }, [index, segmentWidth, offset]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  function measure(e: LayoutChangeEvent) {
    setTrackWidth(e.nativeEvent.layout.width - space[1] * 2);
  }

  return (
    <View
      onLayout={measure}
      style={[
        styles.track,
        { backgroundColor: theme.colors.seg, borderRadius: controlRadius.segment },
        shadow('inset', theme.mode),
      ]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          testID="segmented-thumb"
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              width: segmentWidth,
              backgroundColor: theme.colors.jet,
              borderRadius: controlRadius.segmentThumb,
            },
            shadow('chipOn', theme.mode),
            thumbStyle,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            hitSlop={hit.segment}
            style={styles.segment}
          >
            <Text variant="chip" color={selected ? theme.colors.onJet : theme.colors.muted} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: space[1] },
  segment: { flex: 1, height: CONTROL.segment, alignItems: 'center', justifyContent: 'center' },
  thumb: { position: 'absolute', top: space[1], bottom: space[1], left: space[1] },
});
