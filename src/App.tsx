import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { Providers } from '@/providers';
import { RootNavigator } from '@/navigation/RootNavigator';
import { useSession } from '@/store/session';
import { RootErrorBoundary } from '@/components/RootErrorBoundary';
import { analytics } from '@/analytics/posthog';
import { sweepPdfCache } from '@/native/pdfCache';

const PDF_CACHE_MAX_AGE_DAYS = 7;
const PDF_CACHE_MAX_BYTES = 50 * 1024 * 1024;

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

  // Downloaded PDFs (`src/native/pdf.ts`) accumulate under `DocumentDir/ace`
  // forever otherwise — swept on every foreground transition rather than
  // only at cold start, since a long-lived session may never restart.
  // `sweepPdfCache` never throws, but the call is still fire-and-forget here:
  // nothing in the UI depends on the sweep having finished.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        sweepPdfCache({ maxAgeDays: PDF_CACHE_MAX_AGE_DAYS, maxBytes: PDF_CACHE_MAX_BYTES }).catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <RootErrorBoundary>
      <Providers>
        <RootNavigator />
      </Providers>
    </RootErrorBoundary>
  );
}
