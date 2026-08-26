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
// react-native-reanimated's officially documented jest setup: use the mock module so
// components built on it (e.g. the Skeleton shimmer) render without touching native code.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-device-info', () => ({ getVersion: () => '0.1.0', getBuildNumber: () => '1', getModel: () => 'TestPhone', getSystemVersion: () => '14' }));
jest.mock('posthog-react-native', () => ({ PostHog: jest.fn(() => ({ identify: jest.fn(), screen: jest.fn(), capture: jest.fn(), captureException: jest.fn(), reset: jest.fn() })) }));
jest.mock('react-native-bootsplash', () => ({ hide: jest.fn(async () => {}) }));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => () => {}), fetch: jest.fn(async () => ({ isConnected: true })) }));
