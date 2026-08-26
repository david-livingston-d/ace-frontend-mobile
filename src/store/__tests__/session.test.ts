import { http, HttpResponse } from 'msw';
// msw/native's interceptor patches XMLHttpRequest for the RN runtime; under Jest's
// `testEnvironment: 'node'`, axios uses its Node http adapter instead, which msw/native
// never sees — see src/lib/api/__tests__/tokens.test.ts. msw/node patches Node's
// http/https modules directly and has the identical setupServer API.
import { setupServer } from 'msw/node';
import { useSession } from '@/store/session';
import * as keychain from '@/native/keychain';
import { clearTokens } from '@/lib/api/tokens';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(async () => {
  server.resetHandlers();
  await clearTokens();
  useSession.setState({ status: 'booting', reason: null });
});
afterAll(() => server.close());

test('boot without a stored refresh token ends signed out', async () => {
  await useSession.getState().boot();
  expect(useSession.getState().status).toBe('signedOut');
});

test('boot with a valid refresh token ends signed in', async () => {
  await keychain.setRefreshToken('r1');
  server.use(
    http.post('http://localhost:8000/api/v1/auth/refresh', () =>
      HttpResponse.json({ access_token: 'a', refresh_token: 'r2', token_type: 'bearer' }),
    ),
  );
  await useSession.getState().boot();
  expect(useSession.getState().status).toBe('signedIn');
});

test('boot with a revoked refresh token ends signed out with a reason', async () => {
  await keychain.setRefreshToken('r1');
  server.use(
    http.post('http://localhost:8000/api/v1/auth/refresh', () =>
      HttpResponse.json({ detail: { code: 'invalid_token', message: 'x' } }, { status: 401 }),
    ),
  );
  await useSession.getState().boot();
  expect(useSession.getState()).toMatchObject({ status: 'signedOut', reason: 'session_expired' });
});

test('signIn stores the pair; signOut posts the refresh token and clears everything', async () => {
  let loggedOutWith: string | null = null;
  server.use(
    http.post('http://localhost:8000/api/v1/auth/login', () =>
      HttpResponse.json({ access_token: 'a', refresh_token: 'r1', token_type: 'bearer' }),
    ),
    http.post('http://localhost:8000/api/v1/auth/logout', async ({ request }) => {
      loggedOutWith = ((await request.json()) as { refresh_token: string }).refresh_token;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  await useSession.getState().signIn('a@b.c', 'pw');
  expect(useSession.getState().status).toBe('signedIn');
  await useSession.getState().signOut();
  expect(loggedOutWith).toBe('r1');
  expect(useSession.getState()).toMatchObject({ status: 'signedOut', reason: 'signed_out' });
  await expect(keychain.getRefreshToken()).resolves.toBeNull();
});
