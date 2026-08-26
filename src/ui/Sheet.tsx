import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetFooter,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Divider } from './Divider';
import { space } from './tokens/spacing';

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
  const modalRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);

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
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      footer ? (
        <BottomSheetFooter {...props}>
          <View style={[styles.footer, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
            {footer}
          </View>
        </BottomSheetFooter>
      ) : null,
    [footer, theme.colors.surface, theme.colors.border],
  );

  const header = title ? (
    <>
      <Text variant="h4">{title}</Text>
      <Divider style={styles.divider} />
    </>
  ) : null;

  const contentStyle = [styles.content, footer ? styles.contentWithFooter : null];

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      backdropComponent={renderBackdrop}
      footerComponent={footer ? renderFooter : undefined}
      onDismiss={onDismiss}
      onChange={onChange}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      {scroll ? (
        <BottomSheetScrollView contentContainerStyle={contentStyle}>
          {header}
          {children}
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={contentStyle}>
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
  content: { paddingHorizontal: space[4], paddingBottom: space[6] },
  // A footer pins itself over the sheet's own bottom padding, so content that
  // scrolls under it needs extra clearance instead of the plain padding above.
  contentWithFooter: { paddingBottom: space[12] },
  divider: { marginVertical: space[3] },
  footer: { paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[4], borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: space[3] },
});
