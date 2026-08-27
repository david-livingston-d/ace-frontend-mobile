import React from 'react';
import { render } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { RootNavigator } from '@/navigation/RootNavigator';
import { Providers } from '@/providers';
import { useSession } from '@/store/session';
import { queryClient } from '@/lib/query/client';
import { clearTokens } from '@/lib/api/tokens';

// The mocked `DeviceInfo.getVersion()` is '0.1.0' (jest.setup.ts) — every
// version below is chosen relative to that.
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(async () => {
  server.resetHandlers();
  await clearTokens();
  queryClient.clear();
  useSession.setState({ status: 'signedOut', reason: null });
});
afterAll(() => server.close());

test('min_supported_version above the installed build renders ForceUpdateScreen, never Login', async () => {
  server.use(
    http.get('http://localhost:8000/api/v1/app/version', () =>
      HttpResponse.json({ android: { latest_version: '9.9.9', min_supported_version: '9.9.9', download_url: 'https://example.test/app.apk' } }),
    ),
  );

  const utils = await render(
    <Providers>
      <RootNavigator />
    </Providers>,
  );

  expect(await utils.findByText('Update required')).toBeTruthy();
  expect(utils.queryByText('Sign in')).toBeNull();
  expect(utils.getByText(/v0\.1\.0/)).toBeTruthy();
  expect(utils.getByText(/v9\.9\.9/)).toBeTruthy();
});

test('a failing /app/version lets the app proceed to Login instead of blocking on it', async () => {
  server.use(
    http.get('http://localhost:8000/api/v1/app/version', () => HttpResponse.json({ detail: { code: 'error', message: 'boom' } }, { status: 500 })),
  );

  const utils = await render(
    <Providers>
      <RootNavigator />
    </Providers>,
  );

  // `Button`'s "label" text variant uppercases its content in the actual text
  // node (see `src/ui/Text.tsx`), not just via CSS — "SIGN IN", not "Sign in".
  expect(await utils.findByText('SIGN IN')).toBeTruthy();
  expect(utils.queryByText('Update required')).toBeNull();
});
