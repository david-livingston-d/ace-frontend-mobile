import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
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
 * A `Screen` whose body is a keyboard-aware scroll view: every form in the app
 * goes through this rather than each one rediscovering the same three rules.
 *
 * - `keyboardShouldPersistTaps="handled"` — tapping a second field while the
 *   first one's keyboard is open moves focus, instead of the tap being eaten
 *   by the dismiss.
 * - `automaticallyAdjustKeyboardInsets` + `KeyboardAvoidingView`
 *   `behavior="padding"`, both iOS-only: on Android the manifest's
 *   `windowSoftInputMode="adjustResize"` is what resizes the window, and
 *   layering padding on top of that double-counts the keyboard.
 * - Android carries the keyboard itself, because it has to: under the
 *   edge-to-edge enforcement Android 15 applies to `targetSdk` 35+ the window
 *   is no longer resized for the IME (measured on a Pixel_9 / Android 15
 *   emulator, M4-T3 — `KeyboardAvoidingView behavior="padding"` does not
 *   compensate either), so the pinned footer would simply sit behind the
 *   keyboard. `keyboardDidShow`/`keyboardDidHide` give the IME height; the
 *   footer is lifted by it (less the inset it already pays) and the scroll
 *   content reserves it on top of the footer, so the last field can still be
 *   scrolled above both. The focused field is then pulled into view through
 *   the scroll responder.
 * - the submit row is pinned, and the scroll content reserves its *measured*
 *   height plus the safe-area inset, so the last field is reachable above it.
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
  useEffect(() => {
    // iOS pays for the keyboard through `KeyboardAvoidingView` +
    // `automaticallyAdjustKeyboardInsets`; doing it again here would push the
    // form up twice.
    if (Platform.OS !== 'android') return;
    const shown = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);

      // Bring the focused field above the keyboard *and* the pinned footer.
      //
      // Not `ScrollView.scrollResponderScrollNativeHandleToKeyboard`: it was
      // tried on device first and scrolls to the wrong place on any screen
      // with a header, because its arithmetic
      // (`top - keyboardScreenY + height`, ScrollView.js) mixes the input's
      // *content-relative* offset with the keyboard's *screen* coordinate.
      // Measuring in window coordinates and scrolling by the shortfall is both
      // exact and independent of what sits above the scroll view.
      const focused = TextInput.State.currentlyFocusedInput();
      focused?.measureInWindow((_x, y, _width, height) => {
        // Where the footer's top edge lands once it has risen (see
        // `footerLift`): the keyboard, plus the footer's own height.
        const footerTop =
          Dimensions.get('window').height - e.endCoordinates.height - footerHeightRef.current;
        const shortfall = y + height + space[4] - footerTop;
        if (shortfall > 0) {
          scrollRef.current?.scrollTo({ y: offsetRef.current + shortfall, animated: true });
        }
      });
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  // How far the footer has to rise to clear the keyboard.
  //
  // Measured on a Pixel_9 / Android 15 emulator (M4-T3): the rect Android
  // reports stops at the navigation bar rather than at the bottom of the
  // screen — with a 24dp gesture inset, `endCoordinates` came back as
  // `{ screenY: 631.24, height: 268.19 }` on a 923.43dp-tall screen, i.e.
  // bottom edge 899.43 = 923.43 - 24 exactly. So the keyboard's *top* sits
  // `height + insets.bottom` above the bottom of the screen, while the
  // footer's own bottom padding (`insets.bottom + space[3]`) is dead space
  // that may sit under it. Lifting by the reported height therefore lands the
  // submit row exactly `space[3]` clear of the keyboard, whatever the inset:
  //   gap = (lift + insets.bottom + space[3]) - (height + insets.bottom)
  //       = space[3]  when lift = height.
  // (Subtracting the inset instead — the intuitive reading, if the rect ran to
  // the bottom of the screen — leaves the button clipped by that much; seen on
  // device before this was measured.)
  const footerLift = Math.max(0, keyboardHeight);
  const clearance = useBottomClearance({ extra: footerHeight + keyboardHeight });

  return (
    <Screen title={title} back={back} right={right}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          testID="form-scroll"
          onScroll={trackOffset}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.content, { paddingBottom: clearance }]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>

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
            {
              backgroundColor: theme.colors.bg,
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
