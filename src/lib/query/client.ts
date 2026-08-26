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
    mutations: { retry: 0 },
  },
});
