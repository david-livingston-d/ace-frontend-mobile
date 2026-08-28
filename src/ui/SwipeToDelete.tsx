import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Swipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Trash2 } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { space } from './tokens/spacing';
import { radius } from './tokens/radius';
import { shadow } from './tokens/elevation';

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

  // The whole row is clipped to the card radius so the red action never shows
  // a square corner behind a rounded card. The clip would also swallow the
  // child card's own `boxShadow` (RN clips shadows inside an `overflow:
  // 'hidden'` parent), so the *wrapper* carries the lift instead.
  return (
    <View style={[styles.clip, { borderRadius: radius.lg }, shadow('card', theme.mode)]}>
    <Swipeable
      ref={ref}
      friction={2}
      rightThreshold={40}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete"
          onPress={handleDelete}
          // The action sits *behind* the row's trailing edge, so it has to wear
          // the same corner radius: without it the solid red shows through the
          // card's rounded corners while the row is at rest.
          style={[
            styles.action,
            {
              backgroundColor: theme.colors.dangerSolid,
              borderTopRightRadius: radius.lg,
              borderBottomRightRadius: radius.lg,
            },
          ]}
        >
          <Trash2 size={20} color={theme.colors.onDanger} />
        </Pressable>
      )}
    >
      {children}
    </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  // `marginVertical: 1` keeps the red strictly *inside* the row it belongs to:
  // the action stretches to the row height and would otherwise leave a
  // hairline of colour above and below the card it sits behind.
  action: { justifyContent: 'center', alignItems: 'center', width: 64, marginVertical: 1, paddingHorizontal: space[3] },
});
