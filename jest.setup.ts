// react-native-gesture-handler's own officially documented jest setup (mocks its native
// module + a few components) — needed once anything renders GestureHandlerRootView or,
// transitively, @gorhom/bottom-sheet (first exercised here by Task 4's `<Providers>` render).
import 'react-native-gesture-handler/jestSetup';
// react-native-safe-area-context's own officially documented jest mock — without it
// SafeAreaProvider renders no children under Jest (no native layout event ever arrives).
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

jest.mock('react-native-config', () => ({ API_URL: 'http://localhost:8000', POSTHOG_API_KEY: '', POSTHOG_HOST: '', ENV: 'test' }));
jest.mock('react-native-keychain', () => {
  let stored: { username: string; password: string } | null = null;
  return {
    setGenericPassword: jest.fn(async (u: string, p: string) => { stored = { username: u, password: p }; return true; }),
    getGenericPassword: jest.fn(async () => stored ?? false),
    resetGenericPassword: jest.fn(async () => { stored = null; return true; }),
    ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'x' },
    SECURITY_LEVEL: { SECURE_HARDWARE: 'h', ANY: 'a' },
  };
});
jest.mock('react-native-mmkv', () => {
  // react-native-mmkv v4's real API is `createMMKV({ id })` returning an object with
  // `getString`/`set`/`remove` (not `new MMKV()`/`delete` as in older versions) — see
  // node_modules/react-native-mmkv/lib/specs/MMKV.nitro.d.ts. Keep one in-memory store
  // per instance id so callers using different ids don't collide.
  const stores = new Map<string, Map<string, string>>();
  return {
    createMMKV: jest.fn(({ id }: { id: string } = { id: 'mmkv.default' }) => {
      if (!stores.has(id)) stores.set(id, new Map<string, string>());
      const store = stores.get(id)!;
      return {
        getString: (k: string) => store.get(k),
        set: (k: string, v: string) => store.set(k, v),
        remove: (k: string) => store.delete(k),
        contains: (k: string) => store.has(k),
        clearAll: () => store.clear(),
      };
    }),
  };
});
// react-native-reanimated v4 is worklets-based (react-native-worklets is now a
// separate peer dep) — its own docs (docs.swmansion.com/react-native-worklets/docs/
// guides/testing) recommend mocking it with its bundled TS mock.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
// react-native-reanimated's officially documented jest setup: use the mock module so
// components built on it (e.g. the Skeleton shimmer, @gorhom/bottom-sheet's Sheet) render
// without touching native code. Reanimated already detects Jest (`IS_JEST`) and swaps in
// its own `JSReanimated` fallback for exactly this — but that fallback's
// `setCSSEventHandler` unconditionally throws ("not available in JSReanimated") where
// every other unsupported JSReanimated method silently no-ops, and `initializeReanimatedModule`
// calls it unconditionally at import time (unlike its neighbouring, feature-flag-gated call).
// That's a real gap in reanimated 4.6.0, not a resolution issue on our end — every
// alternative (repointing to the real module, react-native-worklets' own resolver-based
// "web implementation" escape hatch) hits the same unconditional call. Patch just that one
// method to a no-op before anything imports reanimated for real.
jest.mock('react-native-reanimated/src/ReanimatedModule/js-reanimated/JSReanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/src/ReanimatedModule/js-reanimated/JSReanimated');
  return {
    ...actual,
    createJSReanimatedModule: () => {
      const instance = actual.createJSReanimatedModule();
      instance.setCSSEventHandler = () => {};
      return instance;
    },
  };
});
jest.mock('react-native-reanimated/lib/module/ReanimatedModule/js-reanimated/JSReanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/lib/module/ReanimatedModule/js-reanimated/JSReanimated');
  return {
    ...actual,
    createJSReanimatedModule: () => {
      const instance = actual.createJSReanimatedModule();
      instance.setCSSEventHandler = () => {};
      return instance;
    },
  };
});
// `react-native-reanimated/mock`'s own `makeMutable` is just the identity function
// (`ID`) — fine for callers who never touch the value again, but @gorhom/bottom-sheet
// v5's `useAnimatedLayout` calls `makeMutable(initialLayoutState)` directly (bypassing
// the `useSharedValue` hook the mock *does* patch correctly) and then reads it back via
// `.get()` every render — e.g. `BottomSheet.tsx`'s `animatedLayoutState.get()`. Under the
// real identity mock that throws ("get is not a function") the instant any `Sheet` is
// opened under Jest (M2 Task 1 is the first to actually `present()` one in a test). Patch
// `makeMutable` to return the same get/set/value proxy the mock's own `useSharedValue`
// builds, so `@gorhom/bottom-sheet`'s direct usage works exactly like the hook path.
// Left as `any` deliberately: a typed arrow function *parameter* here (however
// named) trips babel-plugin-jest-hoist's out-of-scope-variable scan inside a
// `jest.mock()` factory (it inspects the raw, not-yet-type-stripped AST), so
// this stays loose rather than fighting it.
function mockMakeMutable(init: any) {
  const target = { value: init };
  return new Proxy(target, {
    get(t, prop) {
      if (prop === '_isReanimatedSharedValue') return true;
      if (prop === 'value') return t.value;
      if (prop === 'get') return () => t.value;
      if (prop === 'set') {
        return (newValue: any) => {
          t.value = typeof newValue === 'function' ? newValue(t.value) : newValue;
        };
      }
      return undefined;
    },
    set(t, prop, newValue) {
      if (prop === 'value') { t.value = newValue; return true; }
      return false;
    },
  });
}
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return { ...mock, makeMutable: mockMakeMutable, default: { ...mock.default, makeMutable: mockMakeMutable } };
});
jest.mock('react-native-device-info', () => ({ getVersion: () => '0.1.0', getBuildNumber: () => '1', getModel: () => 'TestPhone', getSystemVersion: () => '14' }));
jest.mock('posthog-react-native', () => ({ PostHog: jest.fn(() => ({ identify: jest.fn(), screen: jest.fn(), capture: jest.fn(), captureException: jest.fn(), reset: jest.fn() })) }));
jest.mock('react-native-bootsplash', () => ({ hide: jest.fn(async () => {}) }));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => () => {}), fetch: jest.fn(async () => ({ isConnected: true })) }));
// The native date picker renders nothing under Jest; it stashes the `onChange`
// it was last given so a test can call `__trigger(event, date)` on the mocked
// default export to simulate the platform dialog firing (M2 Task 1's `DateField`).
jest.mock('@react-native-community/datetimepicker', () => {
  let latestOnChange: ((event: { type: string }, date?: Date) => void) | null = null;
  function MockDateTimePicker(props: { onChange: (event: { type: string }, date?: Date) => void }) {
    latestOnChange = props.onChange;
    return null;
  }
  MockDateTimePicker.__trigger = (event: { type: string }, date?: Date) => latestOnChange?.(event, date);
  return { __esModule: true, default: MockDateTimePicker };
});
