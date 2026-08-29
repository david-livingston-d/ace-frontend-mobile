import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from './Screen';
import { useTheme } from './useTheme';
import { useBottomClearance } from './useBottomClearance';
import { space } from './tokens/spacing';
import { shadow } from './tokens/elevation';

export type FormScreenProps = {
  title?: string;
  back?: () => void;
  right?: React.ReactNode;
  /** Pinned above the safe area — the form's submit row. Measured rather than
   * guessed at, so the last field always scrolls clear of it. */
  footer?: React.ReactNode;
  children?: React.ReactNode;
};

/**
 * How far the pinned footer has to rise to clear a keyboard of `height` —
 * different arithmetic per platform, because the two report different
 * rectangles.
 *
 * **Android**: the reported rect stops at the navigation bar, not at the
 * bottom of the screen. Measured on a Pixel_9 / Android 15 emulator (M4-T3):
 * with a 24dp gesture inset, `endCoordinates` came back as
 * `{ screenY: 631.24, height: 268.19 }` on a 923.43dp-tall screen, i.e. bottom
 * edge 899.43 = 923.43 - 24 exactly. So the keyboard's *top* sits
 * `height + insets.bottom` above the bottom of the screen, while the footer's
 * own bottom padding (`insets.bottom + space[3]`) is dead space that may sit
 * under it. Lifting by the *full* reported height therefore lands the submit
 * row exactly `space[3]` clear of the keyboard:
 *   gap = (lift + insetBottom + space[3]) - (height + insetBottom)
 *       = space[3]  when lift = height.
 * (Subtracting the inset there leaves the button clipped by that much — seen
 * on device before this was measured.)
 *
 * **iOS**: the rect does run to the bottom of the screen, so the keyboard's
 * top is `height` above it and the same `space[3]` gap comes out of
 * `height - insetBottom`. Clamped, because an undocked/floating keyboard can
 * report less than the inset.
 */
function keyboardLift(height: number, insetBottom: number): number {
  return Platform.OS === 'ios' ? Math.max(0, height - insetBottom) : height;
}

/**
 * A `Screen` whose body is a keyboard-aware scroll view: every form in the app
 * goes through this rather than each one rediscovering the same three rules.
 *
 * - `keyboardShouldPersistTaps="handled"` — tapping a second field while the
 *   first one's keyboard is open moves focus, instead of the tap being eaten
 *   by the dismiss.
 * - `automaticallyAdjustKeyboardInsets` (iOS-only): the scroll view pays for
 *   the keyboard out of its own content inset and scrolls the focused field
 *   above it. There is deliberately no `KeyboardAvoidingView` — it wraps the
 *   scroll view, so it could never move the pinned footer (an absolutely
 *   positioned *sibling*), and stacking its padding on top of that inset pays
 *   the keyboard twice. On Android neither exists: the manifest's
 *   `windowSoftInputMode` no longer resizes anything (below).
 * - **The pinned footer is lifted by hand, on both platforms**, because
 *   nothing else moves it: on iOS nothing outside the scroll view is
 *   keyboard-aware, and on Android the window is not resized for the IME at
 *   all under the edge-to-edge enforcement Android 15 applies to `targetSdk`
 *   35+ (measured on a Pixel_9 / Android 15 emulator, M4-T3 —
 *   `KeyboardAvoidingView behavior="padding"` does not compensate either).
 *   The keyboard events give the IME height; how much of it the footer has to
 *   climb differs per platform, because the two report different rectangles —
 *   see `keyboardLift`. iOS subscribes to `keyboardWillShow`/`WillHide`, so the
 *   footer travels *with* the keyboard's own animation rather than snapping
 *   after it; Android has no `will` events and lifts on `keyboardDidShow`. On
 *   Android the focused field is then pulled above the risen footer by hand
 *   too; on iOS the scroll view's own keyboard inset already does it.
 * - the submit row is pinned, and the scroll content reserves its *measured*
 *   height so the last field is reachable above it — see `clearance` for why
 *   the safe-area inset is subtracted back out there.
 */
