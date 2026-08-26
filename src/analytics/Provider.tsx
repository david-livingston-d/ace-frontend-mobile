import React, { useEffect } from 'react';
import { useMe } from '@/features/auth/hooks';
import { useSession } from '@/store/session';
import { analytics } from './posthog';
import { subscribeApiEvents } from './apiEvents';

// Only mounted once the session is actually signed in — `useMe()` shares its
// query cache with `RootNavigator`'s `SignedInGate`, but calling it
// unconditionally here would also fire `/auth/me` while booting or signed
// out, racing the boot sequence's own token refresh for no reason (there's
// nothing to identify yet in either state).
function IdentifyOnMe() {
  const { data } = useMe();
  useEffect(() => {
    if (data?.id) analytics.identify(data);
    // TanStack Query's structural sharing keeps `data`'s reference stable
    // across refetches whose result is deep-equal to what's cached, so this
    // only re-fires on an actual content change — not every refetch.
  }, [data]);
  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const status = useSession((s) => s.status);

  useEffect(() => {
    const unsubscribe = subscribeApiEvents();
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <>
      {status === 'signedIn' ? <IdentifyOnMe /> : null}
      {children}
    </>
  );
}
