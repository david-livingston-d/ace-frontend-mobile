import React, { useEffect } from 'react';
import BootSplash from 'react-native-bootsplash';
import { Providers } from '@/providers';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useSession } from '@/store/session';
import { RootErrorBoundary } from '@/components/RootErrorBoundary';
import { analytics } from '@/analytics/posthog';

// React Native's own global handler for errors that escape everything else
// (async callbacks, timers, native-bridge exceptions — anything a JS render-time
// error boundary like `RootErrorBoundary` can't catch). No `@types/react-native`
// ambient declaration exists for this global, hence the local cast.
type ErrorHandler = (error: unknown, isFatal?: boolean) => void;
const globalErrorUtils = (globalThis as unknown as { ErrorUtils?: { setGlobalHandler: (cb: ErrorHandler) => void; getGlobalHandler: () => ErrorHandler } }).ErrorUtils;
if (globalErrorUtils) {
  const previousHandler = globalErrorUtils.getGlobalHandler();
  globalErrorUtils.setGlobalHandler((error, isFatal) => {
    analytics.captureException(error, { fatal: !!isFatal });
    previousHandler(error, isFatal);
  });
}

export default function App() {
  useEffect(() => {
    useSession
      .getState()
      .boot()
      .finally(() => BootSplash.hide({ fade: true }));
  }, []);

  return (
    <RootErrorBoundary>
      <Providers>
        <RootNavigator />
      </Providers>
    </RootErrorBoundary>
  );
}
