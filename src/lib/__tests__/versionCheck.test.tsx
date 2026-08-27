import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Text } from 'react-native';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { useVersionCheck } from '@/lib/version';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
});
afterAll(() => server.close());

// `jest.setup.ts` mocks react-native-device-info at 0.1.0 — every version in
// this file is chosen relative to that.
const CURRENT = '0.1.0';

function Probe() {
  const { state, latest } = useVersionCheck();
  return <Text>{`${state}|${latest}`}</Text>;
}

async function renderProbe() {
  return render(
    <Providers>
      <Probe />
    </Providers>,
  );
}

test('the check is sent with no-cache headers so a stale copy can never answer it', async () => {
  // React Native's Android networking is OkHttp with a 10 MB *disk* cache, so
  // a cacheable response here would be replayed across cold starts and the
  // force-update gate would keep letting a dead build run. The backend sends
  // `no-cache` too; this is the client-side half of that guarantee.
  const seen: { cacheControl: string | null; pragma: string | null }[] = [];
  server.use(
    http.get('http://localhost:8000/api/v1/app/version', ({ request }) => {
      seen.push({
        cacheControl: request.headers.get('cache-control'),
        pragma: request.headers.get('pragma'),
      });
      return HttpResponse.json({
        android: { latest_version: CURRENT, min_supported_version: '0.0.1', download_url: '' },
      });
    }),
  );

  const screen = await renderProbe();

  expect(await screen.findByText(`ok|${CURRENT}`)).toBeTruthy();
  expect(seen).toHaveLength(1);
  expect(seen[0]!.cacheControl).toBe('no-cache');
  expect(seen[0]!.pragma).toBe('no-cache');
});

test('a min_supported_version above this build forces the update gate', async () => {
  server.use(
    http.get('http://localhost:8000/api/v1/app/version', () =>
      HttpResponse.json({
        android: { latest_version: '9.9.9', min_supported_version: '9.9.9', download_url: 'https://example.com/ace.apk' },
      }),
    ),
  );

  const screen = await renderProbe();

  expect(await screen.findByText('force|9.9.9')).toBeTruthy();
});

test('a check that cannot reach the server fails open rather than locking the rep out', async () => {
  // Deliberate: a backend outage must never brick every phone in the field.
  server.use(http.get('http://localhost:8000/api/v1/app/version', () => HttpResponse.error()));

  const screen = await renderProbe();

  await waitFor(() => expect(screen.getByText(`ok|${CURRENT}`)).toBeTruthy());
});
