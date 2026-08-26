import { apiEvents } from '@/lib/api/client';
import { analytics } from './posthog';

/**
 * Forwards every API call as an `api_call` event. `ApiEvent.path` is already
 * UUID-redacted by `client.ts` before it ever reaches here, and bodies are
 * never available at this layer by construction — nothing PII-bearing can
 * leak through this bridge.
 */
export function subscribeApiEvents() {
  return apiEvents.subscribe((e) => {
    analytics.capture('api_call', { method: e.method, path: e.path, status: e.status ?? 0, duration_ms: e.durationMs, ok: e.ok });
  });
}
