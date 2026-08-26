import { create } from 'zustand';
import { authApi } from '@/features/auth/api';
import { clearTokens, onForceLogout, refreshSingleFlight, setTokens, type LogoutReason } from '@/lib/api/tokens';
import * as keychain from '@/native/keychain';
import { queryClient } from '@/lib/query/client';
import { analytics } from '@/analytics/posthog';

type Session = {
  status: 'booting' | 'signedOut' | 'signedIn';
  reason: LogoutReason | null;
  boot: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useSession = create<Session>()((set) => ({
  status: 'booting',
  reason: null,
  boot: async () => {
    const stored = await keychain.getRefreshToken();
    if (!stored) return set({ status: 'signedOut', reason: null });
    const ok = await refreshSingleFlight();
    set(ok ? { status: 'signedIn', reason: null } : { status: 'signedOut', reason: 'session_expired' });
  },
  signIn: async (email, password) => {
    const pair = await authApi.login(email, password);
    await setTokens(pair);
    set({ status: 'signedIn', reason: null });
  },
  signOut: async () => {
    const refresh = await keychain.getRefreshToken();
    if (refresh) await authApi.logout(refresh).catch(() => undefined);
    await clearTokens();
    queryClient.clear();
    analytics.reset();
    set({ status: 'signedOut', reason: 'signed_out' });
  },
}));

// A single module-level subscription — `tokens.ts` already resets its own forced-logout
// dedup guard inside `setTokens`, so no extra guard belongs here.
onForceLogout((reason) => {
  queryClient.clear();
  analytics.reset();
  useSession.setState({ status: 'signedOut', reason });
});
