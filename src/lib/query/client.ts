import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { toApiError } from '@/lib/api/errors';

onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((s) => setOnline(!!s.isConnected)));
AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));

/**
 * Shared TanStack Query client. Queries retry network/timeout/5xx failures
 * (the kinds worth a second try — anything 4xx is the caller's own request,
 * retrying it changes nothing); mutations never auto-retry, since retrying a
 * write blind risks doing it twice.
 *
 * Mutations also run with `networkMode: 'always'`. TanStack's default
 * (`'online'`) *pauses* a mutation fired while offline: the promise never
 * settles, so "Save payment"/"Confirm delivery"/"Save allocation" spin
 * forever with no error to show — and then the write silently fires on
 * reconnect, minutes later, possibly after the rep gave up and recorded the
 * money again. Money writes must fail fast instead: with `'always'` the
 * request is attempted, axios reports no response, and `toApiError` turns
 * that into `kind: 'network'` — the "No connection" copy the screens already
 * render. Queries stay on `'online'`: a *read* that pauses simply keeps
 * showing cached rows, which is what `OfflineBanner` explains.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err) => {
        const e = toApiError(err);
        return count < 2 && (e.kind === 'network' || e.kind === 'timeout' || (e.status ?? 0) >= 500);
      },
    },
    mutations: { retry: 0, networkMode: 'always' },
  },
});
