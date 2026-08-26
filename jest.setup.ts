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
  const store = new Map<string, string>();
  return { MMKV: jest.fn(() => ({
    getString: (k: string) => store.get(k), set: (k: string, v: string) => store.set(k, v),
    delete: (k: string) => store.delete(k), contains: (k: string) => store.has(k), clearAll: () => store.clear() })) };
});
jest.mock('react-native-device-info', () => ({ getVersion: () => '0.1.0', getBuildNumber: () => '1', getModel: () => 'TestPhone', getSystemVersion: () => '14' }));
jest.mock('posthog-react-native', () => ({ PostHog: jest.fn(() => ({ identify: jest.fn(), screen: jest.fn(), capture: jest.fn(), captureException: jest.fn(), reset: jest.fn() })) }));
jest.mock('react-native-bootsplash', () => ({ hide: jest.fn(async () => {}) }));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => () => {}), fetch: jest.fn(async () => ({ isConnected: true })) }));
