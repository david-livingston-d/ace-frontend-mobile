import React, { useEffect, useState } from 'react';
import { Pressable, TextInput, View, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { typography } from './tokens/typography';
import { controlRadius } from './tokens/radius';
import { CONTROL, hit } from './tokens/layout';
import { shadow } from './tokens/elevation';

export type StepperProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  editable?: boolean;
};

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/**
 * The quantity control (`redesign.css` §11 `.stp`): a sunken 38 px pill with
 * an inset shadow, a minus and a plus at either end and the value in the
 * middle. It gains a jet ring once the value is non-zero, so a row that has
 * been touched reads as touched at a glance.
 */
export function Stepper({ value, min = -Infinity, max = Infinity, step = 1, onChange, label, editable = true }: StepperProps) {
  const theme = useTheme();
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const canDecrease = value > min;
  const canIncrease = value < max;

  function decrease() {
    if (!canDecrease) return;
    onChange(clamp(value - step, min, max));
  }

  function increase() {
    if (!canIncrease) return;
    onChange(clamp(value + step, min, max));
  }

  function handleBlur() {
    const parsed = Number(text);
    const next = clamp(Number.isFinite(parsed) ? parsed : value, min, max);
    onChange(next);
    setText(String(next));
  }

  const active = Number.isFinite(value) && value > 0;

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: theme.colors.sunken, height: CONTROL.stepper, borderRadius: controlRadius.stepper },
        shadow('inset', theme.mode, active ? { color: theme.colors.jet, width: 1.5 } : undefined),
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        accessibilityState={{ disabled: !canDecrease }}
        disabled={!canDecrease}
        onPress={decrease}
        hitSlop={hit.stepperButton}
        style={styles.button}
      >
        <Minus size={16} color={canDecrease ? theme.colors.text : theme.colors.disabledFg} />
      </Pressable>
      {editable ? (
        <TextInput
          accessibilityLabel={label}
          value={text}
          onChangeText={setText}
          onBlur={handleBlur}
          keyboardType="numeric"
          maxFontSizeMultiplier={1.3}
          style={[styles.value, typography.rowStrong, { color: theme.colors.text }]}
        />
      ) : (
        <Text variant="rowStrong" style={styles.value} accessibilityLabel={label}>{text}</Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        accessibilityState={{ disabled: !canIncrease }}
        disabled={!canIncrease}
        onPress={increase}
        hitSlop={hit.stepperButton}
        style={styles.button}
      >
        <Plus size={16} color={canIncrease ? theme.colors.text : theme.colors.disabledFg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  button: { width: CONTROL.stepperButton, height: '100%', alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 32, textAlign: 'center', padding: 0 },
});
