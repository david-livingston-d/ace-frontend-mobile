import { PostHog } from 'posthog-react-native';
import DeviceInfo from 'react-native-device-info';
import { createMMKV } from 'react-native-mmkv';
import { env } from '@/lib/env';
import type { MeOut } from '@/lib/api/types';

/**
 * PostHog wiring. `enabled` reflects whether an API key is configured — every
 * call site (session store's sign-out, screen tracking, error boundary, ...)
 * is written against this interface and never branches on `enabled` itself.
 */
export type Analytics = {
  enabled: boolean;
  identify(me: MeOut): void;
  screen(name: string): void;
  capture(event: string, props?: Record<string, string | number | boolean>): void;
  captureException(err: unknown, props?: Record<string, string | number | boolean>): void;
  reset(): void;
};

// PII rule (README + architecture doc): identify by `me.id` with exactly these
// five properties. Never email, name, phone, or any request/response body.
export function identifyProps(me: MeOut) {
  return {
    role: me.roles.join(','),
    department_id: me.department_id ?? '',
    app_version: DeviceInfo.getVersion(),
    device_model: DeviceInfo.getModel(),
    os_version: DeviceInfo.getSystemVersion(),
  };
}

const noop: Analytics = {
  enabled: false,
  identify() {},
  screen() {},
  capture() {},
  captureException() {},
  reset() {},
};

function real(): Analytics {
  // react-native-mmkv v4's real API is `createMMKV({ id })`, not `new MMKV()`
  // (see src/store/prefs.ts) — a separate store from `prefs` so PostHog's own
  // persisted state (distinct id, queued events) doesn't share a namespace
  // with app preferences.
  const store = createMMKV({ id: 'posthog' });
  const client = new PostHog(env.POSTHOG_API_KEY, {
    host: env.POSTHOG_HOST,
    captureAppLifecycleEvents: true,
    // PostHogCustomStorage only requires getItem/setItem (no removeItem) —
    // see node_modules/posthog-react-native/dist/types.d.ts.
    customStorage: {
      getItem: (k) => store.getString(k) ?? null,
      setItem: (k, v) => store.set(k, v),
    },
  });
  return {
    enabled: true,
    identify: (me) => client.identify(me.id, identifyProps(me)),
    screen: (name) => client.screen(name),
    capture: (event, props) => client.capture(event, props),
    captureException: (err, props) => client.captureException(err instanceof Error ? err : new Error(String(err)), props),
    reset: () => client.reset(),
  };
}

// Sourcemap upload (posthog-cli) is a release-script concern — M3.

export const analytics: Analytics = env.POSTHOG_API_KEY ? real() : noop;
