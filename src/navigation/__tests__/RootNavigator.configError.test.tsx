import React from 'react';
import { render } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { RootNavigator } from '@/navigation/RootNavigator';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';

// `env` (real `API_URL`, used by the API client/version-check query below) is
// kept intact via `requireActual` — only `configError` is overridden, the way
// a release build with no `.env` `API_URL` would actually see it (see
// `env.ts`'s own comment: it only throws under `__DEV__`, so a misconfigured
// release build has to render something instead of a blank screen).
jest.mock('@/lib/env', () => ({
  ...jest.requireActual('@/lib/env'),
  configError: 'API_URL is not set',
}));

// Same reasoning as `RootNavigator.test.tsx`: the version-check query fires on
// every render regardless of the config-error gate (it runs *before* that
// gate's `if` in `RootNavigator`), so it needs a default response here too, or
// this file's one test fails on an unhandled request instead of the assertion
// it's actually about.
const server = setupServer(
  http.get('http://localhost:8000/api/v1/app/version', () =>
    HttpResponse.json({ android: { latest_version: '0.1.0', min_supported_version: '0.1.0', download_url: 'https://example.test/app.apk' } }),
  ),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => { server.resetHandlers(); queryClient.clear(); });
afterAll(() => server.close());

test('a configError renders the "not configured" ErrorState and never Login or the stack', async () => {
  const utils = await render(
    <Providers>
      <RootNavigator />
    </Providers>,
  );

  expect(await utils.findByText('App is not configured')).toBeTruthy();
  expect(utils.queryByText('Sign in')).toBeNull();
  expect(utils.queryByText('Orders')).toBeNull();
});
