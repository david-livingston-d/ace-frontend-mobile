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
import { ScrollView, View } from 'react-native';

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

// The real component absolutely-positions its children `bottomInset` above the
// sheet's bottom edge — the prop that keeps a pinned Apply/Reset row clear of
// the gesture bar. There is no layout to reproduce under Jest, but the prop
// itself is worth asserting on (`Sheet.footer.test.tsx`), so it is forwarded
// onto a real host element rather than dropped on the floor.
export function BottomSheetFooter({
  children,
  bottomInset,
}: {
  children?: React.ReactNode;
  bottomInset?: number;
  [key: string]: unknown;
}) {
  return (
    <View testID="bottom-sheet-footer" bottomInset={bottomInset}>
      {children}
    </View>
  );
}

export function BottomSheetBackdrop() {
  return null;
}

// No `BottomSheetTextInput` mock export: `Input`'s `sheetInput` mode no
// longer imports it from this package at all (it renders RNGH's own
// `LegacyTextInput` directly — see `Input.tsx`'s comment on why the real
// `BottomSheetTextInput` was silently broken). A fake `BottomSheetTextInput =
// TextInput` export here previously hid that bug from every test, since
// nothing exercising a sheet-hosted field ever went through the real
// `Input` -> `BottomSheetTextInput` -> `react-native-gesture-handler`
// import chain that was actually broken on device.

export function BottomSheetModalProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}

// A minimal, observable stand-in for the real `useBottomSheetInternal` hook
// (`node_modules/@gorhom/bottom-sheet/src/contexts/internal.ts`), covering
// only the two members `SheetTextInput` reads: `animatedKeyboardState` (a
// reanimated-`SharedValue`-shaped `{get,set}` pair — the mock keeps this as
// plain mutable state rather than a real shared value, since nothing here
// runs on the UI thread) and `textInputNodesRef` (the `Set` of currently
// mounted sheet text-input node handles). Exported so a test can both drive
// it (simulate focus/blur through the field, same as a device) and read it
// directly to assert the keyboard-target bookkeeping SheetTextInput performs.
type MockKeyboardState = { target?: number };

function createMockKeyboardState() {
  let state: MockKeyboardState = { target: undefined };
  return {
    get: () => state,
    set: (updater: MockKeyboardState | ((prev: MockKeyboardState) => MockKeyboardState)) => {
      state = typeof updater === 'function' ? updater(state) : updater;
    },
  };
}

function makeBottomSheetInternalMock() {
  return {
    animatedKeyboardState: createMockKeyboardState(),
    textInputNodesRef: { current: new Set<number>() },
  };
}

export let __bottomSheetInternalMock = makeBottomSheetInternalMock();

/** Resets the shared mock state — call in a `beforeEach` so one test's
 * focus/blur bookkeeping never leaks into the next. */
export function __resetBottomSheetInternalMock() {
  __bottomSheetInternalMock = makeBottomSheetInternalMock();
}

export function useBottomSheetInternal() {
  return __bottomSheetInternalMock;
}
