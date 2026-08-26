import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';

type ToastMessage = { id: number; message: string };

let nextId = 1;
const listeners = new Set<(message: ToastMessage) => void>();
const AUTO_HIDE_MS = 2500;

export const toast = {
  /** message should be short (<= 6 words) per the Ace DS copy rules. */
  show(message: string) {
    const payload: ToastMessage = { id: nextId++, message };
    listeners.forEach((cb) => cb(payload));
  },
};

export function ToastHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<ToastMessage | null>(null);

  useEffect(() => {
    function handle(message: ToastMessage) {
      setCurrent(message);
    }
    listeners.add(handle);
    return () => {
      listeners.delete(handle);
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  return (
    <View pointerEvents="none" style={[styles.container, { bottom: insets.bottom + space[6] }]}>
      <View style={[styles.toast, { backgroundColor: theme.colors.inverseBg, borderRadius: radius.control }]}>
        <Text color={theme.colors.inverseText} variant="bodySm">
          {current.message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: { paddingHorizontal: space[4], paddingVertical: space[3] },
});
