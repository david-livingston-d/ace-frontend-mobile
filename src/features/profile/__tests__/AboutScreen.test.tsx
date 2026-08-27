import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AboutScreen } from '@/features/profile/screens/AboutScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

const API = 'http://localhost:8000/api/v1';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  mockGoBack.mockClear();
});
afterAll(() => server.close());

const versionRoute = (android: { latest_version: string; min_supported_version: string; download_url: string }) =>
  http.get(`${API}/app/version`, () => HttpResponse.json({ android }));

test('shows the installed version/build and the ENV label — the mocked DeviceInfo values', async () => {
  server.use(versionRoute({ latest_version: '0.1.0', min_supported_version: '0.1.0', download_url: 'https://example.test/app.apk' }));

  const screen = await render(
    <Providers>
      <AboutScreen />
    </Providers>,
  );

  // `react-native-device-info` is mocked (jest.setup.ts) to getVersion() '0.1.0' / getBuildNumber() '1'.
  expect(await screen.findByText('Version 0.1.0 (build 1)')).toBeTruthy();
  // `react-native-config` is mocked with `ENV: 'test'`.
  expect(screen.getByText('Environment: Test')).toBeTruthy();
});

test('Check for update: already on latest -> toasts "Up to date", no banner', async () => {
  server.use(versionRoute({ latest_version: '0.1.0', min_supported_version: '0.1.0', download_url: 'https://example.test/app.apk' }));

  const screen = await render(
    <Providers>
      <AboutScreen />
    </Providers>,
  );
  await screen.findByText('Version 0.1.0 (build 1)');

  fireEvent.press(screen.getByText('CHECK FOR UPDATE'));

  expect(await screen.findByText('Up to date')).toBeTruthy();
  expect(screen.queryByText('Update available')).toBeNull();
});

test('Check for update: a newer version exists -> shows the inline update banner, no toast', async () => {
  server.use(versionRoute({ latest_version: '0.1.0', min_supported_version: '0.1.0', download_url: 'https://example.test/app.apk' }));

  const screen = await render(
    <Providers>
      <AboutScreen />
    </Providers>,
  );
  await screen.findByText('Version 0.1.0 (build 1)');

  // The refetch triggered by the button picks up a newer `latest_version`.
  server.use(versionRoute({ latest_version: '2.0.0', min_supported_version: '0.1.0', download_url: 'https://example.test/app-2.apk' }));

  fireEvent.press(screen.getByText('CHECK FOR UPDATE'));

  expect(await screen.findByText('Update available')).toBeTruthy();
  expect(screen.getByText('Version 2.0.0 is ready to install.')).toBeTruthy();
  expect(screen.queryByText('Up to date')).toBeNull();
});

test('Check for update: a network failure toasts the error instead of crashing', async () => {
  server.use(http.get(`${API}/app/version`, () => HttpResponse.json({ detail: { code: 'error', message: 'boom' } }, { status: 500 })));

  const screen = await render(
    <Providers>
      <AboutScreen />
    </Providers>,
  );

  fireEvent.press(screen.getByText('CHECK FOR UPDATE'));

  // The shared queryClient retries a 5xx twice with backoff before the
  // `refetch()` promise actually rejects (src/lib/query/client.ts) — this
  // takes a few real seconds, hence the longer wait below. The 500's
  // `{code:'error', message:'boom'}` detail surfaces as-is via `getErrorMessage`.
  expect(await screen.findByText('boom', undefined, { timeout: 8000 })).toBeTruthy();
  expect(screen.queryByText('Update available')).toBeNull();
}, 15000);
