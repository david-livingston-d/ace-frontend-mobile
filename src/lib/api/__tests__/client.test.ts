import { http, HttpResponse } from 'msw';
// msw/node, not msw/native — see src/lib/api/__tests__/tokens.test.ts: under Jest's
// `testEnvironment: 'node'`, axios uses its Node http adapter, which only msw/node sees.
import { setupServer } from 'msw/node';
import { api, apiEvents, redactPath, type ApiEvent } from '@/lib/api/client';
import { clearTokens, setTokens } from '@/lib/api/tokens';

test('UUID path segments are redacted for analytics', () => {
  expect(redactPath('/sales-orders/0b7a2f44-9a3e-4f1a-8c1d-1d2e3f4a5b6c/pdf')).toBe('/sales-orders/{id}/pdf');
});

describe('the refresh-triggering 401', () => {
  const server = setupServer();
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(async () => { server.resetHandlers(); await clearTokens(); });
  afterAll(() => server.close());

  test('is emitted to analytics, not just the retried request\'s outcome', async () => {
    let token = 'old';
    await setTokens({ access_token: 'old', refresh_token: 'r1' });
    server.use(
      http.post('http://localhost:8000/api/v1/auth/refresh', async () => { token = 'new'; return HttpResponse.json({ access_token: 'new', refresh_token: 'r2', token_type: 'bearer' }); }),
      http.get('http://localhost:8000/api/v1/ping', ({ request }) =>
        request.headers.get('authorization') === `Bearer ${token}` && token === 'new'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ detail: { code: 'invalid_token', message: 'x' } }, { status: 401 })),
    );
    const events: ApiEvent[] = [];
    const unsubscribe = apiEvents.subscribe((e) => events.push(e));
    try {
      await api.get('/ping');
    } finally {
      unsubscribe();
    }
    // The original request's 401 (which drove the refresh) and the retried
    // request's eventual 200 must both show up — not just the latter.
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/ping', status: 401, ok: false }),
      expect.objectContaining({ path: '/ping', status: 200, ok: true }),
    ]));
  });
});
