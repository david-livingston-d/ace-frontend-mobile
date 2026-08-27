// `__mocks__/@gorhom/bottom-sheet.tsx` is Jest's manual mock for the real
// `@gorhom/bottom-sheet` package — automatically substituted for every test
// (no `jest.mock()` call needed), but `tsc` always type-checks an import of
// `'@gorhom/bottom-sheet'` against the *real* package's own declarations, not
// the mock. The mock's two test-only exports (`__bottomSheetInternalMock`,
// `__resetBottomSheetInternalMock` — used by `SheetTextInput.test.tsx` to
// observe/reset the keyboard-target bookkeeping a real device would drive
// through actual focus/blur events) therefore need to be declared here too,
// purely so those test files typecheck. This only *adds* exports — it can
// never mask a real typing mistake against the package's genuine API.
//
// The otherwise-unused import below is what makes this file an ES module
// rather than a global script — without it, `declare module` here would be a
// *shorthand ambient* declaration that replaces the real package's own types
// everywhere (breaking every other file that imports the genuine exports)
// instead of augmenting them.
import type {} from '@gorhom/bottom-sheet';

declare module '@gorhom/bottom-sheet' {
  export const __bottomSheetInternalMock: {
    animatedKeyboardState: {
      get: () => { target?: number };
      set: (updater: { target?: number } | ((prev: { target?: number }) => { target?: number })) => void;
    };
    textInputNodesRef: { current: Set<number> };
  };
  export function __resetBottomSheetInternalMock(): void;
}
