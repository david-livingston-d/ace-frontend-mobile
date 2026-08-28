import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
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

/**
 * The red action, revealed by the drag itself.
 *
 * It is laid out *behind* the row's trailing edge, so at rest it is covered by
 * the card — but only to the pixel. Any rounding of the clip's corners, or a
 * sub-pixel difference between the card's edge and the wrapper's, leaves a
 * hairline of red showing along the top, right and bottom of a row nobody has
 * touched. Corner radii and a 1 px inset were tried and did not close it.
 *
 * So the action does not exist visually until the row moves: `progress` is 0
 * while closed and 1 while fully open, and the fill fades in over the first
 * few percent of the drag. At rest there is no red anywhere, at any radius, on
 * any density.
 */
function DeleteAction({ progress, onPress }: { progress: SharedValue<number>; onPress: () => void }) {
  const theme = useTheme();
  const reveal = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View style={[styles.action, reveal]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete"
        onPress={onPress}
        style={[styles.press, { backgroundColor: theme.colors.dangerSolid }]}
      >
        <Trash2 size={20} color={theme.colors.onDanger} />
      </Pressable>
    </Animated.View>
  );
}

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
        renderRightActions={(progress) => <DeleteAction progress={progress} onPress={handleDelete} />}
      >
        {children}
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  action: { width: 64 },
  press: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space[3] },
});
