import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from './useTheme';
import { Text } from './Text';
import { Divider } from './Divider';
import { space } from './tokens/spacing';

export type SheetHandle = { open: () => void; close: () => void };

export type SheetProps = {
  snapPoints: (string | number)[];
  title?: string;
  children?: React.ReactNode;
};

export const Sheet = forwardRef<SheetHandle, SheetProps>(function SheetImpl({ snapPoints, title, children }, ref) {
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

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <BottomSheetView style={styles.content}>
        {title ? (
          <>
            <Text variant="h4">{title}</Text>
            <Divider style={styles.divider} />
          </>
        ) : null}
        {children}
      </BottomSheetView>
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
  divider: { marginVertical: space[3] },
});
