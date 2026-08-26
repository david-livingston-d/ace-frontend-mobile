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
// is a normal protected route and needs the bearer like anything else.
const NO_AUTH_HEADER = ['/auth/login'];

api.interceptors.request.use((config: Cfg) => {
  const token = getAccessToken();
  if (token && !NO_AUTH_HEADER.some((p) => config.url?.startsWith(p))) config.headers.set('Authorization', `Bearer ${token}`);
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
    if (status === 401 && config && !NO_AUTH_HEADER.some((p) => config.url?.startsWith(p))) {
      if (!config.__retried) {
        config.__retried = true;
        if (await refreshSingleFlight()) return api.request(config);
        forceLogout('session_expired');
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
