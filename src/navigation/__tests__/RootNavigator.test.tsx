import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
// msw/node, not msw/native — see src/lib/api/__tests__/tokens.test.ts.
import { setupServer } from 'msw/node';
import { RootNavigator } from '@/navigation/RootNavigator';
import { Providers } from '@/providers';
import { useSession } from '@/store/session';
import { queryClient } from '@/lib/query/client';
import * as keychain from '@/native/keychain';
import { clearTokens } from '@/lib/api/tokens';

// RootNavigator's version-check gate fires on every render regardless of
// session state — give it a default "everything's current" response here so
// it never falls through to an unhandled-request error (or a real retry
// backoff loop) in this file's tests, none of which are about version gating.
const server = setupServer(
  http.get('http://localhost:8000/api/v1/app/version', () =>
    HttpResponse.json({ android: { latest_version: '0.1.0', min_supported_version: '0.1.0', download_url: 'https://example.test/app.apk' } }),
  ),
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(async () => {
  server.resetHandlers();
  await clearTokens();
  queryClient.clear();
  useSession.setState({ status: 'booting', reason: null });
});
afterAll(() => server.close());

const ME = {
  id: 'u1',
  email: 'exec@ace.local',
  name: 'Exec',
  is_superadmin: true,
  permissions: {},
  department_id: null,
  team_id: null,
  roles: [],
};

test('a failing /auth/me shows the retry state instead of the tab bar; RETRY recovers it', async () => {
  await keychain.setRefreshToken('r1');
  server.use(
    http.post('http://localhost:8000/api/v1/auth/refresh', () =>
      HttpResponse.json({ access_token: 'a', refresh_token: 'r2', token_type: 'bearer' }),
    ),
    http.get('http://localhost:8000/api/v1/auth/me', () =>
      HttpResponse.json({ detail: { code: 'error', message: 'boom' } }, { status: 500 }),
    ),
  );

  const utils = await render(
    <Providers>
      <RootNavigator />
    </Providers>,
  );

  await useSession.getState().boot();

  expect(await utils.findByText('RETRY')).toBeTruthy();
  expect(utils.queryByText('Orders')).toBeNull();

  server.use(http.get('http://localhost:8000/api/v1/auth/me', () => HttpResponse.json(ME)));
  fireEvent.press(utils.getByText('RETRY'));

  expect(await utils.findByText('Orders')).toBeTruthy();
});
