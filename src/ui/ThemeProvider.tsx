import React from 'react';

/**
 * Placeholder pass-through until the real theming work lands (later task).
 * Kept as a distinct provider so Providers.tsx doesn't need to change shape
 * when the real implementation arrives.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
