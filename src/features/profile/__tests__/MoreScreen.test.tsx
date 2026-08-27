import React from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { MoreScreen } from '@/features/profile/screens/MoreScreen';
import { Providers } from '@/providers';
import { queryClient } from '@/lib/query/client';
import { useSession } from '@/store/session';
import * as keychain from '@/native/keychain';
import { clearTokens } from '@/lib/api/tokens';
import { me } from '@/test/fixtures';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(async () => {
  cleanup();
  server.resetHandlers();
  queryClient.clear();
  mockNavigate.mockClear();
  await clearTokens();
  useSession.setState({ status: 'booting', reason: null });
});
afterAll(() => server.close());

const API = 'http://localhost:8000/api/v1';
// Deliberately no `departments.read` by default — most of this file's tests
// have no `/departments` handler at all, and `MoreScreen`'s `useDepartments()`
// gates its request on that exact permission, so leaving it off here is what
// keeps those tests from tripping msw's `onUnhandledRequest: 'error'`.
const meRoute = (permissions: Record<string, string> = {}, over: Parameters<typeof me>[1] = {}) =>
  http.get(`${API}/auth/me`, () => HttpResponse.json(me(permissions, over)));

test('the profile card shows the name, email, and role chips off /auth/me', async () => {
  server.use(meRoute({}, { name: 'Karthik S', email: 'k@ace.in', roles: ['Sales Executive'], is_superadmin: false }));

  const screen = await render(
    <Providers>
      <MoreScreen />
    </Providers>,
  );

  expect(await screen.findByText('Karthik S')).toBeTruthy();
  expect(screen.getByText('k@ace.in')).toBeTruthy();
  // `StatusChip` uses the same "label" text variant as `Button` — uppercased
  // in the actual text content (src/ui/Text.tsx), not just via CSS.
  expect(screen.getByText('SALES EXECUTIVE')).toBeTruthy();
  expect(screen.queryByText('SUPERADMIN')).toBeNull();
});

test('the department name resolves off GET /departments when departments.read is granted', async () => {
  server.use(
    meRoute({ 'departments.read': 'all' }, { department_id: 'd1' }),
    http.get(`${API}/departments`, () =>
      HttpResponse.json({ items: [{ id: 'd1', name: 'Retail Sales', is_active: true }] }),
    ),
  );

  const screen = await render(
    <Providers>
      <MoreScreen />
    </Providers>,
  );

  expect(await screen.findByText('Department: Retail Sales')).toBeTruthy();
});

test('without departments.read the department row is omitted entirely — never a raw id', async () => {
  server.use(http.get(`${API}/auth/me`, () => HttpResponse.json(me({}, { name: 'No Dept Perm', department_id: 'd1' }))));

  const screen = await render(
    <Providers>
      <MoreScreen />
    </Providers>,
  );

  expect(await screen.findByText('No Dept Perm')).toBeTruthy();
  expect(screen.queryByText(/Department/)).toBeNull();
  expect(screen.queryByText('d1')).toBeNull();
});

test('My activity / About / Privacy rows navigate to the right places', async () => {
  server.use(meRoute());

  const screen = await render(
    <Providers>
      <MoreScreen />
    </Providers>,
  );

  // Wait for `/auth/me` to actually settle (default fixture name) before
  // interacting — otherwise this test can unmount while that fetch is still
  // in flight, and its late resolution racing the *next* test's mount is
  // what caused an intermittent "overlapping act() calls" / blank render.
  expect(await screen.findByText('Karthik S')).toBeTruthy();

  // Each press awaited via `waitFor` (not a bare synchronous `expect` right
  // after `fireEvent.press`) — three rapid presses with nothing awaited
  // between them left a pending scheduler update that bled into whichever
  // test ran next in this file (an intermittent "overlapping act() calls" /
  // blank render one test later); giving each its own tick avoids that.
  fireEvent.press(screen.getByText('My activity'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Orders', { preset: undefined }));

  fireEvent.press(screen.getByText('About'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('About'));

  fireEvent.press(screen.getByText('Privacy & terms'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Privacy'));
});

test('Log out: confirm sheet, then the real sign-out sequence runs (server logout + local clear + signedOut)', async () => {
  server.use(meRoute(), http.post(`${API}/auth/logout`, () => HttpResponse.json({})));
  await keychain.setRefreshToken('r1');
  useSession.setState({ status: 'signedIn', reason: null });

  const screen = await render(
    <Providers>
      <MoreScreen />
    </Providers>,
  );

  // Two "LOG OUT" buttons exist once the sheet is open: the row that opens
  // it, and the sheet's own confirm button — the second is the one that
  // actually signs out.
  fireEvent.press(await screen.findByText('LOG OUT'));
  expect(await screen.findByText('Log out?')).toBeTruthy();
  const logOutButtons = screen.getAllByText('LOG OUT');
  fireEvent.press(logOutButtons[logOutButtons.length - 1]!);

  await waitFor(() => expect(useSession.getState().status).toBe('signedOut'));
  expect(useSession.getState().reason).toBe('signed_out');
  expect(await keychain.getRefreshToken()).toBeNull();
});
