import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetFooter,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Divider } from './Divider';
import { gutter, space } from './tokens/spacing';
import { radius } from './tokens/radius';
import { CONTROL } from './tokens/layout';
import { shadow } from './tokens/elevation';

export type SheetHandle = { open: () => void; close: () => void };

export type SheetProps = {
  /** Omit for `enableDynamicSizing` — the sheet grows to fit its content
   * instead of snapping to fixed heights. */
  snapPoints?: (string | number)[];
  title?: string;
  /** Renders children inside a `BottomSheetScrollView` instead of a plain
   * `BottomSheetView`, for content taller than one screen (M2's `Select`/`FilterSheet`). */
  scroll?: boolean;
  /** Pinned above the safe area via `BottomSheetFooter` (e.g. a sheet's apply/reset row). */
  footer?: React.ReactNode;
  onDismiss?: () => void;
  onChange?: (index: number) => void;
  children?: React.ReactNode;
};

export const Sheet = forwardRef<SheetHandle, SheetProps>(function SheetImpl(
  { snapPoints, title, scroll, footer, onDismiss, onChange, children },
  ref,
) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
  // Measured rather than guessed: the footer is a button row whose height
  // depends on the button size, the font scale and how many buttons the caller
  // put in it. A fixed reservation (this was `space[12]`, 48) is always wrong
  // for something — here it was ~28px short of the real ~76px row, so the last
  // section of the orders and payments filter sheets scrolled under Apply/Reset
  // with no way to bring it back out.
  const [footerHeight, setFooterHeight] = useState(0);
  const measureFooter = useCallback((e: LayoutChangeEvent) => {
    setFooterHeight(e.nativeEvent.layout.height);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      open: () => modalRef.current?.present(),
      close: () => modalRef.current?.dismiss(),
    }),
    [],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} />
    ),
    [],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      footer ? (
        // `bottomInset` is what lifts the pinned row clear of the gesture bar
        // / home indicator instead of letting it sit underneath. The inset is
        // paid here and **only** here: padding the row by it as well left ~80px
        // of dead space under Apply/Reset on a gesture-nav phone.
        <BottomSheetFooter {...props} bottomInset={insets.bottom}>
          <View
            testID="sheet-footer"
            onLayout={measureFooter}
            style={[
              styles.footer,
              { backgroundColor: theme.colors.sheet, borderTopColor: theme.colors.hairline },
              shadow('overlay', theme.mode),
            ]}
          >
            {footer}
          </View>
        </BottomSheetFooter>
      ) : null,
    [footer, insets.bottom, measureFooter, theme.colors.sheet, theme.colors.hairline, theme.mode],
  );

  const header = title ? (
    <>
      <Text variant="cardTitle">{title}</Text>
      <Divider style={styles.divider} />
    </>
  ) : null;

  // Clearance for a pinned footer: its measured height, the inset it floats
  // above, and one gutter so the last row isn't flush against it.
  const contentStyle = [
    styles.content,
    footer ? { paddingBottom: footerHeight + insets.bottom + space[4] } : null,
  ];

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      // The library's own default (`adjustPan`) disagrees with this app's
      // manifest (`windowSoftInputMode="adjustResize"`, needed elsewhere).
      // NOTE: an earlier round mis-diagnosed this mismatch as the cause of
      // `ReasonSheet`'s reason field never taking focus on device — it
      // wasn't. The real cause was `Input`'s `sheetInput` mode importing
      // `@gorhom/bottom-sheet`'s `BottomSheetTextInput`, which itself
      // imports `TextInput` from `react-native-gesture-handler`; RNGH 3.x
      // only exports that component as `LegacyTextInput`, so the field was
      // silently rendering `undefined` (see `Input.tsx`). Matching
      // `android_keyboardInputMode` to the manifest here is still correct on
      // its own merits (keeps this sheet's keyboard behaviour consistent
      // with the rest of the app), just not what fixed the typing bug.
      android_keyboardInputMode="adjustResize"
      backdropComponent={renderBackdrop}
      footerComponent={footer ? renderFooter : undefined}
      onDismiss={onDismiss}
      onChange={onChange}
      backgroundStyle={{
        backgroundColor: theme.colors.sheet,
        borderTopLeftRadius: radius.sheet,
        borderTopRightRadius: radius.sheet,
      }}
      style={shadow('overlay', theme.mode)}
      handleIndicatorStyle={{
        backgroundColor: theme.colors.grab,
        width: CONTROL.grabWidth,
        height: CONTROL.grabHeight,
        borderRadius: radius.xs,
      }}
    >
      {scroll ? (
        <BottomSheetScrollView testID="sheet-content" contentContainerStyle={contentStyle}>
          {header}
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView testID="sheet-content" style={contentStyle}>
          {header}
          {children}
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
});

/** Creates a ref + open/close callbacks for a <Sheet ref={...}>, so callers don't
 * need to manage the imperative ref boilerplate themselves. */
export function useSheet() {
  const ref = useRef<SheetHandle>(null);
  const open = useCallback(() => ref.current?.open(), []);
  const close = useCallback(() => ref.current?.close(), []);
  return { ref, open, close };
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: gutter, paddingBottom: space[6] },
  divider: { marginVertical: space[3] },
  // `paddingBottom` is a plain gutter, spelled out rather than folded into a
  // `paddingVertical`: the safe-area inset is carried by `BottomSheetFooter`'s
  // own `bottomInset` and must not be repeated here.
  footer: { paddingHorizontal: gutter, paddingTop: space[3], paddingBottom: space[3], borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: space[3] },
});
