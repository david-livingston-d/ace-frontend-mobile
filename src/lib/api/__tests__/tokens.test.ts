import { http, HttpResponse } from 'msw';
// msw/native's interceptor patches XMLHttpRequest for the RN runtime; under
// Jest's `testEnvironment: 'node'`, axios uses its Node http adapter instead,
// which msw/native never sees — requests fell through to a real (closed)
// localhost:8000 and crashed the worker on the resulting socket error. `msw/node`
// patches Node's http/https modules directly and has the identical setupServer API.
import { setupServer } from 'msw/node';
import { api } from '@/lib/api/client';
import { clearTokens, getAccessToken, onForceLogout, refreshSingleFlight, setTokens } from '@/lib/api/tokens';
import type { LogoutReason } from '@/lib/api/tokens';
import * as keychain from '@/native/keychain';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// `onForceLogout` returns an unsubscribe — capture and call it per test so a
// listener registered in one test never fires (or gets asserted on) in the next.
let unsubscribes: Array<() => void> = [];
function registerLogoutListener(cb: (reason: LogoutReason) => void) {
  const unsubscribe = onForceLogout(cb);
  unsubscribes.push(unsubscribe);
  return unsubscribe;
}

afterEach(async () => {
  server.resetHandlers();
  await clearTokens();
  unsubscribes.forEach((unsubscribe) => unsubscribe());
  unsubscribes = [];
});
afterAll(() => server.close());

test('three concurrent 401s trigger exactly one refresh and every call is retried', async () => {
  let refreshes = 0;
  let token = 'old';
  await setTokens({ access_token: 'old', refresh_token: 'r1' });
  server.use(
    http.post('http://localhost:8000/api/v1/auth/refresh', async () => { refreshes += 1; token = 'new'; return HttpResponse.json({ access_token: 'new', refresh_token: 'r2', token_type: 'bearer' }); }),
    http.get('http://localhost:8000/api/v1/ping', ({ request }) =>
      request.headers.get('authorization') === `Bearer ${token}` && token === 'new'
        ? HttpResponse.json({ ok: true })
        : HttpResponse.json({ detail: { code: 'invalid_token', message: 'x' } }, { status: 401 })),
  );
  const results = await Promise.all([api.get('/ping'), api.get('/ping'), api.get('/ping')]);
  expect(results.map((r) => r.data)).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
  expect(refreshes).toBe(1);
  expect(getAccessToken()).toBe('new');
  await expect(keychain.getRefreshToken()).resolves.toBe('r2');
});

test('a failed refresh clears tokens and forces logout once', async () => {
  await setTokens({ access_token: 'old', refresh_token: 'r1' });
  const logout = jest.fn();
  registerLogoutListener(logout);
  server.use(
    http.post('http://localhost:8000/api/v1/auth/refresh', () => HttpResponse.json({ detail: { code: 'invalid_token', message: 'x' } }, { status: 401 })),
    http.get('http://localhost:8000/api/v1/ping', () => HttpResponse.json({ detail: { code: 'invalid_token', message: 'x' } }, { status: 401 })),
  );
  await expect(Promise.all([api.get('/ping'), api.get('/ping')])).rejects.toBeTruthy();
  expect(logout).toHaveBeenCalledTimes(1);
  expect(logout).toHaveBeenCalledWith('session_expired');
  expect(getAccessToken()).toBeNull();
  await expect(keychain.getRefreshToken()).resolves.toBeNull();
});

test('a retry that is still 401 after a successful refresh forces logout (e.g. a deactivated account)', async () => {
  // `auth.refresh()` rotates the token pair without re-checking `is_active`,
  // but every protected route does — so a refresh can succeed and the
  // *retried* request can still come back 401. Reproduce that: the refresh
  // endpoint always issues a fresh pair, but /ping 401s no matter which
  // bearer it's sent — old or new.
  let refreshes = 0;
  await setTokens({ access_token: 'old', refresh_token: 'r1' });
  const logout = jest.fn();
  registerLogoutListener(logout);
  server.use(
    http.post('http://localhost:8000/api/v1/auth/refresh', async () => {
      refreshes += 1;
      return HttpResponse.json({ access_token: 'new', refresh_token: 'r2', token_type: 'bearer' });
    }),
    http.get('http://localhost:8000/api/v1/ping', () =>
      HttpResponse.json({ detail: { code: 'invalid_token', message: 'x' } }, { status: 401 })),
  );
  await expect(api.get('/ping')).rejects.toBeTruthy();
  expect(refreshes).toBe(1);
  expect(logout).toHaveBeenCalledTimes(1);
  expect(logout).toHaveBeenCalledWith('session_expired');
  expect(getAccessToken()).toBeNull();
  await expect(keychain.getRefreshToken()).resolves.toBeNull();
});

test('a network failure during refresh keeps the refresh token and does not force logout', async () => {
  await setTokens({ access_token: 'old', refresh_token: 'r1' });
  const logout = jest.fn();
  registerLogoutListener(logout);
  server.use(
    http.post('http://localhost:8000/api/v1/auth/refresh', () => HttpResponse.error()),
    http.get('http://localhost:8000/api/v1/ping', () =>
      HttpResponse.json({ detail: { code: 'invalid_token', message: 'x' } }, { status: 401 })),
  );
  await expect(api.get('/ping')).rejects.toBeTruthy();
  expect(logout).not.toHaveBeenCalled();
  await expect(keychain.getRefreshToken()).resolves.toBe('r1');
});

test('a 401 from /auth/login never attempts a refresh', async () => {
  let refreshes = 0;
  server.use(
    http.post('http://localhost:8000/api/v1/auth/refresh', () => { refreshes += 1; return HttpResponse.json({}); }),
    http.post('http://localhost:8000/api/v1/auth/login', () => HttpResponse.json({ detail: { code: 'invalid_credentials', message: 'Invalid email or password' } }, { status: 401 })),
  );
  await expect(api.post('/auth/login', { email: 'a', password: 'b' })).rejects.toBeTruthy();
  expect(refreshes).toBe(0);
});

test('refreshSingleFlight without a stored token resolves no_token', async () => {
  await expect(refreshSingleFlight()).resolves.toBe('no_token');
});
