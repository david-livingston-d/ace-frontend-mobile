import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  TextInput as RNTextInput,
  StyleSheet,
  findNodeHandle,
  type BlurEvent,
  type FocusEvent,
} from 'react-native';
import { LegacyTextInput } from 'react-native-gesture-handler';
import { useBottomSheetInternal } from '@gorhom/bottom-sheet';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from './useTheme';
import { FieldShell } from './FieldShell';
import { IconButton } from './IconButton';
import { typography } from './tokens/typography';
import type { InputProps } from './Input';

/**
 * The sheet-safe substitute for `@gorhom/bottom-sheet`'s own
 * `BottomSheetTextInput`. See `Input.tsx`'s comment for the full story: that
 * component imports `TextInput` from `react-native-gesture-handler`, which
 * RNGH 3.x no longer exports under that name (only `LegacyTextInput`) — so it
 * silently renders `undefined` and the field never focuses on a real device.
 *
 * Ported line-for-line from
 * `node_modules/@gorhom/bottom-sheet/src/components/bottomSheetTextInput/BottomSheetTextInput.tsx`
 * (the `useBottomSheetInternal` registration that lets the sheet track the
 * keyboard and rise to meet it) over RNGH's own `LegacyTextInput`, wrapped in
 * the same label/border/error chrome `Input` renders for its plain fields —
 * `Input`'s `sheetInput` path delegates to this component entirely rather
 * than only swapping which primitive renders the field, so a sheet-hosted
 * field looks identical to any other `Input` from the outside.
 */
export function SheetTextInput({
  label,
  value,
  onChangeText,
  error,
  helper,
  secureToggle,
  right,
  left,
  tall,
  secureTextEntry,
  onFocus,
  onBlur,
  sheetInput: _sheetInput,
  ...rest
}: InputProps) {
  const theme = useTheme();
  const [reveal, setReveal] = useState(false);
  const [focused, setFocused] = useState(false);
  // `RNTextInput`'s own instance type (a class component) — `LegacyTextInput`
  // is `createNativeWrapper<RNTextInputProps>(RNTextInput)`, typed as an
  // intersection with `RNTextInput`'s instance for exactly this: ref access
  // to the wrapped component. `findNodeHandle` only accepts a class-component
  // instance or a raw tag, which this is (unlike `React.ComponentRef<typeof
  // LegacyTextInput>`, which resolves through the wrapper's own function-
  // component surface rather than the wrapped instance).
  const ref = useRef<RNTextInput>(null);
  const { animatedKeyboardState, textInputNodesRef } = useBottomSheetInternal();

  const handleFocus = useCallback(
    (args: FocusEvent) => {
      // An object-literal `.set(...)` (rather than the `(prev) => next`
      // updater form) sidesteps a real TS gap: `SharedValue<T>.set`'s
      // parameter type is `T | ((value: T) => T)`, and a union of a plain
      // value type with a function type doesn't always contextually type an
      // arrow-function argument, leaving its parameter an implicit `any`.
      animatedKeyboardState.set({ ...animatedKeyboardState.get(), target: args.nativeEvent.target });
      setFocused(true);
      onFocus?.(args);
    },
    [onFocus, animatedKeyboardState],
  );

  const handleBlur = useCallback(
    (args: BlurEvent) => {
      try {
        const keyboardState = animatedKeyboardState.get();
        // `currentlyFocusedInput()` returns the New Architecture `HostInstance`
        // type, which `findNodeHandle`'s own (pre-Fabric) type declaration
        // doesn't list as an accepted input — another RN type-declaration gap
        // (see the `ref` cast above), not a real runtime mismatch: Fabric's
        // `findNodeHandle` accepts a host instance same as a class instance.
        const currentFocusedInput = findNodeHandle(
          RNTextInput.State.currentlyFocusedInput() as unknown as React.Component<unknown, unknown> | null,
        );
        // Only clear the keyboard target if it belonged to *this* field, and
        // only when the field that is newly focused isn't another field of
        // this same sheet (switching between two fields in one sheet must not
        // make the sheet think the keyboard just closed).
        const shouldRemoveCurrentTarget = keyboardState.target === args.nativeEvent.target;
        const shouldIgnoreBlurEvent =
          !!currentFocusedInput && textInputNodesRef.current.has(currentFocusedInput);
        if (shouldRemoveCurrentTarget && !shouldIgnoreBlurEvent) {
          animatedKeyboardState.set({ ...keyboardState, target: undefined });
        }
      } catch {
        // `TextInput.State` reaches into native focus bookkeeping that some
        // test environments don't implement — never let that break blur.
      }
      setFocused(false);
      onBlur?.(args);
    },
    [onBlur, animatedKeyboardState, textInputNodesRef],
  );

  useEffect(() => {
    // Read once, up front — `textInputNodesRef.current` is the same `Set`
    // instance for the sheet's whole lifetime, but the cleanup below has to
    // close over a plain variable rather than re-reading `.current` inside
    // it (eslint's `react-hooks/exhaustive-deps` is right to insist here:
    // re-reading would be wrong the moment that ever stopped being true).
    const nodes = textInputNodesRef.current;
    let node: number | null = null;
    try {
      node = findNodeHandle(ref.current);
    } catch {
      node = null;
    }
    if (!node) return;
    nodes.add(node);
    const registered = node;
    return () => {
      try {
        const keyboardState = animatedKeyboardState.get();
        if (keyboardState.target === registered) {
          animatedKeyboardState.set({ ...keyboardState, target: undefined });
        }
      } catch {
        // ignore — see above
      }
      nodes.delete(registered);
    };
  }, [textInputNodesRef, animatedKeyboardState]);

  return (
    <FieldShell
      label={label}
      error={error}
      helper={helper}
      focused={focused}
      tall={tall}
      left={left}
      right={
        secureToggle ? (
          <IconButton
            icon={reveal ? EyeOff : Eye}
            label={reveal ? 'Hide password' : 'Show password'}
            onPress={() => setReveal((r) => !r)}
            size="sm"
          />
        ) : (
          right
        )
      }
    >
      <LegacyTextInput
        // `createNativeWrapper` (what `LegacyTextInput` is built on) types its
        // own `ref` prop as `Ref<ComponentType<any> | null>` — a real gap in
        // RNGH's own types (see `node_modules/react-native-gesture-handler/src/handlers/createNativeWrapper.tsx`):
        // the ref it actually forwards is the wrapped native instance (an
        // `RNTextInput`, which is what every caller — including `findNodeHandle`
        // above — needs), never a component *constructor*.
        ref={ref as unknown as React.Ref<React.ComponentType<unknown> | null>}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={secureToggle ? !reveal : secureTextEntry}
        style={[styles.input, typography.bodySm, { color: theme.colors.text }]}
        placeholderTextColor={theme.colors.subtle}
        {...rest}
      />
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  input: { flex: 1, padding: 0 },
});
