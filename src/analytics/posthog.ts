import type { MeOut } from '@/lib/api/types';

/**
 * PostHog wiring stub. `enabled` is always false and every method is a no-op
 * until Task 5 replaces the body — the shape (interface) is fixed now so
 * callers (e.g. the session store's sign-out sequence) never change.
 */
export type Analytics = {
  enabled: boolean;
  identify(me: MeOut): void;
  screen(name: string): void;
  capture(event: string, props?: Record<string, string | number | boolean>): void;
  captureException(err: unknown, props?: Record<string, string | number | boolean>): void;
  reset(): void;
};

export const analytics: Analytics = {
  enabled: false,
  identify() {},
  screen() {},
  capture() {},
  captureException() {},
  reset() {},
};
