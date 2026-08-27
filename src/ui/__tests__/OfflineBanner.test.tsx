import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import { OfflineBanner } from '@/ui';
import { ThemeProvider } from '@/ui/ThemeProvider';

// Restored outside `act` deliberately: RTL's own cleanup has already unmounted
// everything by the time this runs, so there is no React tree to flush — and an
// un-awaited `act(...)` here leaves React's act scope open and breaks the *next*
// test's updates.
afterEach(() => {
  onlineManager.setOnline(true);
});

function renderBanner(props: { dataUpdatedAt?: number } = {}) {
  return render(
    <ThemeProvider>
      <OfflineBanner {...props} />
    </ThemeProvider>,
  );
}

test('renders nothing while the device is online', async () => {
  const screen = await renderBanner();
  expect(screen.queryByTestId('offline-banner')).toBeNull();
});

test('appears when the connection drops and disappears when it comes back', async () => {
  const screen = await renderBanner();

  await act(async () => onlineManager.setOnline(false));
  expect(await screen.findByText('Offline — showing saved data')).toBeTruthy();

  await act(async () => onlineManager.setOnline(true));
  await waitFor(() => expect(screen.queryByTestId('offline-banner')).toBeNull());
});

test('names the time the visible rows were last true when given one', async () => {
  // 09:14 local — built from local parts so the assertion holds in any TZ.
  const at = new Date(2026, 7, 27, 9, 14, 0).getTime();
  const screen = await renderBanner({ dataUpdatedAt: at });

  await act(async () => onlineManager.setOnline(false));
  expect(await screen.findByText('Offline — showing saved data from 09:14')).toBeTruthy();
});

test('a query that never resolved has no timestamp to name', async () => {
  // `dataUpdatedAt` is 0 on a query that has never held data — that is not a
  // real "as of" time and must not be rendered as one (01 Jan 1970).
  const screen = await renderBanner({ dataUpdatedAt: 0 });

  await act(async () => onlineManager.setOnline(false));
  expect(await screen.findByText('Offline — showing saved data')).toBeTruthy();
});
