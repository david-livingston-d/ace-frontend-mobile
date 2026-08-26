// Manual Jest mock for `@gorhom/bottom-sheet` (v5). Auto-applied to every test
// via Jest's node_modules mock convention (a file at `<rootDir>/__mocks__/<pkg>`
// needs no `jest.mock()` call in individual test files).
//
// The package's own bundled `mock.js` (see its README) always renders its
// `BottomSheetModal` children regardless of `present()`/`dismiss()`, and never
// calls `onDismiss` — fine for shallow smoke tests, but this codebase actually
// asserts on open/close behaviour (a status chip should disappear from the
// sheet after "Apply", a sheet's content shouldn't be findable before its
// trigger is pressed). This mock instead tracks presented/dismissed state for
// real: `BottomSheetModal` renders `children` only between a `present()` call
// and the next `dismiss()`/`close()`/`forceClose()`, and calls `onDismiss` (and
// `onChange`) the same way the real component would when it closes — so a
// swipe-to-dismiss (simulated by calling `dismiss()` on the ref) exercises the
// same `onDismiss` wiring a real device gesture would trigger.
import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

type RenderProp = ((props: Record<string, unknown>) => React.ReactNode) | undefined;

type BottomSheetModalProps = {
  children?: React.ReactNode;
  onDismiss?: () => void;
  onChange?: (index: number) => void;
  footerComponent?: RenderProp;
  backdropComponent?: RenderProp;
  [key: string]: unknown;
};

export type BottomSheetModalRef = {
  present: (data?: unknown) => void;
  dismiss: () => void;
  close: () => void;
  forceClose: () => void;
  snapToIndex: (index: number) => void;
  snapToPosition: (position: number | string) => void;
  expand: () => void;
  collapse: () => void;
};

export const BottomSheetModal = forwardRef<BottomSheetModalRef, BottomSheetModalProps>(
  function BottomSheetModalImpl({ children, onDismiss, onChange, footerComponent }, ref) {
    const [presented, setPresented] = useState(false);

    const hide = useCallback(() => {
      setPresented((wasPresented) => {
        if (wasPresented) {
          onChange?.(-1);
          onDismiss?.();
        }
        return false;
      });
    }, [onChange, onDismiss]);

    useImperativeHandle(
      ref,
      () => ({
        present: () => {
          setPresented(true);
          onChange?.(0);
        },
        dismiss: hide,
        close: hide,
        forceClose: hide,
        snapToIndex: () => {},
        snapToPosition: () => {},
        expand: () => {},
        collapse: () => {},
      }),
      [hide, onChange],
    );

    if (!presented) return null;

    return (
      <View>
        {children}
        {footerComponent ? footerComponent({}) : null}
      </View>
    );
  },
);

export function BottomSheetView({ children, ...rest }: { children?: React.ReactNode; [key: string]: unknown }) {
  return <View {...rest}>{children}</View>;
}

export const BottomSheetScrollView = ScrollView;

export function BottomSheetFooter({ children }: { children?: React.ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}

export function BottomSheetBackdrop() {
  return null;
}

// The real component swaps in gesture-handler-aware focus plumbing so a
// field inside a sheet actually receives touches on device (see `Input`'s
// `sheetInput` prop) — under Jest, gesture-handler's real machinery never
// runs anyway, so a plain `TextInput` behaves identically for `fireEvent`.
export const BottomSheetTextInput = TextInput;

export function BottomSheetModalProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
