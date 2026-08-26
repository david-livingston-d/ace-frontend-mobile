import React, { useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { space } from './tokens/spacing';

export type SwipeToDeleteProps = {
  onDelete: () => void;
  children: React.ReactNode;
};

/** Wraps a row in a right-swipe "delete" action, styled off `tone.danger`. */
export function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps) {
  const theme = useTheme();
  const ref = useRef<SwipeableMethods>(null);

  function handleDelete() {
    ref.current?.close();
    onDelete();
  }

  return (
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete"
          onPress={handleDelete}
          style={[styles.action, { backgroundColor: theme.colors.tone.danger.bg }]}
        >
          <Trash2 size={20} color={theme.colors.tone.danger.fg} />
        </Pressable>
      )}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  action: { justifyContent: 'center', alignItems: 'center', width: 72, paddingHorizontal: space[3] },
});
