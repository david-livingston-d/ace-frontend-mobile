import React, { useEffect, useState } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { IconButton } from './IconButton';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';

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

  return (
    <View style={styles.row}>
      <IconButton icon={Minus} label={`Decrease ${label}`} onPress={decrease} disabled={!canDecrease} size="sm" />
      <TextInput
        accessibilityLabel={label}
        value={text}
        onChangeText={setText}
        onBlur={handleBlur}
        editable={editable}
        keyboardType="numeric"
        style={[
          styles.input,
          { color: theme.colors.text, borderColor: theme.colors.border, borderRadius: radius.control },
        ]}
      />
      <IconButton icon={Plus} label={`Increase ${label}`} onPress={increase} disabled={!canIncrease} size="sm" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  input: { width: 48, textAlign: 'center', borderWidth: 1, paddingVertical: space[1] },
});
