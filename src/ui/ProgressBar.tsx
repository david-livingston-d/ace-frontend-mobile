import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';

export type ProgressBarProps = {
  steps: string[];
  current: number;
  failed?: boolean;
};

export function ProgressBar({ steps, current, failed }: ProgressBarProps) {
  const theme = useTheme();

  return (
    <View>
      <View style={styles.track}>
        {steps.map((step, index) => {
          const isDone = index <= current;
          const isFailedStep = !!failed && index === current;
          return (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  borderRadius: radius.control,
                  backgroundColor: isFailedStep
                    ? theme.colors.tone.danger.fg
                    : isDone
                      ? theme.colors.solidBg
                      : theme.colors.border,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.labels}>
        {steps.map((step, index) => (
          <Text
            key={index}
            variant="caption"
            color={index === current ? 'textStrong' : 'textSubtle'}
            style={styles.label}
          >
            {step}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: space[1] },
  segment: { flex: 1, height: 4 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space[1] },
  label: { flex: 1 },
});
