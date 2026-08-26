import React from 'react';

/**
 * Placeholder pass-through until PostHog wiring lands (later task).
 * Kept as a distinct provider so Providers.tsx doesn't need to change shape
 * when the real implementation arrives.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
