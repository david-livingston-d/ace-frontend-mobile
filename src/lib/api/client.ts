import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/lib/env';
import { clearTokens, forceLogout, getAccessToken, refreshSingleFlight } from './tokens';

export type ApiEvent = { method: string; path: string; status: number | null; durationMs: number; ok: boolean };
const listeners = new Set<(e: ApiEvent) => void>();
export const apiEvents = {
  subscribe(cb: (e: ApiEvent) => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
export function redactPath(url: string) {
  return url.split('?')[0]!.replace(UUID, '{id}');
}

type Cfg = InternalAxiosRequestConfig & { __retried?: boolean; __startedAt?: number };

export const api = axios.create({ baseURL: `${env.API_URL}/api/v1`, timeout: 15000 });

// Only /auth/login has no valid access token to send yet (/auth/refresh is called via a
// separate raw axios instance in tokens.ts, never through `api`). Every other /auth/*
// route — notably /auth/me, which `useMe()` depends on for permission-gated navigation —
// is a normal protected route and needs the bearer like anything else. This same list
// also excludes /auth/login from the 401 -> refresh-and-retry dance below, since a bad
// login attempt is never a case of a stale access token.
const AUTH_EXEMPT_PATHS = ['/auth/login'];

api.interceptors.request.use((config: Cfg) => {
  const token = getAccessToken();
  if (token && !AUTH_EXEMPT_PATHS.some((p) => config.url?.startsWith(p))) config.headers.set('Authorization', `Bearer ${token}`);
  config.__startedAt = Date.now();
  return config;
});

function emit(config: Cfg | undefined, status: number | null, ok: boolean) {
  if (!config) return;
  const e: ApiEvent = {
    method: (config.method ?? 'get').toUpperCase(),
    path: redactPath(config.url ?? ''),
    status,
    durationMs: Date.now() - (config.__startedAt ?? Date.now()),
    ok,
  };
  listeners.forEach((cb) => cb(e));
}

api.interceptors.response.use(
  (res) => {
    emit(res.config as Cfg, res.status, true);
    return res;
  },
  async (error: AxiosError) => {
    const config = error.config as Cfg | undefined;
    const status = error.response?.status ?? null;
    if (status === 401 && config && !AUTH_EXEMPT_PATHS.some((p) => config.url?.startsWith(p))) {
      if (!config.__retried) {
        config.__retried = true;
        const result = await refreshSingleFlight();
        if (result === 'refreshed') return api.request(config);
        if (result === 'rejected' || result === 'no_token') {
          // The refresh token itself is gone or was rejected — there's no
          // getting a valid session back without a real re-login.
          await clearTokens();
          forceLogout('session_expired');
        }
        // 'unavailable' (offline/timeout/5xx): the refresh token may still be
        // good once connectivity returns — keep it, don't force a logout, just
        // let this request fail like any other network error.
      } else {
        // The retry itself came back 401: refresh succeeded (rotated the
        // token pair) but the new access token still isn't accepted — e.g.
        // the account was deactivated in between. `auth.refresh()` doesn't
        // re-check `is_active`, but every protected route does, so this is
        // reachable in practice, not just in theory. No amount of refreshing
        // fixes it, so end the session instead of burning a refresh-token
        // rotation on every retried request forever.
        await clearTokens();
        forceLogout('session_expired');
      }
    }
    emit(config, status, false);
    throw error;
  },
);
// (`api.request(config)` re-runs the request interceptor, which attaches the new bearer.)
