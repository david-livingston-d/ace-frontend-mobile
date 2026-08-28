import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';
import { easeStandard, pulseRing } from './tokens/motion';

export type ProgressBarProps = {
  steps: string[];
  current: number;
  failed?: boolean;
};

/** The current step's halo, breathing (`@keyframes pls`). */
function PulseDot({ color }: { color: string }) {
  const theme = useTheme();
  const spread = useSharedValue(1);

  useEffect(() => {
    spread.value = withRepeat(withTiming(1.9, { duration: pulseRing.duration, easing: easeStandard }), -1, true);
  }, [spread]);

  const halo = useAnimatedStyle(() => ({
    transform: [{ scale: spread.value }],
    opacity: 2 - spread.value,
  }));

  return (
    <View style={styles.currentWrap}>
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { backgroundColor: theme.colors.dim, borderRadius: radius.pill }, halo]}
      />
      <View style={[styles.dotCurrent, { backgroundColor: color, borderRadius: radius.pill }]} />
    </View>
  );
}

/**
 * Phase dots (`.pp`): a 9 px dot per step joined by 2 px connectors, the
 * current one larger and pulsing, the future ones dimmed. A document's
 * progress is a sequence of states, so it is drawn as one — never as a
 * percentage bar, which would imply a fraction nobody computed.
 */
export function ProgressBar({ steps, current, failed }: ProgressBarProps) {
  const theme = useTheme();

  return (
    <View>
      <View style={styles.track}>
        {steps.map((step, index) => {
          const done = index <= current;
          const isCurrent = index === current;
          const color = failed && isCurrent ? theme.colors.tone.danger.fg : done ? theme.colors.jet : theme.colors.dim;
          return (
            <React.Fragment key={step}>
              {index > 0 ? (
                <View style={[styles.line, { backgroundColor: done ? theme.colors.jet : theme.colors.dim }]} />
              ) : null}
              {isCurrent ? (
                <PulseDot color={color} />
              ) : (
                <View style={[styles.dot, { backgroundColor: color, borderRadius: radius.pill }]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
      <View style={styles.labels}>
        {steps.map((step, index) => (
          <Text
            key={step}
            variant="caption"
            color={index === current ? 'text' : 'subtle'}
            style={styles.label}
            numberOfLines={1}
          >
            {step}
          </Text>
        ))}
      </View>
    </View>
  );
}

const DOT = 9;
const DOT_CURRENT = 13;

const styles = StyleSheet.create({
  track: { flexDirection: 'row', alignItems: 'center', paddingVertical: space[1] },
  dot: { width: DOT, height: DOT },
  currentWrap: { width: DOT_CURRENT, height: DOT_CURRENT, alignItems: 'center', justifyContent: 'center' },
  dotCurrent: { width: DOT_CURRENT, height: DOT_CURRENT },
  halo: { position: 'absolute', width: DOT_CURRENT, height: DOT_CURRENT, opacity: 0.4 },
  line: { flex: 1, height: 2 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] },
  label: { flex: 1 },
});