export function FormScreen({ title, back, right, footer, children }: FormScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  // Read inside the keyboard listener, which is subscribed once — a ref keeps
  // that subscription off the measured height's re-render cycle.
  const footerHeightRef = useRef(0);
  const measureFooter = useCallback((e: LayoutChangeEvent) => {
    footerHeightRef.current = e.nativeEvent.layout.height;
    setFooterHeight(e.nativeEvent.layout.height);
  }, []);

  const scrollRef = useRef<ScrollView>(null);
  // Where the scroll view currently is, so the keyboard handler below can
  // scroll *relative* to it without measuring the whole content.
  const offsetRef = useRef(0);
  const trackOffset = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = e.nativeEvent.contentOffset.y;
  }, []);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  /**
   * Bring the focused field above the keyboard *and* the risen footer, given
   * how far the footer has climbed.
   *
   * Neither platform does this on its own: Android does not track the IME at
   * all here, and iOS's `automaticallyAdjustKeyboardInsets` scrolls the field
   * to the *keyboard's* top edge — which is behind the footer, since the
   * footer is pinned above it (seen on the iOS 26 simulator, M4-A: the Notes
   * field ended up under the "Save & select" row).
   *
   * Not `ScrollView.scrollResponderScrollNativeHandleToKeyboard`: it was tried
   * on device first and scrolls to the wrong place on any screen with a
   * header, because its arithmetic (`top - keyboardScreenY + height`,
   * ScrollView.js) mixes the input's *content-relative* offset with the
   * keyboard's *screen* coordinate. Measuring in window coordinates and
   * scrolling by the shortfall is both exact and independent of what sits
   * above the scroll view.
   */
  const scrollFocusedAboveFooter = useCallback((lift: number) => {
    const focused = TextInput.State.currentlyFocusedInput();
    focused?.measureInWindow((_x, y, _width, height) => {
      // Where the footer's top edge lands once it has risen: the lift, plus
      // the footer's own measured height.
      const footerTop = Dimensions.get('window').height - lift - footerHeightRef.current;
      const shortfall = y + height + space[4] - footerTop;
      if (shortfall > 0) {
        scrollRef.current?.scrollTo({ y: offsetRef.current + shortfall, animated: true });
      }
    });
  }, []);

  useEffect(() => {
    // Both platforms: the pinned footer is nobody else's job (see the
    // docblock). iOS listens to `keyboardWillShow` so the footer travels
    // *with* the keyboard's own animation, and corrects the scroll on
    // `keyboardDidShow` instead — by then the inset iOS adds itself, and the
    // scrolling it does with it, have settled, so the field is measured where
    // it actually ended up. Android only fires the `did` pair, and does both
    // there.
    const ios = Platform.OS === 'ios';
    const subs = [
      Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        if (!ios) scrollFocusedAboveFooter(keyboardLift(e.endCoordinates.height, insets.bottom));
      }),
      Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0)),
    ];
    if (ios) {
      subs.push(
        Keyboard.addListener('keyboardDidShow', (e) =>
          scrollFocusedAboveFooter(keyboardLift(e.endCoordinates.height, insets.bottom)),
        ),
      );
    }
    return () => subs.forEach((s) => s.remove());
  }, [insets.bottom, scrollFocusedAboveFooter]);

  const footerLift = keyboardLift(keyboardHeight, insets.bottom);

  // What the scroll content reserves so the last field clears the *top* edge
  // of the risen footer. `footerHeight` is measured and so already contains
  // the footer's own `insets.bottom + space[3]` of padding, while
  // `useBottomClearance` adds the inset again — hence subtracting it back out
  // once here rather than paying for it twice. The lift is added on Android
  // only: on iOS `automaticallyAdjustKeyboardInsets` has already reserved the
  // keyboard in the scroll view's own content inset.
  const keyboardClearance = Platform.OS === 'ios' ? 0 : footerLift;
  const clearance = useBottomClearance({
    extra: Math.max(0, footerHeight + keyboardClearance - insets.bottom),
  });

  return (
    <Screen title={title} back={back} right={right}>
      <ScrollView
        ref={scrollRef}
        testID="form-scroll"
        style={styles.flex}
        onScroll={trackOffset}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.content, { paddingBottom: clearance }]}
      >
        {children}
      </ScrollView>

      {footer ? (
        // Absolutely pinned (rather than a flex row below the scroll) so the
        // scroll view keeps the screen's full height and its own clearance is
        // what keeps the last field reachable. It pays the inset once —
        // `Screen`'s `edges` deliberately leave `bottom` out.
        <View
          testID="form-footer"
          onLayout={measureFooter}
          style={[
            styles.footer,
            shadow('overlay', theme.mode),
            {
              backgroundColor: theme.colors.page,
              paddingBottom: insets.bottom + space[3],
              marginBottom: footerLift,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // `flexGrow` so a short form can still centre itself (the login screen), and
  // no horizontal padding: `Screen`'s own body already applies the gutter.
  content: { flexGrow: 1, gap: space[3] },
  // Absolute children are positioned against the *border* box, so the footer
  // ignores `Screen`'s body gutter and has to re-apply it — its background is
  // then full-bleed (nothing slides out at the edges under it) while its
  // content still lines up with the fields above.
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: space[3], paddingHorizontal: space[4] },
});
