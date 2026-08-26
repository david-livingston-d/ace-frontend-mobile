import axios from 'axios';
import { env } from '@/lib/env';
import * as keychain from '@/native/keychain';
import type { TokenPair } from './types';

let accessToken: string | null = null;
export type LogoutReason = 'session_expired' | 'signed_out';
const logoutListeners = new Set<(reason: LogoutReason) => void>();

// A failed single-flight refresh is shared by every caller that hit the 401 at
// the same time — each of them independently reaches the "refresh didn't work"
// branch and calls `forceLogout`. Without this guard a batch of N concurrent
// requests would notify listeners (and any navigation-to-login they trigger) N
// times over. Cleared on the next successful `setTokens`, i.e. the next login.
let forcedLogout = false;

export function getAccessToken() {
  return accessToken;
}
export async function setTokens(pair: Pick<TokenPair, 'access_token' | 'refresh_token'>) {
  accessToken = pair.access_token;
  forcedLogout = false;
  await keychain.setRefreshToken(pair.refresh_token);
}
export async function clearTokens() {
  accessToken = null;
  await keychain.clearRefreshToken();
}
export function onForceLogout(cb: (reason: LogoutReason) => void) {
  logoutListeners.add(cb);
  return () => logoutListeners.delete(cb);
}
export function forceLogout(reason: LogoutReason) {
  if (forcedLogout) return;
  forcedLogout = true;
  logoutListeners.forEach((cb) => cb(reason));
}

// The backend rotates refresh tokens with reuse detection: a second parallel
// refresh call is treated as reuse of an already-rotated token and revokes the
// whole family. Single-flight every caller onto one in-progress refresh.
let refreshInFlight: Promise<boolean> | null = null;
export async function refreshSingleFlight(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refresh = await keychain.getRefreshToken();
    if (!refresh) return false;
    try {
      const r = await axios.post<TokenPair>(
        `${env.API_URL}/api/v1/auth/refresh`,
        { refresh_token: refresh },
        { timeout: 15000 },
      );
      await setTokens(r.data);
      return true;
    } catch {
      await clearTokens();
      return false;
    }
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}
