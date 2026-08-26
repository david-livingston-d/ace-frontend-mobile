import { http, HttpResponse } from 'msw';
// msw/native's interceptor patches XMLHttpRequest for the RN runtime; under Jest's
// `testEnvironment: 'node'`, axios uses its Node http adapter instead, which msw/native
// never sees — see src/lib/api/__tests__/tokens.test.ts. msw/node patches Node's
// http/https modules directly and has the identical setupServer API.
import { setupServer } from 'msw/node';
import * as Keychain from 'react-native-keychain';
import { useSession } from '@/store/session';
import * as keychain from '@/native/keychain';
import { clearTokens, forceLogout } from '@/lib/api/tokens';
import { queryClient } from '@/lib/query/client';

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

test('boot swallows an unexpected keychain throw and lands signed out', async () => {
  // e.g. Android's CryptoFailedException after a lockscreen credential change —
  // `getGenericPassword` throws outright instead of rejecting cleanly. Without
  // the degrade-to-null in native/keychain.ts, this would leave `boot()`
  // hanging with `status: 'booting'` forever (a stuck splash screen).
  jest.mocked(Keychain.getGenericPassword).mockRejectedValueOnce(new Error('CryptoFailed'));
  await useSession.getState().boot();
  expect(useSession.getState().status).toBe('signedOut');
});

test('boot while offline stays signed in without clearing the keychain', async () => {
  await keychain.setRefreshToken('r1');
  server.use(http.post('http://localhost:8000/api/v1/auth/refresh', () => HttpResponse.error()));
  await useSession.getState().boot();
  expect(useSession.getState().status).toBe('signedIn');
  await expect(keychain.getRefreshToken()).resolves.toBe('r1');
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

  // A 401 that was already in flight when signOut() ran can still call
  // forceLogout after the fact — it must not clobber the deliberate
  // 'signed_out' reason with 'session_expired'.
  forceLogout('session_expired');
  expect(useSession.getState()).toMatchObject({ status: 'signedOut', reason: 'signed_out' });
});

test('signOut still tears down everything when clearRefreshToken throws', async () => {
  server.use(
    http.post('http://localhost:8000/api/v1/auth/login', () =>
      HttpResponse.json({ access_token: 'a', refresh_token: 'r1', token_type: 'bearer' }),
    ),
    http.post('http://localhost:8000/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
  );
  await useSession.getState().signIn('a@b.c', 'pw');
  queryClient.setQueryData(['probe'], 'x');
  jest.mocked(Keychain.resetGenericPassword).mockRejectedValueOnce(new Error('CryptoFailed'));

  await useSession.getState().signOut();

  expect(useSession.getState()).toMatchObject({ status: 'signedOut', reason: 'signed_out' });
  expect(queryClient.getQueryData(['probe'])).toBeUndefined();
});
