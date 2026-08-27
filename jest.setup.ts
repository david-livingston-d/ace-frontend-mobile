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
// `react-native-reanimated`'s officially documented jest mock (identity-function
// shared values etc). M2 Task 1's fix round 1 removed the previous patch of this
// mock's `makeMutable` (a get/set proxy swapped in so @gorhom/bottom-sheet's
// `useAnimatedLayout` — which calls `makeMutable(...)` directly, bypassing the
// `useSharedValue` hook this mock already patches correctly — didn't throw
// "get is not a function" the instant a `Sheet` was `present()`-ed under Jest).
// `@gorhom/bottom-sheet` is now fully replaced by a manual mock
// (`__mocks__/@gorhom/bottom-sheet.tsx`), so none of its real code — including
// that direct `makeMutable` call — runs under test any more; `Skeleton`, the
// only other reanimated consumer in this codebase, goes through `useSharedValue`,
// which this plain mock already handles. The patch is dead weight, removed.
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  // react-native-gesture-handler 3.x drives its "is this gesture enabled"
  // bookkeeping by *subscribing* to shared values
  // (`v3/hooks/useJSResponderHandler` -> `sharedValue.addListener(id, cb)`,
  // and `bindSharedValues` likewise), but reanimated's own bundled mock builds
  // shared values as a Proxy that only implements `value`/`get`/`set` — no
  // listener API at all. Anything rendering an RNGH v3 gesture under Jest
  // (M2 Task 5's `SwipeToDelete`, i.e. every order-draft cart line) therefore
  // dies on `sharedValue.removeListener is not a function` at unmount. That's
  // a gap between the two packages' test doubles, not a bug on our side, so
  // the two methods are stubbed onto every shared value the mock hands out.
  const withListeners = <T,>(sharedValue: T): T => {
    if (typeof sharedValue !== 'object' || sharedValue === null) return sharedValue;
    return new Proxy(sharedValue as object, {
      get(target, prop, receiver) {
        if (prop === 'addListener' || prop === 'removeListener') return () => {};
        return Reflect.get(target, prop, receiver);
      },
    }) as T;
  };
  return {
    ...mock,
    useSharedValue: (init: unknown) => withListeners(mock.useSharedValue(init)),
    makeMutable: (init: unknown) => withListeners(mock.makeMutable(init)),
  };
});
jest.mock('react-native-device-info', () => ({ getVersion: () => '0.1.0', getBuildNumber: () => '1', getModel: () => 'TestPhone', getSystemVersion: () => '14' }));
jest.mock('posthog-react-native', () => ({ PostHog: jest.fn(() => ({ identify: jest.fn(), screen: jest.fn(), capture: jest.fn(), captureException: jest.fn(), reset: jest.fn() })) }));
jest.mock('react-native-bootsplash', () => ({ hide: jest.fn(async () => {}) }));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => () => {}), fetch: jest.fn(async () => ({ isConnected: true })) }));
// `react-native-blob-util` is used purely as a filesystem here — the PDF bytes come
// down over the shared axios `api` instance (msw-intercepted in tests), and only the
// final `fs.writeFile` touches this library. `fs.exists`/`mkdir` resolve as if the
// `ace/` directory already exists (`src/native/files.ts` only needs them not to throw);
// `writeFile`/`unlink` resolve so a test only has to override them to exercise a
// write failure and its cleanup.
jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: { DocumentDir: '/mock/documents' },
      exists: jest.fn(async () => true),
      mkdir: jest.fn(async () => undefined),
      writeFile: jest.fn(async () => undefined),
      unlink: jest.fn(async () => undefined),
      // `sweepPdfCache` (`src/native/pdfCache.ts`) is the only caller of
      // these two — default to an empty directory so a test only needs to
      // override them to exercise an actual sweep.
      ls: jest.fn(async () => [] as string[]),
      stat: jest.fn(async () => ({ type: 'file', size: 0, lastModified: 0, path: '', filename: '' })),
    },
    // Real shape: `ReactNativeBlobUtil.android.actionViewIntent(path, mime)`
    // (Android-only "open with the default viewer" call — `src/native/pdf.ts`'s
    // `openPdf`). Defaults to resolving so a test only needs to override it
    // to exercise the `ENOAPP` (no viewer installed) fallback path.
    android: { actionViewIntent: jest.fn(async () => true) },
  },
}));
jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(async () => ({ success: true })) },
}));
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
